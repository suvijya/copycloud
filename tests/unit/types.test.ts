import {
  User,
  Device,
  ClipboardItem,
  SyncEvent,
  ApiResponse,
  ClipboardContentType,
} from '../../packages/shared/src/types';

describe('Types', () => {
  describe('User', () => {
    it('should create a valid User object', () => {
      const user: User = {
        id: '123',
        email: 'test@example.com',
        created_at: new Date(),
        plan: 'free',
      };

      expect(user.id).toBe('123');
      expect(user.email).toBe('test@example.com');
      expect(user.plan).toBe('free');
    });

    it('should support pro plan', () => {
      const user: User = {
        id: '123',
        email: 'test@example.com',
        created_at: new Date(),
        plan: 'pro',
      };

      expect(user.plan).toBe('pro');
    });
  });

  describe('Device', () => {
    it('should create a valid Device object', () => {
      const device: Device = {
        id: 'device-123',
        user_id: 'user-123',
        name: 'My Phone',
        platform: 'android',
        last_seen: new Date(),
        is_online: true,
      };

      expect(device.platform).toBe('android');
      expect(device.is_online).toBe(true);
    });

    it('should support all platforms', () => {
      const platforms: Device['platform'][] = [
        'windows', 'macos', 'linux', 'ios', 'android'
      ];

      platforms.forEach(platform => {
        const device: Device = {
          id: '123',
          user_id: 'user-123',
          name: 'Device',
          platform,
          last_seen: new Date(),
          is_online: false,
        };
        expect(device.platform).toBe(platform);
      });
    });
  });

  describe('ClipboardItem', () => {
    it('should create a valid ClipboardItem', () => {
      const item: ClipboardItem = {
        id: 'clip-123',
        user_id: 'user-123',
        device_id: 'device-123',
        content_type: 'text',
        encrypted_content: 'encrypted-data',
        metadata: {
          size: 100,
          pinned: false,
        },
        created_at: new Date(),
      };

      expect(item.content_type).toBe('text');
      expect(item.metadata.pinned).toBe(false);
    });

    it('should support all content types', () => {
      const types: ClipboardContentType[] = [
        'text', 'image', 'file', 'rich_text'
      ];

      types.forEach(type => {
        const item: ClipboardItem = {
          id: '123',
          user_id: 'user-123',
          device_id: 'device-123',
          content_type: type,
          encrypted_content: '',
          metadata: { size: 0, pinned: false },
          created_at: new Date(),
        };
        expect(item.content_type).toBe(type);
      });
    });

    it('should support optional fields', () => {
      const item: ClipboardItem = {
        id: '123',
        user_id: 'user-123',
        device_id: 'device-123',
        content_type: 'text',
        encrypted_content: '',
        metadata: {
          size: 50,
          format: 'plain',
          filename: 'test.txt',
          pinned: true,
          category: 'text',
        },
        created_at: new Date(),
        expires_at: new Date(Date.now() + 86400000),
      };

      expect(item.metadata.filename).toBe('test.txt');
      expect(item.metadata.pinned).toBe(true);
      expect(item.expires_at).toBeDefined();
    });
  });

  describe('SyncEvent', () => {
    it('should create clipboard_update event', () => {
      const event: SyncEvent = {
        type: 'clipboard_update',
        payload: { id: '123' },
        timestamp: new Date(),
      };

      expect(event.type).toBe('clipboard_update');
    });

    it('should create device events', () => {
      const onlineEvent: SyncEvent = {
        type: 'device_online',
        payload: { deviceId: '123' },
        timestamp: new Date(),
      };

      const offlineEvent: SyncEvent = {
        type: 'device_offline',
        payload: { deviceId: '123' },
        timestamp: new Date(),
      };

      expect(onlineEvent.type).toBe('device_online');
      expect(offlineEvent.type).toBe('device_offline');
    });
  });

  describe('ApiResponse', () => {
    it('should create success response', () => {
      const response: ApiResponse<string> = {
        success: true,
        data: 'test',
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe('test');
    });

    it('should create error response', () => {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Something went wrong',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });
  });
});
