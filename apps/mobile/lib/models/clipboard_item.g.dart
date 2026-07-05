// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'clipboard_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ClipboardItem _$ClipboardItemFromJson(Map<String, dynamic> json) =>
    ClipboardItem(
      id: json['id'] as String,
      deviceId: json['deviceId'] as String?,
      contentType: $enumDecodeNullable(_$ContentTypeEnumMap, json['contentType']) ?? ContentType.text,
      encryptedContent: json['encryptedContent'] as String?,
      preview: json['preview'] as String?,
      metadata: json['metadata'] == null
          ? null
          : ClipMetadata.fromJson(json['metadata'] as Map<String, dynamic>),
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      pinned: json['pinned'] as bool? ?? false,
      sourceDevice: json['sourceDevice'] as String?,
    );

Map<String, dynamic> _$ClipboardItemToJson(ClipboardItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'deviceId': instance.deviceId,
      'contentType': _$ContentTypeEnumMap[instance.contentType],
      'encryptedContent': instance.encryptedContent,
      'preview': instance.preview,
      'metadata': instance.metadata,
      'createdAt': instance.createdAt.toIso8601String(),
      'pinned': instance.pinned,
      'sourceDevice': instance.sourceDevice,
    };

const _$ContentTypeEnumMap = {
  ContentType.text: 'text',
  ContentType.image: 'image',
  ContentType.file: 'file',
  ContentType.richText: 'richText',
};

ClipMetadata _$ClipMetadataFromJson(Map<String, dynamic> json) => ClipMetadata(
      size: json['size'] as int? ?? 0,
      format: json['format'] as String?,
      filename: json['filename'] as String?,
      category: json['category'] as String?,
    );

Map<String, dynamic> _$ClipMetadataToJson(ClipMetadata instance) =>
    <String, dynamic>{
      'size': instance.size,
      'format': instance.format,
      'filename': instance.filename,
      'category': instance.category,
    };
