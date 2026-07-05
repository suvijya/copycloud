import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SearchBarWidget extends StatelessWidget {
  final ValueChanged<String> onChanged;
  final VoidCallback onClose;

  const SearchBarWidget({
    super.key,
    required this.onChanged,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 40,
      decoration: BoxDecoration(
        color: CopyCloudTheme.surfaceLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: CopyCloudTheme.border),
      ),
      child: Row(
        children: [
          const SizedBox(width: 12),
          Icon(
            Icons.search_rounded,
            size: 18,
            color: CopyCloudTheme.foregroundMuted,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              autofocus: true,
              onChanged: onChanged,
              style: CopyCloudTheme.bodyMedium,
              decoration: InputDecoration(
                hintText: 'Search clips...',
                hintStyle: CopyCloudTheme.bodyMedium.copyWith(
                  color: CopyCloudTheme.foregroundMuted,
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
          IconButton(
            icon: Icon(
              Icons.close_rounded,
              size: 18,
              color: CopyCloudTheme.foregroundMuted,
            ),
            onPressed: onClose,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(
              minWidth: 32,
              minHeight: 32,
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
    );
  }
}
