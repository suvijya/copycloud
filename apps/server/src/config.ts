import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3737', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'copycloud',
    password: process.env.DB_PASSWORD || 'copycloud',
    name: process.env.DB_NAME || 'copycloud',
    get url() {
      return process.env.DATABASE_URL || 
        `postgresql://${this.user}:${this.password}@${this.host}:${this.port}/${this.name}`;
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Rate limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
  },

  // WebSocket
  ws: {
    maxPayload: parseInt(process.env.WS_MAX_PAYLOAD || '1048576', 10), // 1MB
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10),
  },

  // File storage
  storage: {
    path: process.env.STORAGE_PATH || path.join(__dirname, '../../storage'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    ivLength: 16,
    saltLength: 64,
    tagLength: 16,
    keyLength: 32,
    iterations: 100000,
  },

  // Pairing
  pairing: {
    otpLength: 6,
    otpExpiry: parseInt(process.env.OTP_EXPIRY || '120000', 10), // 2 minutes
    maxAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '5', 10),
  },

  // Limits
  limits: {
    maxClipboardItems: parseInt(process.env.MAX_CLIPBOARD_ITEMS || '100', 10),
    maxClipSize: parseInt(process.env.MAX_CLIP_SIZE || '1048576', 10), // 1MB
    maxDevicesPerUser: parseInt(process.env.MAX_DEVICES || '10', 10),
    maxUsers: parseInt(process.env.MAX_USERS || '1000', 10),
  },
} as const;

export type Config = typeof config;
