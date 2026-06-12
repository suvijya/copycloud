import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { syncWebSocket } from './services/sync.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-not-for-production';

// In-memory stores
const users = new Map<string, any>();
const clipboardItems = new Map<string, any[]>();
const devices = new Map<string, any[]>();

// Auth middleware
function requireAuth(request: any, reply: any, done: any) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    reply.status(401).send({ success: false, error: 'Unauthorized - No token' });
    return;
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    request.user = decoded;
    done();
  } catch (err: any) {
    reply.status(401).send({ success: false, error: 'Unauthorized - Invalid token' });
  }
}

const server: any = Fastify({ logger: false });

async function start() {
  await server.register(cors, { origin: true, credentials: true });
  await server.register(websocket);

  // HEALTH
  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // AUTH
  server.post('/api/auth/register', async (request: any, reply: any) => {
    const { email, password } = request.body as any;
    if (users.has(email)) return reply.status(400).send({ success: false, error: 'User already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id: uuidv4(), email, password_hash: passwordHash, created_at: new Date(), plan: 'free' };
    users.set(email, user);
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    return { success: true, token, user: { id: user.id, email } };
  });

  server.post('/api/auth/login', async (request: any, reply: any) => {
    const { email, password } = request.body as any;
    const user = users.get(email);
    if (!user) return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    return { success: true, token, user: { id: user.id, email } };
  });

  // CLIPBOARD (all require auth)
  server.get('/api/clipboard', { preHandler: requireAuth }, async (request: any) => {
    return { success: true, data: clipboardItems.get(request.user.id) || [] };
  });

  server.post('/api/clipboard', { preHandler: requireAuth }, async (request: any) => {
    const userId = request.user.id;
    const { content_type, encrypted_content, metadata, device_id } = request.body as any;
    const item = { id: uuidv4(), user_id: userId, device_id, content_type, encrypted_content, metadata: { ...metadata, pinned: false }, created_at: new Date() };
    const items = clipboardItems.get(userId) || [];
    items.unshift(item);
    if (items.length > 100) items.pop();
    clipboardItems.set(userId, items);
    return { success: true, data: item };
  });

  server.delete('/api/clipboard/:id', { preHandler: requireAuth }, async (request: any) => {
    const { id } = request.params as any;
    const items = clipboardItems.get(request.user.id) || [];
    clipboardItems.set(request.user.id, items.filter((i: any) => i.id !== id));
    return { success: true };
  });

  server.patch('/api/clipboard/:id/pin', { preHandler: requireAuth }, async (request: any) => {
    const { id } = request.params as any;
    const items = clipboardItems.get(request.user.id) || [];
    const item = items.find((i: any) => i.id === id);
    if (item) item.metadata.pinned = !item.metadata.pinned;
    return { success: true, data: item };
  });

  // DEVICES (all require auth)
  server.get('/api/devices', { preHandler: requireAuth }, async (request: any) => {
    return { success: true, data: devices.get(request.user.id) || [] };
  });

  server.post('/api/devices/register', { preHandler: requireAuth }, async (request: any) => {
    const { name, platform } = request.body as any;
    const device = { id: uuidv4(), user_id: request.user.id, name, platform, last_seen: new Date(), is_online: true };
    const userDevices = devices.get(request.user.id) || [];
    userDevices.push(device);
    devices.set(request.user.id, userDevices);
    return { success: true, data: device };
  });

  server.patch('/api/devices/:id/status', { preHandler: requireAuth }, async (request: any) => {
    const { id } = request.params as any;
    const { is_online } = request.body as any;
    const userDevices = devices.get(request.user.id) || [];
    const device = userDevices.find((d: any) => d.id === id);
    if (device) { device.is_online = is_online; device.last_seen = new Date(); }
    return { success: true, data: device };
  });

  server.delete('/api/devices/:id', { preHandler: requireAuth }, async (request: any) => {
    const { id } = request.params as any;
    const userDevices = devices.get(request.user.id) || [];
    devices.set(request.user.id, userDevices.filter((d: any) => d.id !== id));
    return { success: true };
  });

  // WEBSOCKET
  await server.register(async function (fastify: any) {
    fastify.get('/ws', { websocket: true }, syncWebSocket);
  });

  // START
  try {
    const port = parseInt(process.env.PORT || '3001');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`✅ Server running on port ${port}`);
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();