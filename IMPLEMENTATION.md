# CopyCloud — Implementation Plan

## Overview
This document provides a detailed, step-by-step implementation plan for building CopyCloud. Follow this guide to build the entire application from scratch.

---

## Phase 0: Project Setup (Day 1)

### Step 0.1: Initialize Monorepo
```bash
# Navigate to project
cd /e/projects/copycloud

# Initialize with pnpm
pnpm init

# Create workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Update package.json
cat > package.json << 'EOF'
{
  "name": "copycloud",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev:desktop": "pnpm --filter @copycloud/desktop dev",
    "dev:mobile": "pnpm --filter @copycloud/mobile start",
    "dev:server": "pnpm --filter @copycloud/server dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF
```

### Step 0.2: Create Directory Structure
```bash
mkdir -p apps/{desktop,mobile,server}
mkdir -p packages/{shared,ui,proto}
mkdir -p docs scripts docker .github/workflows tests
```

### Step 0.3: Setup Git
```bash
# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.turbo/
EOF

# Initial commit
git add .
git commit -m "chore: initialize monorepo structure"
```

---

## Phase 1: Shared Packages (Days 2-5)

### Step 1.1: Create Shared Types Package
```bash
cd packages/shared
pnpm init

# Create src/types.ts
mkdir src
cat > src/types.ts << 'EOF'
export interface User {
  id: string;
  email: string;
  created_at: Date;
  plan: 'free' | 'pro';
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
  last_seen: Date;
  is_online: boolean;
  push_token?: string;
}

export type ClipboardContentType = 'text' | 'image' | 'file' | 'rich_text';

export interface ClipboardItem {
  id: string;
  user_id: string;
  device_id: string;
  content_type: ClipboardContentType;
  encrypted_content: string;
  metadata: {
    size: number;
    format?: string;
    filename?: string;
    pinned: boolean;
    category?: string;
  };
  created_at: Date;
  expires_at?: Date;
}

export interface SyncEvent {
  type: 'clipboard_update' | 'device_online' | 'device_offline';
  payload: any;
  timestamp: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
EOF

# Create src/index.ts
cat > src/index.ts << 'EOF'
export * from './types';
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@copycloud/shared",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### Step 1.2: Create Encryption Package
```bash
cd packages/shared

# Create src/encryption.ts
cat > src/encryption.ts << 'EOF'
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha512', (err, key) => {
      if (err) reject(err);
      resolve(key);
    });
  });
}

export async function encrypt(content: string, password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = await deriveKey(password, salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Combine salt + iv + tag + encrypted content
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString('base64');
}

export async function decrypt(encryptedBase64: string, password: string): Promise<string> {
  const data = Buffer.from(encryptedBase64, 'base64');
  
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = await deriveKey(password, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
EOF
```

### Step 1.3: Create Clipboard Detection Package
```bash
# Create src/clipboard.ts
cat > src/clipboard.ts << 'EOF'
import { ClipboardItem, ClipboardContentType } from './types';

export abstract class ClipboardDetector {
  abstract start(): void;
  abstract stop(): void;
  abstract getClipboardContent(): Promise<ClipboardItem | null>;
  abstract onClipboardChange(callback: (item: ClipboardItem) => void): void;
}

export function detectContentType(content: string): ClipboardContentType {
  // Check for URLs
  if (/^https?:\/\//.test(content)) {
    return 'text';
  }
  
  // Check for email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)) {
    return 'text';
  }
  
  // Check for code (simple heuristic)
  if (/[{}\[\]];?$/.test(content) || /^import\s/.test(content)) {
    return 'text';
  }
  
  // Default to text
  return 'text';
}

export function categorizeContent(content: string): string {
  if (/^https?:\/\//.test(content)) return 'link';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)) return 'email';
  if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content)) return 'phone';
  if (/[{}\[\]];?$/.test(content) || /^import\s/.test(content)) return 'code';
  return 'text';
}
EOF
```

---

## Phase 2: Backend Server (Days 6-12)

### Step 2.1: Initialize Server Package
```bash
cd apps/server
pnpm init

# Install dependencies
pnpm add fastify @fastify/cors @fastify/websocket @fastify/jwt
pnpm add -D typescript @types/node tsx nodemon

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@copycloud/server",
  "version": "0.1.0",
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "fastify": "^4.27.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/websocket": "^10.0.0",
    "@fastify/jwt": "^8.0.0",
    "@copycloud/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "nodemon": "^3.1.0"
  }
}
EOF
```

### Step 2.2: Create Server Entry Point
```bash
mkdir src src/routes src/services src/middleware

# Create src/index.ts
cat > src/index.ts << 'EOF'
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth';
import { clipboardRoutes } from './routes/clipboard';
import { deviceRoutes } from './routes/device';
import { syncWebSocket } from './services/sync';

const server = Fastify({
  logger: true,
});

// Register plugins
await server.register(cors, {
  origin: true,
  credentials: true,
});

await server.register(websocket);

await server.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-only-secret-not-for-production',
});

// Register routes
await server.register(authRoutes, { prefix: '/api/auth' });
await server.register(clipboardRoutes, { prefix: '/api/clipboard' });
await server.register(deviceRoutes, { prefix: '/api/devices' });

// WebSocket for real-time sync
await server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, syncWebSocket);
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
EOF
```

### Step 2.3: Create Auth Routes
```bash
# Create src/routes/auth.ts
cat > src/routes/auth.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { hash, compare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// In-memory store (replace with database in production)
const users = new Map<string, any>();

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const { email, password } = request.body as any;
    
    if (users.has(email)) {
      return reply.status(400).send({ error: 'User already exists' });
    }
    
    const passwordHash = await hash(password, 10);
    const user = {
      id: uuidv4(),
      email,
      password_hash: passwordHash,
      created_at: new Date(),
      plan: 'free',
    };
    
    users.set(email, user);
    
    const token = fastify.jwt.sign({ id: user.id, email });
    
    return { success: true, token, user: { id: user.id, email } };
  });
  
  // Login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;
    
    const user = users.get(email);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    
    const valid = await compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    
    const token = fastify.jwt.sign({ id: user.id, email });
    
    return { success: true, token, user: { id: user.id, email } };
  });
}
EOF
```

### Step 2.4: Create Clipboard Routes
```bash
# Create src/routes/clipboard.ts
cat > src/routes/clipboard.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// In-memory store (replace with database in production)
const clipboardItems = new Map<string, any[]>();

export async function clipboardRoutes(fastify: FastifyInstance) {
  // Get all clipboard items for user
  fastify.get('/', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const items = clipboardItems.get(userId) || [];
    return { success: true, data: items };
  });
  
  // Add new clipboard item
  fastify.post('/', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { content_type, encrypted_content, metadata, device_id } = request.body as any;
    
    const item = {
      id: uuidv4(),
      user_id: userId,
      device_id,
      content_type,
      encrypted_content,
      metadata: {
        ...metadata,
        pinned: false,
      },
      created_at: new Date(),
    };
    
    const items = clipboardItems.get(userId) || [];
    items.unshift(item);
    
    // Keep only last 100 items
    if (items.length > 100) {
      items.pop();
    }
    
    clipboardItems.set(userId, items);
    
    // Broadcast to other devices via WebSocket
    broadcastToUser(userId, {
      type: 'clipboard_update',
      payload: item,
    });
    
    return { success: true, data: item };
  });
  
  // Delete clipboard item
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { id } = request.params as any;
    const items = clipboardItems.get(userId) || [];
    const filtered = items.filter(item => item.id !== id);
    clipboardItems.set(userId, filtered);
    
    return { success: true };
  });
  
  // Pin/unpin item
  fastify.patch('/:id/pin', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { id } = request.params as any;
    const items = clipboardItems.get(userId) || [];
    const item = items.find(item => item.id === id);
    
    if (item) {
      item.metadata.pinned = !item.metadata.pinned;
    }
    
    return { success: true, data: item };
  });
}

// WebSocket broadcast helper
function broadcastToUser(userId: string, message: any) {
  // This will be implemented with WebSocket connections
  console.log(`Broadcasting to user ${userId}:`, message);
}
EOF
```

### Step 2.5: Create Device Routes
```bash
# Create src/routes/device.ts
cat > src/routes/device.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// In-memory store (replace with database in production)
const devices = new Map<string, any[]>();

export async function deviceRoutes(fastify: FastifyInstance) {
  // Get all devices for user
  fastify.get('/', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const userDevices = devices.get(userId) || [];
    return { success: true, data: userDevices };
  });
  
  // Register new device
  fastify.post('/register', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { name, platform, push_token } = request.body as any;
    
    const device = {
      id: uuidv4(),
      user_id: userId,
      name,
      platform,
      last_seen: new Date(),
      is_online: true,
      push_token,
    };
    
    const userDevices = devices.get(userId) || [];
    userDevices.push(device);
    devices.set(userId, userDevices);
    
    return { success: true, data: device };
  });
  
  // Update device status
  fastify.patch('/:id/status', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { id } = request.params as any;
    const { is_online } = request.body as any;
    
    const userDevices = devices.get(userId) || [];
    const device = userDevices.find(d => d.id === id);
    
    if (device) {
      device.is_online = is_online;
      device.last_seen = new Date();
    }
    
    return { success: true, data: device };
  });
  
  // Delete device
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { id } = request.params as any;
    const userDevices = devices.get(userId) || [];
    const filtered = userDevices.filter(d => d.id !== id);
    devices.set(userId, filtered);
    
    return { success: true };
  });
}
EOF
```

### Step 2.6: Create WebSocket Sync Service
```bash
# Create src/services/sync.ts
cat > src/services/sync.ts << 'EOF'
import { WebSocket } from 'ws';

// Track connected WebSocket clients by user ID
const connections = new Map<string, Set<WebSocket>>();

export function syncWebSocket(connection: WebSocket, request: any) {
  let userId: string | null = null;
  
  connection.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'auth':
          // Authenticate user and track connection
          userId = message.userId;
          if (userId) {
            if (!connections.has(userId)) {
              connections.set(userId, new Set());
            }
            connections.get(userId)!.add(connection);
            
            connection.send(JSON.stringify({
              type: 'auth_success',
              message: 'Authenticated successfully',
            }));
          }
          break;
          
        case 'clipboard_update':
          // Broadcast to all user's devices except sender
          if (userId) {
            broadcastToUser(userId, message, connection);
          }
          break;
          
        case 'ping':
          connection.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  connection.on('close', () => {
    if (userId && connections.has(userId)) {
      connections.get(userId)!.delete(connection);
      if (connections.get(userId)!.size === 0) {
        connections.delete(userId);
      }
    }
  });
  
  connection.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

function broadcastToUser(userId: string, message: any, excludeConnection?: WebSocket) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  
  const payload = JSON.stringify(message);
  
  userConnections.forEach((conn) => {
    if (conn !== excludeConnection && conn.readyState === WebSocket.OPEN) {
      conn.send(payload);
    }
  });
}
EOF
```

---

## Phase 3: Desktop App (Days 13-20)

### Step 3.1: Initialize Electron App
```bash
cd apps/desktop

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@copycloud/desktop",
  "version": "0.1.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview"
  },
  "dependencies": {
    "electron-store": "^8.2.0",
    "socket.io-client": "^4.7.0",
    "@copycloud/shared": "workspace:*"
  },
  "devDependencies": {
    "electron": "^29.0.0",
    "electron-vite": "^2.1.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.2.0",
    "typescript": "^5.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@types/react": "^18.2.0"
  }
}
EOF
```

### Step 3.2: Create Main Process
```bash
mkdir -p src/main src/renderer

# Create src/main/index.ts
cat > src/main/index.ts << 'EOF'
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
  tray = new Tray(path.join(__dirname, '../assets/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show History', click: showHistory },
    { label: 'Settings', click: showSettings },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  
  tray.setToolTip('CopyCloud');
  tray.setContextMenu(contextMenu);
  tray.on('click', showHistory);
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
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
EOF
```

### Step 3.3: Create Renderer (UI)
```bash
# Create src/renderer/index.html
cat > src/renderer/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CopyCloud</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      height: 100vh;
      overflow: hidden;
    }
    
    .header {
      padding: 16px;
      background: #16213e;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #0f3460;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: 600;
    }
    
    .search {
      padding: 12px 16px;
      background: #16213e;
    }
    
    .search input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #0f3460;
      border-radius: 6px;
      background: #1a1a2e;
      color: #eee;
      font-size: 14px;
    }
    
    .clipboard-list {
      height: calc(100vh - 120px);
      overflow-y: auto;
      padding: 8px;
    }
    
    .clipboard-item {
      padding: 12px;
      margin: 4px 0;
      background: #16213e;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .clipboard-item:hover {
      background: #0f3460;
    }
    
    .clipboard-item .content {
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .clipboard-item .meta {
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    }
    
    .clipboard-item.pinned {
      border-left: 3px solid #e94560;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 CopyCloud</h1>
    <button onclick="window.close()">✕</button>
  </div>
  
  <div class="search">
    <input type="text" placeholder="Search clips..." id="searchInput">
  </div>
  
  <div class="clipboard-list" id="clipboardList">
    <div class="empty-state">
      <p>No clips yet</p>
      <p>Copy something to get started</p>
    </div>
  </div>
  
  <script>
    // TODO: Connect to Electron IPC for clipboard data
    const clipboardList = document.getElementById('clipboardList');
    const searchInput = document.getElementById('searchInput');
    
    // Sample data for demo
    const sampleClips = [
      { id: 1, content: 'Hello, World!', pinned: false, time: '2 min ago' },
      { id: 2, content: 'https://github.com', pinned: true, time: '5 min ago' },
      { id: 3, content: 'console.log("test")', pinned: false, time: '10 min ago' },
    ];
    
    function renderClips(clips) {
      if (clips.length === 0) {
        clipboardList.innerHTML = '<div class="empty-state"><p>No clips found</p></div>';
        return;
      }
      
      clipboardList.innerHTML = clips.map(clip => `
        <div class="clipboard-item ${clip.pinned ? 'pinned' : ''}" onclick="copyClip('${clip.content}')">
          <div class="content">${clip.content}</div>
          <div class="meta">${clip.time}</div>
        </div>
      `).join('');
    }
    
    function copyClip(content) {
      navigator.clipboard.writeText(content);
      // Visual feedback
      event.target.style.background = '#0f3460';
      setTimeout(() => {
        event.target.style.background = '';
      }, 200);
    }
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = sampleClips.filter(clip => 
        clip.content.toLowerCase().includes(query)
      );
      renderClips(filtered);
    });
    
    // Initial render
    renderClips(sampleClips);
  </script>
</body>
</html>
EOF
```

---

## Phase 4: Mobile App (Days 21-28)

### Step 4.1: Initialize React Native App
```bash
cd apps/mobile

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@copycloud/mobile",
  "version": "0.1.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start:android",
    "ios": "expo start:ios",
    "test": "jest"
  },
  "dependencies": {
    "expo": "~50.0.0",
    "expo-clipboard": "~6.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-notifications": "~0.27.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "socket.io-client": "^4.7.0",
    "@copycloud/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "^5.4.0"
  }
}
EOF
```

### Step 4.2: Create Main App Component
```bash
mkdir -p src/components src/screens src/services src/hooks

# Create src/App.tsx
cat > src/App.tsx << 'EOF'
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClipboardScreen } from './screens/ClipboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useClipboardSync } from './hooks/useClipboardSync';

const Stack = createNativeStackNavigator();

export default function App() {
  const { startSync, stopSync } = useClipboardSync();
  
  useEffect(() => {
    startSync();
    return () => stopSync();
  }, []);
  
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen 
          name="Clipboard" 
          component={ClipboardScreen}
          options={{ title: '📋 CopyCloud' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
EOF
```

### Step 4.3: Create Clipboard Screen
```bash
# Create src/screens/ClipboardScreen.tsx
cat > src/screens/ClipboardScreen.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useClipboardSync } from '../hooks/useClipboardSync';

interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'image';
  pinned: boolean;
  timestamp: Date;
}

export function ClipboardScreen({ navigation }: any) {
  const [clips, setClips] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { items, addItem } = useClipboardSync();
  
  useEffect(() => {
    setClips(items);
  }, [items]);
  
  const copyToClipboard = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Alert.alert('Copied!', 'Content copied to clipboard');
  };
  
  const filteredClips = clips.filter(clip =>
    clip.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const renderItem = ({ item }: { item: ClipboardItem }) => (
    <TouchableOpacity
      style={[styles.item, item.pinned && styles.pinned]}
      onPress={() => copyToClipboard(item.content)}
    >
      <Text style={styles.content} numberOfLines={2}>
        {item.content}
      </Text>
      <Text style={styles.time}>
        {item.timestamp.toLocaleTimeString()}
      </Text>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search clips..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredClips}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No clips yet</Text>
            <Text style={styles.emptySubtext}>Copy something to get started</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#16213e',
  },
  searchInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
  },
  list: {
    padding: 8,
  },
  item: {
    padding: 16,
    marginVertical: 4,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  pinned: {
    borderLeftWidth: 3,
    borderLeftColor: '#e94560',
  },
  content: {
    color: '#fff',
    fontSize: 14,
  },
  time: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
});
EOF
```

### Step 4.4: Create Clipboard Sync Hook
```bash
# Create src/hooks/useClipboardSync.ts
cat > src/hooks/useClipboardSync.ts << 'EOF'
import { useState, useEffect, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { io } from 'socket.io-client';
import { encrypt, decrypt } from '@copycloud/shared';

interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'image';
  pinned: boolean;
  timestamp: Date;
}

export function useClipboardSync() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [lastContent, setLastContent] = useState('');
  
  // Connect to server
  useEffect(() => {
    const serverUrl = SecureStore.getItem('server_url') || 'http://localhost:3000';
    const authToken = SecureStore.getItem('auth_token');
    
    const newSocket = io(serverUrl, {
      auth: { token: authToken },
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('auth', { userId: SecureStore.getItem('user_id') });
    });
    
    newSocket.on('clipboard_update', async (data: any) => {
      const password = await SecureStore.getItemAsync('encryption_password');
      if (password) {
        const decrypted = await decrypt(data.encrypted_content, password);
        addItem({
          id: data.id,
          content: decrypted,
          type: data.content_type,
          pinned: false,
          timestamp: new Date(data.created_at),
        });
      }
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Monitor clipboard changes
  useEffect(() => {
    const interval = setInterval(async () => {
      const currentContent = await Clipboard.getStringAsync();
      
      if (currentContent && currentContent !== lastContent) {
        setLastContent(currentContent);
        
        // Encrypt and send to server
        const password = await SecureStore.getItemAsync('encryption_password');
        if (password && socket?.connected) {
          const encrypted = await encrypt(currentContent, password);
          socket.emit('clipboard_update', {
            content_type: 'text',
            encrypted_content: encrypted,
            metadata: { size: currentContent.length },
          });
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastContent, socket]);
  
  const addItem = useCallback((item: ClipboardItem) => {
    setItems(prev => {
      // Add to beginning and keep only last 100 items
      const newItems = [item, ...prev];
      return newItems.slice(0, 100);
    });
  }, []);
  
  const startSync = useCallback(() => {
    // Sync is already started in useEffect
  }, []);
  
  const stopSync = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
  }, [socket]);
  
  return {
    items,
    addItem,
    startSync,
    stopSync,
  };
}
EOF
```

---

## Phase 5: Testing & Deployment (Days 29-35)

### Step 5.1: Write Tests
```bash
cd /e/projects/copycloud

# Create test directory structure
mkdir -p tests/unit tests/integration tests/e2e

# Create unit test for encryption
cat > tests/unit/encryption.test.ts << 'EOF'
import { encrypt, decrypt } from '../../packages/shared/src/encryption';

describe('Encryption', () => {
  const testPassword = 'my-secret-password';
  const testContent = 'Hello, World!';
  
  it('should encrypt and decrypt content correctly', async () => {
    const encrypted = await encrypt(testContent, testPassword);
    const decrypted = await decrypt(encrypted, testPassword);
    
    expect(decrypted).toBe(testContent);
  });
  
  it('should produce different ciphertext each time (random IV)', async () => {
    const encrypted1 = await encrypt(testContent, testPassword);
    const encrypted2 = await encrypt(testContent, testPassword);
    
    expect(encrypted1).not.toBe(encrypted2);
  });
  
  it('should fail to decrypt with wrong password', async () => {
    const encrypted = await encrypt(testContent, testPassword);
    
    await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow();
  });
  
  it('should handle empty content', async () => {
    const encrypted = await encrypt('', testPassword);
    const decrypted = await decrypt(encrypted, testPassword);
    
    expect(decrypted).toBe('');
  });
  
  it('should handle special characters', async () => {
    const specialContent = '你好！🎉 <script>alert("xss")</script>';
    const encrypted = await encrypt(specialContent, testPassword);
    const decrypted = await decrypt(encrypted, testPassword);
    
    expect(decrypted).toBe(specialContent);
  });
});
EOF
```

### Step 5.2: Create Docker Configuration
```bash
mkdir -p docker

# Create Dockerfile for server
cat > docker/Dockerfile.server << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# Install pnpm and dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm --filter @copycloud/shared build
RUN pnpm --filter @copycloud/server build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
EOF

# Create docker-compose.yml
cat > docker/docker-compose.yml << 'EOF'
version: '3.8'

services:
  server:
    build:
      context: ..
      dockerfile: docker/Dockerfile.server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
  
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=copycloud
      - POSTGRES_USER=copycloud
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF
```

### Step 5.3: Create GitHub Actions CI/CD
```bash
mkdir -p .github/workflows

# Create CI workflow
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build shared packages
        run: pnpm --filter @copycloud/shared build
      
      - name: Run tests
        run: pnpm test
      
      - name: Run linting
        run: pnpm lint
  
  build-desktop:
    runs-on: ${{ matrix.os }}
    needs: test
    
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build shared packages
        run: pnpm --filter @copycloud/shared build
      
      - name: Build desktop app
        run: pnpm --filter @copycloud/desktop build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: apps/desktop/dist/
  
  build-server:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build shared packages
        run: pnpm --filter @copycloud/shared build
      
      - name: Build server
        run: pnpm --filter @copycloud/server build
      
      - name: Build Docker image
        run: docker build -f docker/Dockerfile.server -t copycloud-server .
EOF
```

---

## Phase 6: Documentation & Polish (Days 36-40)

### Step 6.1: Update README
```bash
cat > README.md << 'EOF'
# 📋 CopyCloud

> Copy once, paste everywhere.

A lightweight, open-source cross-device clipboard synchronization tool.

## Features

- ✅ **Cross-platform** — Windows, macOS, Linux, iOS, Android
- 🔒 **E2E encryption** — Your data stays private
- ⚡ **Real-time sync** — Clipboard changes sync in < 2 seconds
- 📁 **File transfer** — Send files between devices
- 📜 **Clipboard history** — Keep last 100 items
- 🎯 **Smart paste** — Auto-detect content types

## Quick Start

### Desktop (Windows/macOS/Linux)

```bash
# Clone the repo
git clone https://github.com/suvijya/copycloud.git
cd copycloud

# Install dependencies
pnpm install

# Run desktop app
pnpm dev:desktop
```

### Server

```bash
# Start server
pnpm dev:server

# Or with Docker
cd docker
docker-compose up -d
```

### Mobile (iOS/Android)

```bash
# Install Expo CLI
npm install -g expo-cli

# Run mobile app
cd apps/mobile
expo start
```

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Desktop   │◄──►│   Cloud     │◄──►│   Mobile    │
│   (Electron)│    │   Server    │    │ (React Native)
└─────────────┘    └─────────────┘    └─────────────┘
```

## Tech Stack

- **Desktop:** Electron + React + TypeScript
- **Mobile:** React Native + Expo
- **Server:** Node.js + Fastify + WebSocket
- **Database:** PostgreSQL + Redis
- **Encryption:** AES-256-GCM

## Documentation

- [Product Requirements (PRD)](PRD.md)
- [Agent Configuration](AGENTS.md)
- [Implementation Plan](IMPLEMENTATION.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@copycloud.app
- 💬 Discord: [Join our community](https://discord.gg/copycloud)
- 🐛 Issues: [GitHub Issues](https://github.com/suvijya/copycloud/issues)

---

Made with ❤️ by the CopyCloud team
EOF
```

---

## Summary

### Files Created
1. **PRD.md** — Complete product requirements document
2. **AGENTS.md** — Agent configuration and conventions
3. **IMPLEMENTATION.md** — This file (step-by-step guide)

### Next Steps
1. Run Phase 0 to set up the project structure
2. Follow phases 1-6 sequentially
3. Test each component as you build
4. Deploy to production when ready

### Estimated Timeline
- **MVP (Desktop + Sync):** 4 weeks
- **Full Release (All platforms):** 8 weeks
- **Production Ready:** 10 weeks

---

*Last updated: 2026-06-11*