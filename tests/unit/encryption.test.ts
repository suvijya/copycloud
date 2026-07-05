import { encrypt, decrypt, generateEncryptionKey } from '../../packages/shared/src/encryption';

describe('Encryption', () => {
  const testPassword = 'my-secret-password-123';
  const testContent = 'Hello, CopyCloud!';

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt content correctly', async () => {
      const encrypted = await encrypt(testContent, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      expect(decrypted).toBe(testContent);
    });

    it('should produce different ciphertext each time (random IV)', async () => {
      const encrypted1 = await encrypt(testContent, testPassword);
      const encrypted2 = await encrypt(testContent, testPassword);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should fail to decrypt with wrong password', async () => {
      const encrypted = await encrypt(testContent, testPassword);
      await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow();
    });

    it('should handle empty content', async () => {
      const encrypted = await encrypt('', testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      expect(decrypted).toBe('');
    });

    it('should handle special characters', async () => {
      const specialContent = '你好！🎉 <script>alert("xss")</script>';
      const encrypted = await encrypt(specialContent, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      expect(decrypted).toBe(specialContent);
    });

    it('should handle long content', async () => {
      const longContent = 'A'.repeat(100000);
      const encrypted = await encrypt(longContent, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      expect(decrypted).toBe(longContent);
    });

    it('should handle unicode content', async () => {
      const unicodeContent = '🚀🌍💻🎉🎊';
      const encrypted = await encrypt(unicodeContent, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      expect(decrypted).toBe(unicodeContent);
    });

    it('should handle JSON content', async () => {
      const jsonContent = JSON.stringify({
        id: '123',
        name: 'Test',
        nested: { key: 'value' },
      });
      const encrypted = await encrypt(jsonContent, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonContent));
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a key of correct length', () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });

    it('should generate hex string', () => {
      const key = generateEncryptionKey();
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });
  });
});
