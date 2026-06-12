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