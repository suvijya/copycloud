import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import '../providers/app_provider.dart';
import '../models/clipboard_item.dart';
import '../theme/app_theme.dart';
import '../utils/time_utils.dart';
import '../widgets/clip_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/search_bar.dart';

class ClipboardScreen extends StatefulWidget {
  const ClipboardScreen({super.key});

  @override
  State<ClipboardScreen> createState() => _ClipboardScreenState();
}

class _ClipboardScreenState extends State<ClipboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<ClipboardItem> _getFilteredItems(List<ClipboardItem> items) {
    if (_searchQuery.isEmpty) return items;
    
    final query = _searchQuery.toLowerCase();
    return items.where((item) {
      final preview = item.preview?.toLowerCase() ?? '';
      final category = item.metadata.category?.toLowerCase() ?? '';
      return preview.contains(query) || category.contains(query);
    }).toList();
  }

  void _copyToClipboard(String content) {
    Clipboard.setData(ClipboardData(text: content));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle_outline, color: CopyCloudTheme.success, size: 18),
            const SizedBox(width: 8),
            const Text('Copied to clipboard'),
          ],
        ),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _isSearching
            ? SearchBarWidget(
                onChanged: (query) {
                  setState(() => _searchQuery = query);
                },
                onClose: () {
                  setState(() {
                    _isSearching = false;
                    _searchQuery = '';
                  });
                },
              )
            : Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      gradient: CopyCloudTheme.accentGradient,
                      borderRadius: BorderRadius.circular(7),
                    ),
                    child: const Icon(
                      Icons.cloud_sync_rounded,
                      size: 16,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text('CopyCloud'),
                ],
              ),
        actions: [
          if (!_isSearching)
            IconButton(
              icon: const Icon(Icons.search_rounded),
              onPressed: () {
                setState(() => _isSearching = true);
              },
            ),
          if (!_isSearching)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert_rounded),
              onSelected: _handleMenuAction,
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'clear',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline_rounded, size: 18),
                      SizedBox(width: 8),
                      Text('Clear History'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'settings',
                  child: Row(
                    children: [
                      Icon(Icons.settings_outlined, size: 18),
                      SizedBox(width: 8),
                      Text('Settings'),
                    ],
                  ),
                ),
              ],
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: CopyCloudTheme.accentOrange,
          unselectedLabelColor: CopyCloudTheme.foregroundMuted,
          indicatorColor: CopyCloudTheme.accentOrange,
          indicatorSize: TabBarIndicatorSize.label,
          tabs: const [
            Tab(text: 'All Clips'),
            Tab(text: 'Pinned'),
          ],
        ),
      ),
      body: Consumer<AppProvider>(
        builder: (context, provider, child) {
          final allItems = _getFilteredItems(provider.clipboardItems);
          final pinnedItems = allItems.where((item) => item.pinned).toList();

          return TabBarView(
            controller: _tabController,
            children: [
              _buildClipList(allItems, provider),
              _buildClipList(pinnedItems, provider),
            ],
          );
        },
      ),
    );
  }

  Widget _buildClipList(List<ClipboardItem> items, AppProvider provider) {
    if (items.isEmpty) {
      return EmptyStateWidget(
        icon: _searchQuery.isNotEmpty
            ? Icons.search_off_rounded
            : Icons.content_paste_rounded,
        title: _searchQuery.isNotEmpty ? 'No Results' : 'No Clips Yet',
        message: _searchQuery.isNotEmpty
            ? 'Try a different search term'
            : 'Copy something to get started',
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        provider.refreshDevices();
      },
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          return ClipCard(
            item: item,
            onTap: () => _copyToClipboard(item.preview ?? ''),
            onPin: () => provider.togglePin(item.id),
            onDelete: () => provider.deleteClipboardItem(item.id),
          );
        },
      ),
    );
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'clear':
        _showClearConfirmation();
        break;
      case 'settings':
        Navigator.pushNamed(context, '/settings');
        break;
    }
  }

  void _showClearConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear History'),
        content: const Text('Are you sure you want to clear all clipboard history? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              context.read<AppProvider>().clearHistory();
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(
              foregroundColor: CopyCloudTheme.error,
            ),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}
