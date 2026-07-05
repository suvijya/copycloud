import { app, BrowserWindow, Tray, Menu, clipboard, nativeImage, globalShortcut, ipcMain, nativeTheme } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import * as fs from 'fs';
import { randomUUID, createHash, randomBytes } from 'crypto';
import Store from 'electron-store';
import WebSocket from 'ws';
import { encrypt, decrypt } from '@copycloud/shared';

// Types
interface ClipboardHistoryItem {
  id: string;
  content: string;
  contentType: 'text' | 'image' | 'file';
  preview: string;
  pinned: boolean;
  source: 'local' | 'synced';
  sourceDevice?: string;
  timestamp: number;
  size: number;
}

interface DeviceInfo {
  deviceId: string;
  name: string;
  platform: string;
  online: boolean;
  paired: boolean;
}

// Store with schema
const store = new Store<{
  device_id: string;
  device_name: string;
  server_url: string;
  space_secret: string;
  encryption_key: string;
  clipboard_history: ClipboardHistoryItem[];
  settings: {
    launch_at_startup: boolean;
    show_notifications: boolean;
    monitor_clipboard: boolean;
    max_history_items: number;
    theme: 'system' | 'light' | 'dark';
  };
}>({
  defaults: {
    device_id: '',
    device_name: os.hostname(),
    server_url: 'http://localhost:3737',
    space_secret: '',
    encryption_key: '',
    clipboard_history: [],
    settings: {
      launch_at_startup: true,
      show_notifications: true,
      monitor_clipboard: true,
      max_history_items: 100,
      theme: 'dark',
    },
  },
});

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let clipboardMonitorTimer: NodeJS.Timeout | null = null;
let lastClipboardContent = '';

const RECONNECT_DELAY = 3000;
const DEFAULT_SERVER_URL = 'http://localhost:3737';
const MAX_HISTORY_ITEMS = 100;

// Server URL can be overridden
const ENV_SERVER = process.env.COPYCLOUD_SERVER;
const ENV_SPACE = process.env.COPYCLOUD_SPACE;

function getSpaceId(): string {
  const secret = ENV_SPACE || store.get('space_secret');
  if (!secret) return 'local';
  return createHash('sha256').update(secret).digest('hex');
}

function getServerUrl(): string {
  return ENV_SERVER || store.get('server_url') || DEFAULT_SERVER_URL;
}

// Stable device identity
function getDeviceId(): string {
  let id = store.get('device_id');
  if (!id) {
    id = randomUUID();
    store.set('device_id', id);
  }
  return id;
}

function getDeviceName(): string {
  return store.get('device_name') || os.hostname();
}

function getPlatform(): string {
  return process.platform === 'win32' ? 'windows'
    : process.platform === 'darwin' ? 'macos'
    : 'linux';
}

// Peer keys for encryption
const peerKeys = new Map<string, string>();

// Clipboard history management
function getClipboardHistory(): ClipboardHistoryItem[] {
  return store.get('clipboard_history') || [];
}

function addToHistory(item: Omit<ClipboardHistoryItem, 'id' | 'timestamp'>): void {
  const history = getClipboardHistory();
  const newItem: ClipboardHistoryItem = {
    ...item,
    id: randomUUID(),
    timestamp: Date.now(),
  };
  
  history.unshift(newItem);
  
  // Limit history size
  const maxItems = store.get('settings.max_history_items') || MAX_HISTORY_ITEMS;
  if (history.length > maxItems) {
    history.splice(maxItems);
  }
  
  store.set('clipboard_history', history);
  mainWindow?.webContents.send('history:updated', history);
}

function removeFromHistory(id: string): void {
  const history = getClipboardHistory().filter(item => item.id !== id);
  store.set('clipboard_history', history);
  mainWindow?.webContents.send('history:updated', history);
}

function togglePinHistory(id: string): void {
  const history = getClipboardHistory();
  const item = history.find(i => i.id === id);
  if (item) {
    item.pinned = !item.pinned;
    store.set('clipboard_history', history);
    mainWindow?.webContents.send('history:updated', history);
  }
}

function clearHistory(): void {
  store.set('clipboard_history', []);
  mainWindow?.webContents.send('history:updated', []);
}

// PNG icon generation (solid color)
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
  ihdr[8] = 8;
  ihdr[9] = 6;
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

// Tray
function createTray() {
  try {
    tray = new Tray(solidIcon(16, [240, 90, 36]));
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show History', click: showHistory },
      { label: 'Settings', click: showSettings },
      { type: 'separator' },
      { label: 'Clear History', click: clearHistory },
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

// Main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 650,
    show: false,
    frame: false,
    resizable: true,
    minWidth: 380,
    minHeight: 500,
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

  mainWindow.on('blur', () => {
    // Optionally hide on blur
  });
}

// Settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });
}

function showHistory() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function showSettings() {
  createSettingsWindow();
}

function toRenderer(channel: string, payload?: unknown) {
  mainWindow?.webContents.send(channel, payload);
}

// Clipboard monitor
function startClipboardMonitor() {
  const settings = store.get('settings');
  if (!settings.monitor_clipboard) return;

  clipboardMonitorTimer = setInterval(() => {
    const currentContent = clipboard.readText();
    if (!currentContent || currentContent === lastClipboardContent) return;
    lastClipboardContent = currentContent;

    // Add to local history
    addToHistory({
      content: currentContent,
      contentType: 'text',
      preview: currentContent.substring(0, 200),
      pinned: false,
      source: 'local',
      size: currentContent.length,
    });

    // Send to paired peers
    if (socket?.readyState !== WebSocket.OPEN || peerKeys.size === 0) return;

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

function stopClipboardMonitor() {
  if (clipboardMonitorTimer) {
    clearInterval(clipboardMonitorTimer);
    clipboardMonitorTimer = null;
  }
}

// Server connection
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
    sendToServer({
      type: 'hello',
      deviceId: getDeviceId(),
      name: getDeviceName(),
      platform: getPlatform(),
      space: getSpaceId(),
    });
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

      case 'pair_code':
        toRenderer('pair:code', { peerId: msg.peerId, peerName: msg.peerName, code: msg.code });
        break;

      case 'pair_awaiting':
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
            lastClipboardContent = decrypted;
            clipboard.writeText(decrypted);
            
            // Add to history
            addToHistory({
              content: decrypted,
              contentType: 'text',
              preview: decrypted.substring(0, 200),
              pinned: false,
              source: 'synced',
              sourceDevice: msg.fromId,
              size: decrypted.length,
            });
            
            toRenderer('clip:received', { fromId: msg.fromId, preview: decrypted.slice(0, 200), at: Date.now() });
            
            // Show notification
            const settings = store.get('settings');
            if (settings.show_notifications) {
              // Could use electron Notification API here
            }
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

// IPC handlers
function registerIpc() {
  // Identity
  ipcMain.handle('identity:get', () => ({
    deviceId: getDeviceId(),
    name: getDeviceName(),
    platform: getPlatform(),
  }));

  // Devices
  ipcMain.on('devices:refresh', () => sendToServer({ type: 'list' }));
  ipcMain.on('devices:pair', (_e, targetId: string) => sendToServer({ type: 'pair_request', targetId }));
  ipcMain.on('devices:verify', (_e, args: { targetId: string; code: string }) =>
    sendToServer({ type: 'pair_verify', targetId: args.targetId, code: args.code }));
  ipcMain.on('devices:unpair', (_e, targetId: string) => sendToServer({ type: 'unpair', targetId }));

  // Window
  ipcMain.on('window:hide', () => mainWindow?.hide());
  ipcMain.on('window:settings', () => showSettings());

  // Clipboard history
  ipcMain.handle('history:get', () => getClipboardHistory());
  ipcMain.on('history:copy', (_e, id: string) => {
    const item = getClipboardHistory().find(i => i.id === id);
    if (item) {
      clipboard.writeText(item.content);
      lastClipboardContent = item.content;
    }
  });
  ipcMain.on('history:delete', (_e, id: string) => removeFromHistory(id));
  ipcMain.on('history:pin', (_e, id: string) => togglePinHistory(id));
  ipcMain.on('history:clear', () => clearHistory());

  // Settings
  ipcMain.handle('settings:get', () => store.get('settings'));
  ipcMain.on('settings:update', (_e, settings: any) => {
    store.set('settings', { ...store.get('settings'), ...settings });
    
    // Apply settings changes
    if (settings.monitor_clipboard === false) {
      stopClipboardMonitor();
    } else if (settings.monitor_clipboard === true) {
      startClipboardMonitor();
    }
  });

  ipcMain.handle('server:url:get', () => getServerUrl());
  ipcMain.on('server:url:set', (_e, url: string) => {
    store.set('server_url', url);
    socket?.close();
    connectToServer();
  });

  ipcMain.handle('encryption:key:get', () => store.get('encryption_key'));
  ipcMain.on('encryption:key:set', (_e, key: string) => {
    store.set('encryption_key', key);
  });

  ipcMain.handle('device:name:get', () => getDeviceName());
  ipcMain.on('device:name:set', (_e, name: string) => {
    store.set('device_name', name);
  });

  ipcMain.handle('space:secret:get', () => store.get('space_secret'));
  ipcMain.on('space:secret:set', (_e, secret: string) => {
    store.set('space_secret', secret);
  });
}

// App lifecycle
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
  stopClipboardMonitor();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socket) socket.close();
});
