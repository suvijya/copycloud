import 'dart:async';
import 'package:flutter/services.dart';

class ClipboardService {
  static const _channel = MethodChannel('com.copycloud/clipboard');
  Timer? _monitorTimer;
  String _lastContent = '';
  bool _isMonitoring = false;
  
  final _contentController = StreamController<String>.broadcast();
  Stream<String> get contentStream => _contentController.stream;
  
  bool get isMonitoring => _isMonitoring;

  void startMonitoring({Duration interval = const Duration(seconds: 1)}) {
    if (_isMonitoring) return;
    
    _isMonitoring = true;
    _monitorTimer = Timer.periodic(interval, (_) async {
      await _checkClipboard();
    });
  }

  void stopMonitoring() {
    _isMonitoring = false;
    _monitorTimer?.cancel();
    _monitorTimer = null;
  }

  Future<void> _checkClipboard() async {
    try {
      final String? content = await _channel.invokeMethod('getClipboardContent');
      if (content != null && content.isNotEmpty && content != _lastContent) {
        _lastContent = content;
        _contentController.add(content);
      }
    } catch (e) {
      // Clipboard access might fail on some platforms
      print('Clipboard check failed: $e');
    }
  }

  Future<void> copyToClipboard(String content) async {
    try {
      await _channel.invokeMethod('setClipboardContent', {'content': content});
      _lastContent = content;
    } catch (e) {
      print('Failed to copy to clipboard: $e');
      // Fallback to Flutter clipboard
      await Clipboard.setData(ClipboardData(text: content));
    }
  }

  Future<String?> getClipboardContent() async {
    try {
      return await _channel.invokeMethod('getClipboardContent');
    } catch (e) {
      // Fallback to Flutter clipboard
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      return data?.text;
    }
  }

  void dispose() {
    stopMonitoring();
    _contentController.close();
  }
}
