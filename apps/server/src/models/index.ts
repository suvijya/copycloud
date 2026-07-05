import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  plan: 'free' | 'pro';
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: string;
  user_id: string;
  device_id: string;
  name: string;
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web';
  push_token: string | null;
  is_online: boolean;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ClipboardItem {
  id: string;
  user_id: string;
  device_id: string | null;
  content_type: 'text' | 'image' | 'file' | 'rich_text';
  encrypted_content: string | null;
  preview: string | null;
  size: number;
  format: string | null;
  filename: string | null;
  category: string | null;
  pinned: boolean;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Pairing {
  id: string;
  device_a_id: string;
  device_b_id: string;
  encryption_key: string;
  device_a_name: string | null;
  device_b_name: string | null;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

// User operations
export const UserModel = {
  async findById(id: string): Promise<User | undefined> {
    return db('users').where({ id }).first();
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return db('users').where({ email }).first();
  },

  async create(data: Partial<User>): Promise<User> {
    const [user] = await db('users').insert(data).returning('*');
    return user;
  },

  async update(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db('users')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return user;
  },

  async updateLastLogin(id: string): Promise<void> {
    await db('users')
      .where({ id })
      .update({ last_login: new Date() });
  },
};

// Device operations
export const DeviceModel = {
  async findById(id: string): Promise<Device | undefined> {
    return db('devices').where({ id }).first();
  },

  async findByDeviceId(deviceId: string): Promise<Device | undefined> {
    return db('devices').where({ device_id: deviceId }).first();
  },

  async findByUserId(userId: string): Promise<Device[]> {
    return db('devices').where({ user_id: userId }).orderBy('name');
  },

  async create(data: Partial<Device>): Promise<Device> {
    const [device] = await db('devices').insert(data).returning('*');
    return device;
  },

  async update(id: string, data: Partial<Device>): Promise<Device | undefined> {
    const [device] = await db('devices')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return device;
  },

  async updateOnlineStatus(deviceId: string, isOnline: boolean): Promise<void> {
    await db('devices')
      .where({ device_id: deviceId })
      .update({
        is_online: isOnline,
        last_seen: new Date(),
        updated_at: new Date(),
      });
  },

  async delete(id: string): Promise<void> {
    await db('devices').where({ id }).delete();
  },
};

// Clipboard operations
export const ClipboardModel = {
  async findById(id: string): Promise<ClipboardItem | undefined> {
    return db('clipboard_items').where({ id }).first();
  },

  async findByUserId(userId: string, limit = 100): Promise<ClipboardItem[]> {
    return db('clipboard_items')
      .where({ user_id: userId })
      .orderBy([
        { column: 'pinned', order: 'desc' },
        { column: 'created_at', order: 'desc' },
      ])
      .limit(limit);
  },

  async create(data: Partial<ClipboardItem>): Promise<ClipboardItem> {
    const [item] = await db('clipboard_items').insert(data).returning('*');
    return item;
  },

  async update(id: string, data: Partial<ClipboardItem>): Promise<ClipboardItem | undefined> {
    const [item] = await db('clipboard_items')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return item;
  },

  async togglePin(id: string): Promise<ClipboardItem | undefined> {
    const item = await this.findById(id);
    if (!item) return undefined;
    
    return this.update(id, { pinned: !item.pinned });
  },

  async delete(id: string): Promise<void> {
    await db('clipboard_items').where({ id }).delete();
  },

  async deleteByUserId(userId: string): Promise<void> {
    await db('clipboard_items').where({ user_id: userId }).delete();
  },

  async countByUserId(userId: string): Promise<number> {
    const result = await db('clipboard_items')
      .where({ user_id: userId })
      .count('id as count')
      .first();
    return parseInt(result?.count as string || '0', 10);
  },

  async deleteOldest(userId: string, keepCount: number): Promise<void> {
    const subquery = db('clipboard_items')
      .where({ user_id: userId, pinned: false })
      .orderBy('created_at', 'desc')
      .offset(keepCount)
      .select('id');
    
    await db('clipboard_items')
      .whereIn('id', subquery)
      .delete();
  },
};

// Pairing operations
export const PairingModel = {
  async findById(id: string): Promise<Pairing | undefined> {
    return db('pairings').where({ id }).first();
  },

  async findBetweenDevices(deviceAId: string, deviceBId: string): Promise<Pairing | undefined> {
    return db('pairings')
      .where(function() {
        this.where({ device_a_id: deviceAId, device_b_id: deviceBId })
          .orWhere({ device_a_id: deviceBId, device_b_id: deviceAId });
      })
      .andWhere({ status: 'active' })
      .first();
  },

  async findByDeviceId(deviceId: string): Promise<Pairing[]> {
    return db('pairings')
      .where(function() {
        this.where({ device_a_id: deviceId })
          .orWhere({ device_b_id: deviceId });
      })
      .andWhere({ status: 'active' });
  },

  async create(data: Partial<Pairing>): Promise<Pairing> {
    const [pairing] = await db('pairings').insert(data).returning('*');
    return pairing;
  },

  async update(id: string, data: Partial<Pairing>): Promise<Pairing | undefined> {
    const [pairing] = await db('pairings')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return pairing;
  },

  async deactivate(id: string): Promise<void> {
    await db('pairings')
      .where({ id })
      .update({ status: 'inactive', updated_at: new Date() });
  },

  async deactivateBetweenDevices(deviceAId: string, deviceBId: string): Promise<void> {
    await db('pairings')
      .where(function() {
        this.where({ device_a_id: deviceAId, device_b_id: deviceBId })
          .orWhere({ device_a_id: deviceBId, device_b_id: deviceAId });
      })
      .update({ status: 'inactive', updated_at: new Date() });
  },
};
