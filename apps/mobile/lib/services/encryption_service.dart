import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart' as encrypt_lib;

class EncryptionService {
  static const int _ivLength = 16;
  static const int _saltLength = 64;
  static const int _tagLength = 16;
  static const int _keyLength = 32;
  static const int _iterations = 100000;

  static Uint8List _deriveKey(String password, Uint8List salt) {
    final passwordBytes = utf8.encode(password);
    final hmac = Hmac(sha512, passwordBytes);
    
    // PBKDF2 implementation
    final blocks = (_keyLength / 32).ceil();
    final derivedKey = Uint8List(blocks * 32);
    
    for (int i = 1; i <= blocks; i++) {
      final block = _pbkdf2Block(hmac, salt, _iterations, i);
      derivedKey.setRange((i - 1) * 32, i * 32, block);
    }
    
    return derivedKey.sublist(0, _keyLength);
  }

  static Uint8List _pbkdf2Block(Hmac hmac, Uint8List salt, int iterations, int blockIndex) {
    final blockIndexBytes = Uint8List(4);
    blockIndexBytes.buffer.asByteData().setUint32(0, blockIndex, Endian.big);
    
    final saltAndBlock = Uint8List(salt.length + 4);
    saltAndBlock.setRange(0, salt.length, salt);
    saltAndBlock.setRange(salt.length, salt.length + 4, blockIndexBytes);
    
    var u = _hmacHash(hmac, saltAndBlock);
    var result = Uint8List.fromList(u);
    
    for (int i = 1; i < iterations; i++) {
      u = _hmacHash(hmac, u);
      for (int j = 0; j < result.length; j++) {
        result[j] ^= u[j];
      }
    }
    
    return result;
  }

  static Uint8List _hmacHash(Hmac hmac, Uint8List data) {
    final digest = hmac.convert(data);
    return Uint8List.fromList(digest.bytes);
  }

  static String encrypt(String content, String password) {
    final random = Random.secure();
    
    // Generate random salt and IV
    final salt = Uint8List.fromList(List.generate(_saltLength, (_) => random.nextInt(256)));
    final iv = Uint8List.fromList(List.generate(_ivLength, (_) => random.nextInt(256)));
    
    // Derive key
    final key = _deriveKey(password, salt);
    
    // Encrypt
    final encrypter = encrypt_lib.Encrypter(encrypt_lib.AES(
      encrypt_lib.Key(key),
      mode: encrypt_lib.AESMode.gcm,
    ));
    
    final encrypted = encrypter.encrypt(content, iv: encrypt_lib.IV(iv));
    final encryptedBytes = encrypted.bytes;
    
    // Combine salt + iv + encrypted content
    final result = Uint8List(salt.length + iv.length + encryptedBytes.length);
    result.setRange(0, salt.length, salt);
    result.setRange(salt.length, salt.length + iv.length, iv);
    result.setRange(salt.length + iv.length, result.length, encryptedBytes);
    
    return base64Encode(result);
  }

  static String decrypt(String encryptedBase64, String password) {
    final data = base64Decode(encryptedBase64);
    
    // Extract salt, iv, and encrypted content
    final salt = data.sublist(0, _saltLength);
    final iv = data.sublist(_saltLength, _saltLength + _ivLength);
    final encryptedBytes = data.sublist(_saltLength + _ivLength);
    
    // Derive key
    final key = _deriveKey(password, salt);
    
    // Decrypt
    final encrypter = encrypt_lib.Encrypter(encrypt_lib.AES(
      encrypt_lib.Key(key),
      mode: encrypt_lib.AESMode.gcm,
    ));
    
    final encrypted = encrypt_lib.Encrypted(encryptedBytes);
    return encrypter.decrypt(encrypted, iv: encrypt_lib.IV(iv));
  }

  static String generateKey() {
    final random = Random.secure();
    return List.generate(_keyLength, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
  }
}
