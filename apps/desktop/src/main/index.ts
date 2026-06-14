import { app, BrowserWindow, Tray, Menu, clipboard, nativeImage, globalShortcut } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { io } from 'socket.io-client';
import { encrypt, decrypt } from '@copycloud/shared';

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let socket: any = null;
let lastClipboardContent = '';

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
function connectToServer() {
  const serverUrl = store.get('server_url') as string || 'http://localhost:3000';
  
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