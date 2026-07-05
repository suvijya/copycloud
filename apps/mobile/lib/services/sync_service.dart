import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:uuid/uuid.dart';
import '../models/device.dart';
import '../models/clipboard_item.dart';

enum SyncStatus { disconnected, connecting, connected, error }

class SyncMessage {
  final String type;
  final Map<String, dynamic> data;

  SyncMessage({required this.type, required this.data});

  Map<String, dynamic> toJson() => {'type': type, ...data};
  factory SyncMessage.fromJson(Map<String, dynamic> json) {
    return SyncMessage(
      type: json['type'] as String,
      data: Map<String, dynamic>.from(json)..remove('type'),
    );
  }
}

class SyncService {
  WebSocketChannel? _channel;
  final String serverUrl;
  final String deviceId;
  final String deviceName;
  final String platform;
  final String spaceId;
  
  SyncStatus _status = SyncStatus.disconnected;
  Timer? _reconnectTimer;
  Timer? _pingTimer;
  bool _intentionalClose = false;
  
  final _statusController = StreamController<SyncStatus>.broadcast();
  final _devicesController = StreamController<List<Device>>.broadcast();
  final _clipboardController = StreamController<ClipboardItem>.broadcast();
  final _pairCodeController = StreamController<PairCodeEvent>.broadcast();
  final _pairResultController = StreamController<PairResultEvent>.broadcast();
  
  Stream<SyncStatus> get statusStream => _statusController.stream;
  Stream<List<Device>> get devicesStream => _devicesController.stream;
  Stream<ClipboardItem> get clipboardStream => _clipboardController.stream;
  Stream<PairCodeEvent> get pairCodeStream => _pairCodeController.stream;
  Stream<PairResultEvent> get pairResultStream => _pairResultController.stream;
  
  SyncStatus get status => _status;
  List<Device> _devices = [];
  List<Device> get devices => _devices;

  SyncService({
    required this.serverUrl,
    required this.deviceId,
    required this.deviceName,
    this.platform = 'android',
    this.spaceId = 'local',
  });

  void connect() {
    if (_status == SyncStatus.connecting) return;
    
    _intentionalClose = false;
    _updateStatus(SyncStatus.connecting);
    
    final wsUrl = serverUrl.replaceFirst('http', 'ws');
    
    try {
      _channel = WebSocketChannel.connect(
        Uri.parse('$wsUrl/ws'),
      );
      
      _channel!.stream.listen(
        _onMessage,
        onDone: _onDone,
        onError: _onError,
      );
      
      // Send hello message
      _send(SyncMessage(
        type: 'hello',
        data: {
          'deviceId': deviceId,
          'name': deviceName,
          'platform': platform,
          'space': spaceId,
        },
      ));
      
      // Request device list
      _send(SyncMessage(type: 'list', data: {}));
      
      _updateStatus(SyncStatus.connected);
      _startPingTimer();
    } catch (e) {
      _updateStatus(SyncStatus.error);
      _scheduleReconnect();
    }
  }

  void disconnect() {
    _intentionalClose = true;
    _reconnectTimer?.cancel();
    _pingTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _updateStatus(SyncStatus.disconnected);
  }

  void sendClipboardUpdate(String encryptedContent, {String contentType = 'text', int size = 0}) {
    // Send to all paired peers
    for (final device in _devices.where((d) => d.paired)) {
      _send(SyncMessage(
        type: 'clip',
        data: {
          'targetId': device.deviceId,
          'content_type': contentType,
          'encrypted_content': encryptedContent,
          'metadata': {'size': size},
        },
      ));
    }
  }

  void requestPairing(String targetDeviceId) {
    _send(SyncMessage(
      type: 'pair_request',
      data: {'targetId': targetDeviceId},
    ));
  }

  void verifyPairing(String targetDeviceId, String code) {
    _send(SyncMessage(
      type: 'pair_verify',
      data: {
        'targetId': targetDeviceId,
        'code': code,
      },
    ));
  }

  void unpair(String targetDeviceId) {
    _send(SyncMessage(
      type: 'unpair',
      data: {'targetId': targetDeviceId},
    ));
  }

  void refreshDevices() {
    _send(SyncMessage(type: 'list', data: {}));
  }

  void _onMessage(dynamic data) {
    try {
      final json = jsonDecode(data as String) as Map<String, dynamic>;
      final message = SyncMessage.fromJson(json);
      
      switch (message.type) {
        case 'pairings':
          _handlePairings(message.data);
          break;
        case 'device_list':
          _handleDeviceList(message.data);
          break;
        case 'pair_code':
          _handlePairCode(message.data);
          break;
        case 'pair_awaiting':
          _handlePairAwaiting(message.data);
          break;
        case 'paired':
          _handlePaired(message.data);
          break;
        case 'pair_failed':
          _handlePairFailed(message.data);
          break;
        case 'unpaired':
          _handleUnpaired(message.data);
          break;
        case 'pair_cancelled':
          _handlePairCancelled(message.data);
          break;
        case 'clip':
          _handleClip(message.data);
          break;
        case 'pong':
          // Connection alive
          break;
      }
    } catch (e) {
      print('Error parsing message: $e');
    }
  }

  void _handlePairings(Map<String, dynamic> data) {
    final peers = (data['peers'] as List?) ?? [];
    // Store pairing keys for decryption
    // This will be handled by the provider
  }

  void _handleDeviceList(Map<String, dynamic> data) {
    final devicesList = (data['devices'] as List?) ?? [];
    _devices = devicesList
        .map((d) => Device.fromJson(d as Map<String, dynamic>))
        .toList();
    _devicesController.add(_devices);
  }

  void _handlePairCode(Map<String, dynamic> data) {
    _pairCodeController.add(PairCodeEvent(
      peerId: data['peerId'] as String,
      peerName: data['peerName'] as String? ?? 'A device',
      code: data['code'] as String,
      isTarget: true,
    ));
  }

  void _handlePairAwaiting(Map<String, dynamic> data) {
    _pairCodeController.add(PairCodeEvent(
      peerId: data['peerId'] as String,
      peerName: data['peerName'] as String? ?? 'the device',
      code: '',
      isTarget: false,
    ));
  }

  void _handlePaired(Map<String, dynamic> data) {
    _pairResultController.add(PairResultEvent(
      peerId: data['peerId'] as String,
      peerName: data['peerName'] as String? ?? 'device',
      success: true,
      key: data['key'] as String?,
    ));
    refreshDevices();
  }

  void _handlePairFailed(Map<String, dynamic> data) {
    _pairResultController.add(PairResultEvent(
      peerId: data['peerId'] as String? ?? '',
      peerName: '',
      success: false,
      reason: data['reason'] as String? ?? 'Pairing failed',
    ));
  }

  void _handleUnpaired(Map<String, dynamic> data) {
    refreshDevices();
  }

  void _handlePairCancelled(Map<String, dynamic> data) {
    _pairResultController.add(PairResultEvent(
      peerId: data['peerId'] as String? ?? '',
      peerName: '',
      success: false,
      reason: 'Pairing cancelled',
    ));
  }

  void _handleClip(Map<String, dynamic> data) {
    _clipboardController.add(ClipboardItem(
      id: const Uuid().v4(),
      deviceId: data['fromId'] as String?,
      contentType: ContentType.text,
      encryptedContent: data['encrypted_content'] as String?,
      preview: '', // Will be decrypted by the provider
      metadata: ClipMetadata(
        size: (data['metadata']?['size'] as int?) ?? 0,
      ),
      sourceDevice: data['fromId'] as String?,
    ));
  }

  void _onDone() {
    _pingTimer?.cancel();
    if (!_intentionalClose) {
      _updateStatus(SyncStatus.disconnected);
      _scheduleReconnect();
    }
  }

  void _onError(dynamic error) {
    print('WebSocket error: $error');
    _updateStatus(SyncStatus.error);
    _pingTimer?.cancel();
    if (!_intentionalClose) {
      _scheduleReconnect();
    }
  }

  void _send(SyncMessage message) {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode(message.toJson()));
    }
  }

  void _updateStatus(SyncStatus status) {
    _status = status;
    _statusController.add(status);
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), () {
      if (!_intentionalClose) {
        connect();
      }
    });
  }

  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _send(SyncMessage(type: 'ping', data: {}));
    });
  }

  void dispose() {
    disconnect();
    _statusController.close();
    _devicesController.close();
    _clipboardController.close();
    _pairCodeController.close();
    _pairResultController.close();
  }
}

class PairCodeEvent {
  final String peerId;
  final String peerName;
  final String code;
  final bool isTarget;

  PairCodeEvent({
    required this.peerId,
    required this.peerName,
    required this.code,
    required this.isTarget,
  });
}

class PairResultEvent {
  final String peerId;
  final String peerName;
  final bool success;
  final String? reason;
  final String? key;

  PairResultEvent({
    required this.peerId,
    required this.peerName,
    required this.success,
    this.reason,
    this.key,
  });
}
