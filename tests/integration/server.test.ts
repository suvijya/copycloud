import { config } from '../../apps/server/src/config';

// Mock database for testing
jest.mock('../../apps/server/src/database', () => ({
  db: {
    raw: jest.fn().mockResolvedValue({}),
    migrate: {
      latest: jest.fn().mockResolvedValue([]),
    },
    destroy: jest.fn().mockResolvedValue(undefined),
  },
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  closeDatabase: jest.fn().mockResolvedValue(undefined),
}));

describe('Server Configuration', () => {
  describe('config', () => {
    it('should have default values', () => {
      expect(config.port).toBeDefined();
      expect(config.host).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
    });

    it('should have database config', () => {
      expect(config.database.host).toBeDefined();
      expect(config.database.port).toBeDefined();
      expect(config.database.user).toBeDefined();
      expect(config.database.name).toBeDefined();
    });

    it('should have rate limit config', () => {
      expect(config.rateLimit.max).toBeGreaterThan(0);
      expect(config.rateLimit.window).toBeGreaterThan(0);
    });

    it('should have WebSocket config', () => {
      expect(config.ws.maxPayload).toBeGreaterThan(0);
      expect(config.ws.heartbeatInterval).toBeGreaterThan(0);
    });

    it('should have storage config', () => {
      expect(config.storage.path).toBeDefined();
      expect(config.storage.maxFileSize).toBeGreaterThan(0);
    });

    it('should have encryption config', () => {
      expect(config.encryption.algorithm).toBe('aes-256-gcm');
      expect(config.encryption.ivLength).toBe(16);
      expect(config.encryption.saltLength).toBe(64);
      expect(config.encryption.tagLength).toBe(16);
      expect(config.encryption.keyLength).toBe(32);
      expect(config.encryption.iterations).toBe(100000);
    });

    it('should have pairing config', () => {
      expect(config.pairing.otpLength).toBe(6);
      expect(config.pairing.otpExpiry).toBeGreaterThan(0);
      expect(config.pairing.maxAttempts).toBeGreaterThan(0);
    });

    it('should have limits config', () => {
      expect(config.limits.maxClipboardItems).toBeGreaterThan(0);
      expect(config.limits.maxClipSize).toBeGreaterThan(0);
      expect(config.limits.maxDevicesPerUser).toBeGreaterThan(0);
    });
  });
});
