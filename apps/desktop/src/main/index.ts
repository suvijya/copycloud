import { app, BrowserWindow, Tray, Menu, clipboard, nativeImage, globalShortcut, ipcMain } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import { randomUUID, createHash } from 'crypto';
import Store from 'electron-store';
import WebSocket from 'ws';
import { encrypt, decrypt } from '@copycloud/shared';

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let lastClipboardContent = '';

const RECONNECT_DELAY = 3000;
const DEFAULT_SERVER_URL = 'http://localhost:3737';

// Server URL can be overridden so a second PC can point at the host's LAN IP,
// e.g. COPYCLOUD_SERVER=http://192.168.1.50:3001
const ENV_SERVER = process.env.COPYCLOUD_SERVER;

// Optional shared secret that groups a user's own devices into a private
// "space". Devices only discover/pair within the same space, so a public
// server can safely host many independent users. The secret is hashed locally;
// the server never sees the raw value. Without it, devices use the 'local'
// space (fine for a single user on a LAN).
const ENV_SPACE = process.env.COPYCLOUD_SPACE;

function getSpaceId(): string {
  const secret = ENV_SPACE || (store.get('space_secret') as string);
  if (!secret) return 'local';
  return createHash('sha256').update(secret).digest('hex');
}

// A previous build persisted a bad auto-detected `server_url`; clear it.
store.delete('server_url');

function getServerUrl(): string {
  return ENV_SERVER || (store.get('server_url') as string) || DEFAULT_SERVER_URL;
}

// --- Stable device identity ---
function getDeviceId(): string {
  let id = store.get('device_id') as string;
  if (!id) {
    id = randomUUID();
    store.set('device_id', id);
  }
  return id;
}
function getDeviceName(): string {
  return (store.get('device_name') as string) || os.hostname();
}
function getPlatform(): string {
  return process.platform === 'win32' ? 'windows'
    : process.platform === 'darwin' ? 'macos'
    : 'linux';
}

// peerId -> per-pair encryption key (provided by server on connect / pairing)
const peerKeys = new Map<string, string>();

// ---------- Tray ----------
// Build a small solid PNG (no asset file needed) so the tray has a real icon.
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function solidIcon(size: number, [r, g, b]: [number, number, number]): Electron.NativeImage {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const row = Buffer.alloc(1 + size * 4);
  for (let x = 0; x < size; x++) {
    const o = 1 + x * 4;
    row[o] = r; row[o + 1] = g; row[o + 2] = b; row[o + 3] = 255;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const idat = zlib.deflateSync(raw);
  const png = Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
  return nativeImage.createFromBuffer(png);
}

function createTray() {
  try {
    tray = new Tray(solidIcon(16, [240, 90, 36])); // CopyCloud accent orange

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show History', click: showHistory },
      { label: 'Settings', click: showSettings },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);

    tray.setToolTip('CopyCloud');
    tray.setContextMenu(contextMenu);
    tray.on('click', showHistory);
  } catch (err) {
    console.error('Failed to create tray icon:', err);
  }
}

// ---------- Window ----------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: true,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });
}

function showHistory() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function showSettings() {
  console.log('Settings clicked');
}

function toRenderer(channel: string, payload?: unknown) {
  mainWindow?.webContents.send(channel, payload);
}

// ---------- Clipboard monitor ----------
function startClipboardMonitor() {
  setInterval(() => {
    const currentContent = clipboard.readText();
    if (!currentContent || currentContent === lastClipboardContent) return;
    lastClipboardContent = currentContent;

    if (socket?.readyState !== WebSocket.OPEN || peerKeys.size === 0) return;

    // Encrypt separately for each paired peer and send directed clips.
    for (const [pid, key] of peerKeys) {
      encrypt(currentContent, key)
        .then((encrypted) => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'clip',
              targetId: pid,
              content_type: 'text',
              encrypted_content: encrypted,
              metadata: { size: currentContent.length },
            }));
          }
        })
        .catch((err) => console.error('Encryption failed:', err));
    }
  }, 1000);
}

// ---------- Server connection ----------
function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToServer();
  }, RECONNECT_DELAY);
}

function sendToServer(msg: unknown) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function connectToServer() {
  const wsUrl = getServerUrl().replace(/^http/, 'ws') + '/ws';

  try {
    socket = new WebSocket(wsUrl);
  } catch (err) {
    console.error('Failed to open socket:', err);
    scheduleReconnect();
    return;
  }

  socket.on('open', () => {
    console.log('Connected to server');
    toRenderer('server:status', { connected: true });
    sendToServer({ type: 'hello', deviceId: getDeviceId(), name: getDeviceName(), platform: getPlatform(), space: getSpaceId() });
    sendToServer({ type: 'list' });
  });

  socket.on('message', async (raw: WebSocket.RawData) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'pairings':
        peerKeys.clear();
        for (const p of msg.peers || []) peerKeys.set(p.peerId, p.key);
        break;

      case 'device_list':
        toRenderer('devices:list', msg.devices || []);
        break;

      case 'pair_code': // this device is the target: show OTP to the user
        toRenderer('pair:code', { peerId: msg.peerId, peerName: msg.peerName, code: msg.code });
        break;

      case 'pair_awaiting': // this device initiated: prompt for the OTP
        toRenderer('pair:awaiting', { peerId: msg.peerId, peerName: msg.peerName });
        break;

      case 'paired':
        peerKeys.set(msg.peerId, msg.key);
        toRenderer('pair:result', { ok: true, peerId: msg.peerId, peerName: msg.peerName });
        break;

      case 'pair_failed':
        toRenderer('pair:result', { ok: false, peerId: msg.peerId, reason: msg.reason });
        break;

      case 'unpaired':
        peerKeys.delete(msg.peerId);
        toRenderer('pair:unpaired', { peerId: msg.peerId });
        break;

      case 'pair_cancelled':
        toRenderer('pair:cancelled', { peerId: msg.peerId });
        break;

      case 'clip': {
        const key = peerKeys.get(msg.fromId);
        if (key && msg.encrypted_content) {
          try {
            const decrypted = await decrypt(msg.encrypted_content, key);
            lastClipboardContent = decrypted; // prevent echo back to peers
            clipboard.writeText(decrypted);
            toRenderer('clip:received', { fromId: msg.fromId, preview: decrypted.slice(0, 200), at: Date.now() });
          } catch (err) {
            console.error('Failed to decrypt clip:', err);
          }
        }
        break;
      }
    }
  });

  socket.on('close', () => {
    toRenderer('server:status', { connected: false });
    scheduleReconnect();
  });

  socket.on('error', (err: Error) => {
    console.error('Connection error:', err.message);
  });
}

// ---------- IPC (renderer -> main) ----------
function registerIpc() {
  ipcMain.handle('identity:get', () => ({ deviceId: getDeviceId(), name: getDeviceName() }));
  ipcMain.on('devices:refresh', () => sendToServer({ type: 'list' }));
  ipcMain.on('devices:pair', (_e, targetId: string) => sendToServer({ type: 'pair_request', targetId }));
  ipcMain.on('devices:verify', (_e, args: { targetId: string; code: string }) =>
    sendToServer({ type: 'pair_verify', targetId: args.targetId, code: args.code }));
  ipcMain.on('devices:unpair', (_e, targetId: string) => sendToServer({ type: 'unpair', targetId }));
  ipcMain.on('window:hide', () => mainWindow?.hide());
}

// ---------- Lifecycle ----------
app.whenReady().then(() => {
  registerIpc();
  createTray();
  createWindow();
  startClipboardMonitor();
  connectToServer();
  globalShortcut.register('CommandOrControl+Shift+V', showHistory);
});

app.on('window-all-closed', () => {
  // Keep app running in tray
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socket) socket.close();
});
