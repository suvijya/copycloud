const { app, BrowserWindow, clipboard, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize storage
const store = new Store({
  name: 'clipboard-history',
  defaults: {
    clips: [],
    settings: {
      maxClips: 500,
      syncEnabled: false
    }
  }
});

let mainWindow;
let tray;
let lastClipContent = '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Hide instead of close
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  // Create tray icon
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('CopyCloud');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}

function monitorClipboard() {
  // Check clipboard every 500ms
  setInterval(() => {
    const currentContent = clipboard.readText();
    
    if (currentContent && currentContent !== lastClipContent && currentContent.trim() !== '') {
      lastClipContent = currentContent;
      
      // Add to history
      const clips = store.get('clips');
      clips.unshift({
        id: Date.now(),
        content: currentContent,
        type: detectType(currentContent),
        timestamp: new Date().toISOString(),
        device: 'This PC'
      });
      
      // Keep only max clips
      const maxClips = store.get('settings.maxClips');
      if (clips.length > maxClips) {
        clips.pop();
      }
      
      store.set('clips', clips);
      
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('new-clip', clips[0]);
      }
    }
  }, 500);
}

function detectType(content) {
  if (/^https?:\/\//i.test(content)) return 'link';
  if (/\.(jpg|jpeg|png|gif|gif|webp)$/i.test(content)) return 'image';
  if (/[{}\[\];]/.test(content) && content.length > 20) return 'code';
  return 'text';
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  monitorClipboard();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
const { ipcMain } = require('electron');

ipcMain.handle('get-clips', () => {
  return store.get('clips');
});

ipcMain.handle('delete-clip', (event, id) => {
  const clips = store.get('clips').filter(clip => clip.id !== id);
  store.set('clips', clips);
  return clips;
});

ipcMain.handle('clear-history', () => {
  store.set('clips', []);
  return [];
});

ipcMain.handle('copy-to-clipboard', (event, content) => {
  clipboard.writeText(content);
  return true;
});