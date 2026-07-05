import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/clipboard_item.dart';
import '../models/device.dart';

class StorageService {
  static const _secureStorage = FlutterSecureStorage();
  static Database? _database;
  static SharedPreferences? _prefs;

  // Secure storage keys
  static const _kAuthToken = 'auth_token';
  static const _kEncryptionKey = 'encryption_key';
  static const _kServerUrl = 'server_url';
  static const _kDeviceId = 'device_id';
  static const _kDeviceName = 'device_name';
  static const _kSpaceSecret = 'space_secret';
  static const _kUserId = 'user_id';

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _database = await _initDatabase();
  }

  static Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'copycloud.db');
    
    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE clipboard_items (
            id TEXT PRIMARY KEY,
            device_id TEXT,
            content_type TEXT,
            encrypted_content TEXT,
            preview TEXT,
            metadata TEXT,
            created_at INTEGER,
            pinned INTEGER DEFAULT 0,
            source_device TEXT
          )
        ''');
        
        await db.execute('''
          CREATE TABLE devices (
            device_id TEXT PRIMARY KEY,
            name TEXT,
            platform TEXT,
            online INTEGER DEFAULT 0,
            paired INTEGER DEFAULT 0,
            last_seen INTEGER
          )
        ''');
        
        await db.execute('''
          CREATE INDEX idx_clipboard_created ON clipboard_items(created_at DESC)
        ''');
        await db.execute('''
          CREATE INDEX idx_clipboard_pinned ON clipboard_items(pinned DESC)
        ''');
      },
    );
  }

  // Secure storage methods
  static Future<String?> getAuthToken() => _secureStorage.read(key: _kAuthToken);
  static Future<void> setAuthToken(String? token) async {
    if (token == null) {
      await _secureStorage.delete(key: _kAuthToken);
    } else {
      await _secureStorage.write(key: _kAuthToken, value: token);
    }
  }

  static Future<String?> getEncryptionKey() => _secureStorage.read(key: _kEncryptionKey);
  static Future<void> setEncryptionKey(String? key) async {
    if (key == null) {
      await _secureStorage.delete(key: _kEncryptionKey);
    } else {
      await _secureStorage.write(key: _kEncryptionKey, value: key);
    }
  }

  static Future<String?> getServerUrl() => _secureStorage.read(key: _kServerUrl);
  static Future<void> setServerUrl(String? url) async {
    if (url == null) {
      await _secureStorage.delete(key: _kServerUrl);
    } else {
      await _secureStorage.write(key: _kServerUrl, value: url);
    }
  }

  static Future<String?> getDeviceId() => _secureStorage.read(key: _kDeviceId);
  static Future<void> setDeviceId(String? id) async {
    if (id == null) {
      await _secureStorage.delete(key: _kDeviceId);
    } else {
      await _secureStorage.write(key: _kDeviceId, value: id);
    }
  }

  static Future<String?> getDeviceName() => _secureStorage.read(key: _kDeviceName);
  static Future<void> setDeviceName(String? name) async {
    if (name == null) {
      await _secureStorage.delete(key: _kDeviceName);
    } else {
      await _secureStorage.write(key: _kDeviceName, value: name);
    }
  }

  static Future<String?> getSpaceSecret() => _secureStorage.read(key: _kSpaceSecret);
  static Future<void> setSpaceSecret(String? secret) async {
    if (secret == null) {
      await _secureStorage.delete(key: _kSpaceSecret);
    } else {
      await _secureStorage.write(key: _kSpaceSecret, value: secret);
    }
  }

  static Future<String?> getUserId() => _secureStorage.read(key: _kUserId);
  static Future<void> setUserId(String? id) async {
    if (id == null) {
      await _secureStorage.delete(key: _kUserId);
    } else {
      await _secureStorage.write(key: _kUserId, value: id);
    }
  }

  // SharedPreferences methods
  static bool get onboardingComplete => _prefs?.getBool('onboarding_complete') ?? false;
  static Future<void> setOnboardingComplete(bool value) => _prefs!.setBool('onboarding_complete', value);

  static bool get clipboardMonitoringEnabled => _prefs?.getBool('clipboard_monitoring') ?? true;
  static Future<void> setClipboardMonitoringEnabled(bool value) => _prefs!.setBool('clipboard_monitoring', value);

  static bool get notificationsEnabled => _prefs?.getBool('notifications') ?? true;
  static Future<void> setNotificationsEnabled(bool value) => _prefs!.setBool('notifications', value);

  static bool get hapticFeedbackEnabled => _prefs?.getBool('haptic_feedback') ?? true;
  static Future<void> setHapticFeedbackEnabled(bool value) => _prefs!.setBool('haptic_feedback', value);

  // Database methods - Clipboard items
  static Future<void> saveClipboardItem(ClipboardItem item) async {
    await _database!.insert(
      'clipboard_items',
      {
        'id': item.id,
        'device_id': item.deviceId,
        'content_type': item.contentType.name,
        'encrypted_content': item.encryptedContent,
        'preview': item.preview,
        'metadata': jsonEncode(item.metadata.toJson()),
        'created_at': item.createdAt.millisecondsSinceEpoch,
        'pinned': item.pinned ? 1 : 0,
        'source_device': item.sourceDevice,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<ClipboardItem>> getClipboardItems({int limit = 100}) async {
    final maps = await _database!.query(
      'clipboard_items',
      orderBy: 'pinned DESC, created_at DESC',
      limit: limit,
    );
    
    return maps.map((map) => ClipboardItem(
      id: map['id'] as String,
      deviceId: map['device_id'] as String?,
      contentType: ContentType.values.firstWhere(
        (e) => e.name == map['content_type'],
        orElse: () => ContentType.text,
      ),
      encryptedContent: map['encrypted_content'] as String?,
      preview: map['preview'] as String?,
      metadata: ClipMetadata.fromJson(jsonDecode(map['metadata'] as String)),
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at'] as int),
      pinned: (map['pinned'] as int) == 1,
      sourceDevice: map['source_device'] as String?,
    )).toList();
  }

  static Future<void> deleteClipboardItem(String id) async {
    await _database!.delete('clipboard_items', where: 'id = ?', whereArgs: [id]);
  }

  static Future<void> togglePin(String id) async {
    final items = await _database!.query('clipboard_items', where: 'id = ?', whereArgs: [id]);
    if (items.isNotEmpty) {
      final current = items.first['pinned'] as int;
      await _database!.update(
        'clipboard_items',
        {'pinned': current == 0 ? 1 : 0},
        where: 'id = ?',
        whereArgs: [id],
      );
    }
  }

  static Future<void> clearClipboardHistory() async {
    await _database!.delete('clipboard_items');
  }

  // Database methods - Devices
  static Future<void> saveDevice(Device device) async {
    await _database!.insert(
      'devices',
      {
        'device_id': device.deviceId,
        'name': device.name,
        'platform': device.platform,
        'online': device.online ? 1 : 0,
        'paired': device.paired ? 1 : 0,
        'last_seen': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<Device>> getDevices() async {
    final maps = await _database!.query('devices', orderBy: 'name ASC');
    return maps.map((map) => Device(
      deviceId: map['device_id'] as String,
      name: map['name'] as String,
      platform: map['platform'] as String,
      online: (map['online'] as int) == 1,
      paired: (map['paired'] as int) == 1,
    )).toList();
  }

  static Future<void> deleteDevice(String deviceId) async {
    await _database!.delete('devices', where: 'device_id = ?', whereArgs: [deviceId]);
  }
}
