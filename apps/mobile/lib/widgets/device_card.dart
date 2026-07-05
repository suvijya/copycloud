import 'package:flutter/material.dart';
import '../models/device.dart';
import '../theme/app_theme.dart';

class DeviceCard extends StatelessWidget {
  final Device device;
  final bool isPaired;
  final VoidCallback? onPair;
  final VoidCallback? onUnpair;

  const DeviceCard({
    super.key,
    required this.device,
    required this.isPaired,
    this.onPair,
    this.onUnpair,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: CopyCloudTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: device.online
              ? CopyCloudTheme.success.withOpacity(0.3)
              : CopyCloudTheme.border,
        ),
      ),
      child: Row(
        children: [
          // Device icon
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: device.online
                  ? CopyCloudTheme.success.withOpacity(0.1)
                  : CopyCloudTheme.surfaceLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                device.platformIcon,
                style: const TextStyle(fontSize: 20),
              ),
            ),
          ),
          const SizedBox(width: 14),
          
          // Device info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  device.name,
                  style: CopyCloudTheme.bodyLarge.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      device.platform,
                      style: CopyCloudTheme.bodySmall,
                    ),
                    if (!device.online) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: CopyCloudTheme.foregroundMuted.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'OFFLINE',
                          style: CopyCloudTheme.labelSmall.copyWith(
                            fontSize: 8,
                            letterSpacing: 0.08,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          
          // Online indicator
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: device.online
                  ? CopyCloudTheme.success
                  : CopyCloudTheme.foregroundMuted,
              shape: BoxShape.circle,
              boxShadow: device.online
                  ? [
                      BoxShadow(
                        color: CopyCloudTheme.success.withOpacity(0.5),
                        blurRadius: 6,
                      ),
                    ]
                  : null,
            ),
          ),
          
          // Action button
          if (isPaired)
            OutlinedButton(
              onPressed: onUnpair,
              style: OutlinedButton.styleFrom(
                foregroundColor: CopyCloudTheme.error,
                side: BorderSide(
                  color: CopyCloudTheme.error.withOpacity(0.5),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
              child: const Text('Disconnect', style: TextStyle(fontSize: 12)),
            )
          else
            ElevatedButton(
              onPressed: device.online ? onPair : null,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
              child: const Text('Connect', style: TextStyle(fontSize: 12)),
            ),
        ],
      ),
    );
  }
}
