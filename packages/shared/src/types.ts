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