import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/clipboard_item.dart';
import '../theme/app_theme.dart';
import '../utils/time_utils.dart';

class ClipCard extends StatelessWidget {
  final ClipboardItem item;
  final VoidCallback onTap;
  final VoidCallback onPin;
  final VoidCallback onDelete;

  const ClipCard({
    super.key,
    required this.item,
    required this.onTap,
    required this.onPin,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(item.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(
          color: CopyCloudTheme.error.withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          Icons.delete_outline_rounded,
          color: CopyCloudTheme.error,
        ),
      ),
      onDismissed: (_) => onDelete(),
      child: GestureDetector(
        onTap: onTap,
        onLongPress: () => _showOptions(context),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: item.pinned
                ? CopyCloudTheme.accentOrange.withOpacity(0.05)
                : CopyCloudTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: item.pinned
                  ? CopyCloudTheme.accentOrange.withOpacity(0.3)
                  : CopyCloudTheme.border,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Content
              Text(
                item.preview ?? 'Encrypted content',
                style: CopyCloudTheme.bodyMedium.copyWith(
                  height: 1.4,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 10),
              
              // Metadata row
              Row(
                children: [
                  // Category tag
                  if (item.metadata.category != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _getCategoryColor(item.metadata.category)
                            .withOpacity(0.1),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: _getCategoryColor(item.metadata.category)
                              .withOpacity(0.3),
                        ),
                      ),
                      child: Text(
                        item.metadata.category!.toUpperCase(),
                        style: CopyCloudTheme.labelSmall.copyWith(
                          color: _getCategoryColor(item.metadata.category),
                          fontSize: 9,
                        ),
                      ),
                    ),
                  
                  if (item.metadata.category != null)
                    const SizedBox(width: 8),
                  
                  // Source device
                  if (item.sourceDevice != null) ...[
                    Icon(
                      Icons.phone_android_rounded,
                      size: 12,
                      color: CopyCloudTheme.foregroundMuted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      item.sourceDevice == 'local' ? 'This device' : 'Synced',
                      style: CopyCloudTheme.labelSmall,
                    ),
                    const SizedBox(width: 8),
                  ],
                  
                  // Time
                  Icon(
                    Icons.access_time_rounded,
                    size: 12,
                    color: CopyCloudTheme.foregroundMuted,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    TimeUtils.timeAgo(item.createdAt),
                    style: CopyCloudTheme.labelSmall,
                  ),
                  
                  const Spacer(),
                  
                  // Pin indicator
                  if (item.pinned)
                    Icon(
                      Icons.push_pin_rounded,
                      size: 14,
                      color: CopyCloudTheme.accentOrange,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getCategoryColor(String? category) {
    switch (category?.toLowerCase()) {
      case 'link':
        return CopyCloudTheme.cloudBlue;
      case 'email':
        return CopyCloudTheme.success;
      case 'phone':
        return CopyCloudTheme.warning;
      case 'code':
        return CopyCloudTheme.accentOrange;
      default:
        return CopyCloudTheme.foregroundMuted;
    }
  }

  void _showOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: CopyCloudTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: CopyCloudTheme.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: CopyCloudTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            
            // Preview
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                item.preview ?? '',
                style: CopyCloudTheme.bodyMedium,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 16),
            
            const Divider(height: 1),
            
            // Actions
            ListTile(
              leading: Icon(Icons.copy_rounded, color: CopyCloudTheme.foreground),
              title: const Text('Copy'),
              onTap: () {
                Clipboard.setData(ClipboardData(text: item.preview ?? ''));
                Navigator.pop(context);
                onTap();
              },
            ),
            ListTile(
              leading: Icon(
                item.pinned ? Icons.push_pin_outlined : Icons.push_pin_rounded,
                color: CopyCloudTheme.accentOrange,
              ),
              title: Text(item.pinned ? 'Unpin' : 'Pin'),
              onTap: () {
                Navigator.pop(context);
                onPin();
              },
            ),
            ListTile(
              leading: Icon(Icons.share_rounded, color: CopyCloudTheme.foreground),
              title: const Text('Share'),
              onTap: () {
                Navigator.pop(context);
                // TODO: Implement share
              },
            ),
            ListTile(
              leading: Icon(Icons.delete_outline_rounded, color: CopyCloudTheme.error),
              title: Text('Delete', style: TextStyle(color: CopyCloudTheme.error)),
              onTap: () {
                Navigator.pop(context);
                onDelete();
              },
            ),
            
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
