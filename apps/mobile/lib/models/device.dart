enum DeviceStatus { online, offline, unknown }

class Device {
  final String deviceId;
  final String name;
  final String platform;
  final bool online;
  final bool paired;
  final DeviceStatus status;

  Device({
    required this.deviceId,
    required this.name,
    required this.platform,
    this.online = false,
    this.paired = false,
    DeviceStatus? status,
  }) : status = status ?? (online ? DeviceStatus.online : DeviceStatus.offline);

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      deviceId: json['deviceId'] as String,
      name: json['name'] as String? ?? 'Unknown Device',
      platform: json['platform'] as String? ?? 'unknown',
      online: json['online'] as bool? ?? false,
      paired: json['paired'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'deviceId': deviceId,
      'name': name,
      'platform': platform,
      'online': online,
      'paired': paired,
    };
  }

  Device copyWith({
    String? deviceId,
    String? name,
    String? platform,
    bool? online,
    bool? paired,
  }) {
    return Device(
      deviceId: deviceId ?? this.deviceId,
      name: name ?? this.name,
      platform: platform ?? this.platform,
      online: online ?? this.online,
      paired: paired ?? this.paired,
    );
  }

  String get platformIcon {
    switch (platform.toLowerCase()) {
      case 'windows':
        return '🪟';
      case 'macos':
        return '🍎';
      case 'linux':
        return '🐧';
      case 'android':
        return '🤖';
      case 'ios':
        return '📱';
      default:
        return '💻';
    }
  }
}
