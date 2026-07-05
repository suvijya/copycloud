import 'dart:async';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/clipboard_item.dart';
import '../models/device.dart';
import '../services/sync_service.dart';
import '../services/encryption_service.dart';
import '../services/clipboard_service.dart';
import '../services/storage_service.dart';

enum AppState { initial, loading, ready, error }

class AppProvider with ChangeNotifier {
  AppState _state = AppState.initial;
  SyncService? _syncService;
  final ClipboardService _clipboardService = ClipboardService();
  
  List<ClipboardItem> _clipboardItems = [];
  List<Device> _devices = [];
  String? _errorMessage;
  String? _pairingKey; // Key for current pairing operation
  
  // Stream subscriptions
  StreamSubscription<SyncStatus>? _statusSub;
  StreamSubscription<List<Device>>? _devicesSub;
  StreamSubscription<ClipboardItem>? _clipboardSub;
  StreamSubscription<PairCodeEvent>? _pairCodeSub;
  StreamSubscription<PairResultEvent>? _pairResultSub;
  StreamSubscription<String>? _clipboardContentSub;

  // Getters
  AppState get state => _state;
  List<ClipboardItem> get clipboardItems => _clipboardItems;
  List<Device> get devices => _devices;
  String? get errorMessage => _errorMessage;
  bool get isConnected => _syncService?.status == SyncStatus.connected;
  SyncStatus get syncStatus => _syncService?.status ?? SyncStatus.disconnected;

  Future<void> initialize() async {
    _state = AppState.loading;
    notifyListeners();

    try {
      // Initialize storage
      await StorageService.init();
      
      // Load cached data
      _clipboardItems = await StorageService.getClipboardItems();
      _devices = await StorageService.getDevices();
      
      // Check if onboarding is complete
      if (!StorageService.onboardingComplete) {
        _state = AppState.ready;
        notifyListeners();
        return;
      }
      
      // Initialize sync
      await _initializeSync();
      
      // Start clipboard monitoring
      _startClipboardMonitoring();
      
      _state = AppState.ready;
    } catch (e) {
      _state = AppState.error;
      _errorMessage = e.toString();
    }
    
    notifyListeners();
  }

  Future<void> _initializeSync() async {
    final serverUrl = await StorageService.getServerUrl() ?? 'http://localhost:3737';
    final deviceId = await StorageService.getDeviceId();
    final deviceName = await StorageService.getDeviceName() ?? 'Flutter Device';
    
    if (deviceId == null) {
      final newId = const Uuid().v4();
      await StorageService.setDeviceId(newId);
    }
    
    final spaceSecret = await StorageService.getSpaceSecret();
    String spaceId = 'local';
    if (spaceSecret != null && spaceSecret.isNotEmpty) {
      final bytes = utf8.encode(spaceSecret);
      spaceId = sha256.convert(bytes).toString();
    }
    
    _syncService = SyncService(
      serverUrl: serverUrl,
      deviceId: deviceId ?? const Uuid().v4(),
      deviceName: deviceName,
      platform: 'android',
      spaceId: spaceId,
    );
    
    // Listen to sync events
    _statusSub = _syncService!.statusStream.listen(_onStatusChanged);
    _devicesSub = _syncService!.devicesStream.listen(_onDevicesChanged);
    _clipboardSub = _syncService!.clipboardStream.listen(_onClipboardReceived);
    _pairCodeSub = _syncService!.pairCodeStream.listen(_onPairCode);
    _pairResultSub = _syncService!.pairResultStream.listen(_onPairResult);
    
    _syncService!.connect();
  }

  void _startClipboardMonitoring() {
    _clipboardService.startMonitoring();
    _clipboardContentSub = _clipboardService.contentStream.listen(_onLocalClipboardChanged);
  }

  void _onStatusChanged(SyncStatus status) {
    notifyListeners();
  }

  void _onDevicesChanged(List<Device> devices) {
    _devices = devices;
    // Update local storage
    for (final device in devices) {
      StorageService.saveDevice(device);
    }
    notifyListeners();
  }

  void _onClipboardReceived(ClipboardItem item) async {
    // Decrypt content if we have the key
    final encryptionKey = await StorageService.getEncryptionKey();
    if (encryptionKey != null && item.encryptedContent != null) {
      try {
        final decrypted = EncryptionService.decrypt(item.encryptedContent!, encryptionKey);
        final decryptedItem = item.copyWith(preview: decrypted);
        _clipboardItems.insert(0, decryptedItem);
        
        // Copy to local clipboard
        await _clipboardService.copyToClipboard(decrypted);
        
        // Save to local storage
        await StorageService.saveClipboardItem(decryptedItem);
        
        // Keep only last 100 items
        if (_clipboardItems.length > 100) {
          final removed = _clipboardItems.removeLast();
          await StorageService.deleteClipboardItem(removed.id);
        }
        
        notifyListeners();
      } catch (e) {
        print('Failed to decrypt clipboard: $e');
      }
    }
  }

  void _onLocalClipboardChanged(String content) async {
    if (_syncService == null || !isConnected) return;
    
    final encryptionKey = await StorageService.getEncryptionKey();
    if (encryptionKey == null) return;
    
    // Encrypt and send
    final encrypted = EncryptionService.encrypt(content, encryptionKey);
    _syncService!.sendClipboardUpdate(
      encrypted,
      contentType: 'text',
      size: content.length,
    );
    
    // Save locally
    final item = ClipboardItem(
      id: const Uuid().v4(),
      contentType: ContentType.text,
      preview: content,
      metadata: ClipMetadata(size: content.length),
      sourceDevice: 'local',
    );
    
    _clipboardItems.insert(0, item);
    await StorageService.saveClipboardItem(item);
    
    if (_clipboardItems.length > 100) {
      final removed = _clipboardItems.removeLast();
      await StorageService.deleteClipboardItem(removed.id);
    }
    
    notifyListeners();
  }

  void _onPairCode(PairCodeEvent event) {
    // This will be handled by the UI
    notifyListeners();
  }

  void _onPairResult(PairResultEvent event) {
    if (event.success && event.key != null) {
      // Store the pairing key
      _pairingKey = event.key;
    }
    notifyListeners();
  }

  // Public methods
  Future<void> setServerUrl(String url) async {
    await StorageService.setServerUrl(url);
    _syncService?.disconnect();
    await _initializeSync();
  }

  Future<void> setDeviceName(String name) async {
    await StorageService.setDeviceName(name);
    // Reconnect with new name
    _syncService?.disconnect();
    await _initializeSync();
  }

  Future<void> setSpaceSecret(String secret) async {
    await StorageService.setSpaceSecret(secret);
    // Reconnect with new space
    _syncService?.disconnect();
    await _initializeSync();
  }

  Future<void> setEncryptionKey(String key) async {
    await StorageService.setEncryptionKey(key);
  }

  void requestPairing(String deviceId) {
    _syncService?.requestPairing(deviceId);
  }

  void verifyPairing(String deviceId, String code) {
    _syncService?.verifyPairing(deviceId, code);
  }

  void unpairDevice(String deviceId) {
    _syncService?.unpair(deviceId);
  }

  void refreshDevices() {
    _syncService?.refreshDevices();
  }

  Future<void> deleteClipboardItem(String id) async {
    _clipboardItems.removeWhere((item) => item.id == id);
    await StorageService.deleteClipboardItem(id);
    notifyListeners();
  }

  Future<void> togglePin(String id) async {
    final index = _clipboardItems.indexWhere((item) => item.id == id);
    if (index != -1) {
      final item = _clipboardItems[index];
      _clipboardItems[index] = item.copyWith(pinned: !item.pinned);
      await StorageService.togglePin(id);
      
      // Re-sort
      _clipboardItems.sort((a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.createdAt.compareTo(a.createdAt);
      });
      
      notifyListeners();
    }
  }

  Future<void> clearHistory() async {
    _clipboardItems.clear();
    await StorageService.clearClipboardHistory();
    notifyListeners();
  }

  Future<void> completeOnboarding({
    required String serverUrl,
    required String deviceName,
    required String encryptionKey,
    String? spaceSecret,
  }) async {
    await StorageService.setServerUrl(serverUrl);
    await StorageService.setDeviceName(deviceName);
    await StorageService.setEncryptionKey(encryptionKey);
    if (spaceSecret != null && spaceSecret.isNotEmpty) {
      await StorageService.setSpaceSecret(spaceSecret);
    }
    await StorageService.setOnboardingComplete(true);
    
    await _initializeSync();
    _startClipboardMonitoring();
    
    _state = AppState.ready;
    notifyListeners();
  }

  Future<void> reconnect() async {
    _syncService?.disconnect();
    await _initializeSync();
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _devicesSub?.cancel();
    _clipboardSub?.cancel();
    _pairCodeSub?.cancel();
    _pairResultSub?.cancel();
    _clipboardContentSub?.cancel();
    _clipboardService.dispose();
    _syncService?.dispose();
    super.dispose();
  }
}
