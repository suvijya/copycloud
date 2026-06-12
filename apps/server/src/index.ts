import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.js';
import { clipboardRoutes } from './routes/clipboard.js';
import { deviceRoutes } from './routes/device.js';
import { syncWebSocket } from './services/sync.js';

const server = Fastify({
  logger: true,
});

async function start() {
  // Register plugins
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(websocket);

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key',
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
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();