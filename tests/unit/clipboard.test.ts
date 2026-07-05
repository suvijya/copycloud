import { detectContentType, categorizeContent } from '../../packages/shared/src/clipboard';

describe('Clipboard Utilities', () => {
  describe('detectContentType', () => {
    it('should detect URLs as text', () => {
      expect(detectContentType('https://example.com')).toBe('text');
      expect(detectContentType('http://localhost:3000')).toBe('text');
    });

    it('should detect emails as text', () => {
      expect(detectContentType('user@example.com')).toBe('text');
    });

    it('should detect code as text', () => {
      expect(detectContentType('function hello() {}')).toBe('text');
      expect(detectContentType('import React from "react"')).toBe('text');
    });

    it('should detect plain text', () => {
      expect(detectContentType('Hello, world!')).toBe('text');
    });
  });

  describe('categorizeContent', () => {
    it('should categorize links', () => {
      expect(categorizeContent('https://example.com')).toBe('link');
      expect(categorizeContent('http://github.com')).toBe('link');
    });

    it('should categorize emails', () => {
      expect(categorizeContent('user@example.com')).toBe('email');
      expect(categorizeContent('test.user@domain.co.uk')).toBe('email');
    });

    it('should categorize phone numbers', () => {
      expect(categorizeContent('555-123-4567')).toBe('phone');
      expect(categorizeContent('555.123.4567')).toBe('phone');
      expect(categorizeContent('5551234567')).toBe('phone');
    });

    it('should categorize code', () => {
      expect(categorizeContent('function test() {}')).toBe('code');
      expect(categorizeContent('import { x } from "y"')).toBe('code');
      expect(categorizeContent('const x = [1, 2, 3];')).toBe('code');
    });

    it('should categorize plain text', () => {
      expect(categorizeContent('Hello, world!')).toBe('text');
      expect(categorizeContent('Just some regular text')).toBe('text');
    });

    it('should handle empty strings', () => {
      expect(categorizeContent('')).toBe('text');
    });

    it('should handle mixed content', () => {
      // Should prioritize based on pattern matching
      expect(categorizeContent('Check out https://example.com')).toBe('link');
    });
  });
});
