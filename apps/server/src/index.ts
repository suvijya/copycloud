import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';
import { initializeDatabase, closeDatabase } from './database';
import { authRoutes } from './routes/auth';
import { clipboardRoutes } from './routes/clipboard';
import { deviceRoutes } from './routes/device';
import { syncWebSocket } from './services/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Type declarations
declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
    };
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function bootstrap() {
  // Initialize database
  await initializeDatabase();

  const server = Fastify({
    logger: {
      level: config.isDev ? 'info' : 'warn',
      transport: config.isDev ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  // Register plugins
  await server.register(cors, {
    origin: config.isDev ? true : process.env.ALLOWED_ORIGINS?.split(',') || false,
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: config.isDev ? false : undefined,
  });

  await server.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
  });

  await server.register(multipart, {
    limits: {
      fileSize: config.storage.maxFileSize,
    },
  });

  // Swagger documentation
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'CopyCloud API',
        description: 'Cross-device clipboard synchronization API',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Static files (for file storage)
  await server.register(fastifyStatic, {
    root: path.join(config.storage.path),
    prefix: '/files/',
    decorateReply: false,
  });

  // JWT authentication decorator
  // Validates the JWT token from the Authorization header and attaches
  // the decoded user payload to request.user for downstream route handlers.
  server.decorate('authenticate', async (request, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        throw new Error('No token');
      }

      const token = auth.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string };
      request.user = decoded;
    } catch (error) {
      reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }
  });

  // Health check
  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
  }));

  // API info
  server.get('/api', async () => ({
    name: 'CopyCloud API',
    version: '1.0.0',
    docs: `/docs`,
    endpoints: {
      auth: '/api/auth',
      clipboard: '/api/clipboard',
      devices: '/api/devices',
      websocket: '/ws',
    },
  }));

  // Register routes
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(clipboardRoutes, { prefix: '/api/clipboard' });
  await server.register(deviceRoutes, { prefix: '/api/devices' });

  // WebSocket
  await server.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, syncWebSocket);
  });

  // Error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: error.validation,
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
      });
    }

    reply.status(500).send({
      success: false,
      error: config.isDev ? error.message : 'Internal server error',
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await server.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start server
  try {
    await server.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    CopyCloud Server                       ║
╠═══════════════════════════════════════════════════════════╣
║  Server:     http://${config.host}:${config.port}              ║
║  API Docs:   http://localhost:${config.port}/docs              ║
║  WebSocket:  ws://localhost:${config.port}/ws                  ║
║  Health:     http://localhost:${config.port}/health             ║
║  Environment: ${config.nodeEnv.padEnd(10)}                       ║
╚═══════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
