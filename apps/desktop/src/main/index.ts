import { app, BrowserWindow, Tray, Menu, clipboard, nativeImage, globalShortcut } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { io } from 'socket.io-client';
import { encrypt, decrypt } from '@copycloud/shared';
import * as net from 'net';

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let socket: any = null;
let lastClipboardContent = '';

// Check if a port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

// Find available port starting from base port
async function findAvailablePort(basePort: number = 3000, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = basePort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} in use, trying ${port + 1}...`);
  }
  // If all ports are busy, return the base port (will fail gracefully)
  console.warn('All ports in use, falling back to base port');
  return basePort;
}

// Get server URL with auto-detection
async function getServerUrl(): Promise<string> {
  // Check if user has configured a custom server URL
  const customUrl = store.get('server_url') as string;
  if (customUrl) {
    return customUrl;
  }

  // Auto-detect available port
  const port = await findAvailablePort(3000);
  const detectedUrl = `http://localhost:${port}`;
  
  // Save detected URL for future use
  store.set('server_url', detectedUrl);
  console.log(`Using server at ${detectedUrl}`);
  
  return detectedUrl;
}

// Create tray icon
function createTray() {
  try {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

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

// Create main window
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

// Show history popup
function showHistory() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// Show settings
function showSettings() {
  // TODO: Implement settings window
  console.log('Settings clicked');
}

// Monitor clipboard changes
function startClipboardMonitor() {
  setInterval(() => {
    const currentContent = clipboard.readText();
    
    if (currentContent && currentContent !== lastClipboardContent) {
      lastClipboardContent = currentContent;
      
      // Encrypt and send to server
      const password = store.get('encryption_password') as string;
      if (password) {
        encrypt(currentContent, password).then((encrypted) => {
          if (socket?.connected) {
            socket.emit('clipboard_update', {
              content_type: 'text',
              encrypted_content: encrypted,
              metadata: { size: currentContent.length },
            });
          }
        });
      }
    }
  }, 1000);
}

// Connect to WebSocket server
async function connectToServer() {
  const serverUrl = await getServerUrl();
  
  socket = io(serverUrl, {
    auth: {
      token: store.get('auth_token'),
    },
  });
  
  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('auth', { userId: store.get('user_id') });
  });
  
  socket.on('clipboard_update', async (data: any) => {
    const password = store.get('encryption_password') as string;
    if (password) {
      const decrypted = await decrypt(data.encrypted_content, password);
      clipboard.writeText(decrypted);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  socket.on('connect_error', (err: Error) => {
    console.error('Connection error:', err.message);
    // Try next port after 2 seconds
    setTimeout(async () => {
      const currentUrl = store.get('server_url') as string;
      const currentPort = parseInt(currentUrl.split(':').pop() || '3000');
      const nextPort = await findAvailablePort(currentPort + 1, 1);
      store.set('server_url', `http://localhost:${nextPort}`);
      connectToServer();
    }, 2000);
  });
}

// App lifecycle
app.whenReady().then(() => {
  createTray();
  createWindow();
  startClipboardMonitor();
  connectToServer();
  
  // Register global shortcut
  globalShortcut.register('CommandOrControl+Shift+V', showHistory);
});

app.on('window-all-closed', () => {
  // Keep app running in tray
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (socket) {
    socket.disconnect();
  }
});
