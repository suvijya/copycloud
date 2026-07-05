import 'package:json_annotation/json_annotation.dart';

part 'clipboard_item.g.dart';

enum ContentType { text, image, file, richText }

@JsonSerializable()
class ClipboardItem {
  final String id;
  final String? deviceId;
  final ContentType contentType;
  final String? encryptedContent;
  final String? preview;
  final ClipMetadata metadata;
  final DateTime createdAt;
  final bool pinned;
  final String? sourceDevice;

  ClipboardItem({
    required this.id,
    this.deviceId,
    this.contentType = ContentType.text,
    this.encryptedContent,
    this.preview,
    ClipMetadata? metadata,
    DateTime? createdAt,
    this.pinned = false,
    this.sourceDevice,
  })  : metadata = metadata ?? ClipMetadata(),
        createdAt = createdAt ?? DateTime.now();

  factory ClipboardItem.fromJson(Map<String, dynamic> json) =>
      _$ClipboardItemFromJson(json);
  Map<String, dynamic> toJson() => _$ClipboardItemToJson(this);

  ClipboardItem copyWith({
    String? id,
    String? deviceId,
    ContentType? contentType,
    String? encryptedContent,
    String? preview,
    ClipMetadata? metadata,
    DateTime? createdAt,
    bool? pinned,
    String? sourceDevice,
  }) {
    return ClipboardItem(
      id: id ?? this.id,
      deviceId: deviceId ?? this.deviceId,
      contentType: contentType ?? this.contentType,
      encryptedContent: encryptedContent ?? this.encryptedContent,
      preview: preview ?? this.preview,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      pinned: pinned ?? this.pinned,
      sourceDevice: sourceDevice ?? this.sourceDevice,
    );
  }
}

@JsonSerializable()
class ClipMetadata {
  final int size;
  final String? format;
  final String? filename;
  final String? category;

  ClipMetadata({
    this.size = 0,
    this.format,
    this.filename,
    this.category,
  });

  factory ClipMetadata.fromJson(Map<String, dynamic> json) =>
      _$ClipMetadataFromJson(json);
  Map<String, dynamic> toJson() => _$ClipMetadataToJson(this);
}
