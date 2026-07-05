import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../models/device.dart';
import '../services/sync_service.dart';
import '../theme/app_theme.dart';
import '../widgets/device_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/pairing_modal.dart';

class DevicesScreen extends StatefulWidget {
  const DevicesScreen({super.key});

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  @override
  void initState() {
    super.initState();
    // Refresh devices on screen open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppProvider>().refreshDevices();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Devices'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              context.read<AppProvider>().refreshDevices();
            },
          ),
        ],
      ),
      body: Consumer<AppProvider>(
        builder: (context, provider, child) {
          final pairedDevices = provider.devices.where((d) => d.paired).toList();
          final networkDevices = provider.devices.where((d) => !d.paired && d.online).toList();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // This device
              _buildThisDevice(provider),
              const SizedBox(height: 24),
              
              // Connection status
              _buildConnectionStatus(provider),
              const SizedBox(height: 24),
              
              // Paired devices
              if (pairedDevices.isNotEmpty) ...[
                _buildSectionHeader('Paired Devices', pairedDevices.length),
                const SizedBox(height: 8),
                ...pairedDevices.map((device) => DeviceCard(
                  device: device,
                  isPaired: true,
                  onUnpair: () => _showUnpairConfirmation(device),
                )),
                const SizedBox(height: 24),
              ],
              
              // Network devices
              _buildSectionHeader('On Your Network', networkDevices.length),
              const SizedBox(height: 8),
              if (networkDevices.isEmpty)
                const EmptyStateWidget(
                  icon: Icons.devices_other_rounded,
                  title: 'No Devices Found',
                  message: 'Make sure other devices are on the same network and running CopyCloud',
                )
              else
                ...networkDevices.map((device) => DeviceCard(
                  device: device,
                  isPaired: false,
                  onPair: () => _initiatePairing(device),
                )),
            ],
          );
        },
      ),
    );
  }

  Widget _buildThisDevice(AppProvider provider) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CopyCloudTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: CopyCloudTheme.cloudBlue.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: CopyCloudTheme.cloudBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.phone_android_rounded,
              color: CopyCloudTheme.cloudBlue,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'This Device',
                  style: CopyCloudTheme.labelMedium.copyWith(
                    color: CopyCloudTheme.cloudBlue,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Flutter Device',
                  style: CopyCloudTheme.bodyLarge.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: provider.isConnected
                  ? CopyCloudTheme.success
                  : CopyCloudTheme.error,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionStatus(AppProvider provider) {
    final isConnected = provider.isConnected;
    final status = provider.syncStatus;
    
    String statusText;
    Color statusColor;
    IconData statusIcon;
    
    switch (status) {
      case SyncStatus.connected:
        statusText = 'Connected to server';
        statusColor = CopyCloudTheme.success;
        statusIcon = Icons.check_circle_outline_rounded;
        break;
      case SyncStatus.connecting:
        statusText = 'Connecting...';
        statusColor = CopyCloudTheme.warning;
        statusIcon = Icons.sync_rounded;
        break;
      case SyncStatus.disconnected:
        statusText = 'Disconnected';
        statusColor = CopyCloudTheme.foregroundMuted;
        statusIcon = Icons.cloud_off_rounded;
        break;
      case SyncStatus.error:
        statusText = 'Connection error';
        statusColor = CopyCloudTheme.error;
        statusIcon = Icons.error_outline_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: statusColor.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(statusIcon, color: statusColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              statusText,
              style: CopyCloudTheme.bodyMedium.copyWith(color: statusColor),
            ),
          ),
          if (!isConnected)
            TextButton(
              onPressed: () => provider.reconnect(),
              child: const Text('Reconnect'),
            ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, int count) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title.toUpperCase(),
          style: CopyCloudTheme.labelSmall.copyWith(
            letterSpacing: 0.12,
          ),
        ),
        if (count > 0)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: CopyCloudTheme.surfaceLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: CopyCloudTheme.labelSmall,
            ),
          ),
      ],
    );
  }

  void _initiatePairing(Device device) {
    context.read<AppProvider>().requestPairing(device.deviceId);
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PairingModal(device: device),
    );
  }

  void _showUnpairConfirmation(Device device) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Disconnect Device'),
        content: Text('Are you sure you want to disconnect from ${device.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              context.read<AppProvider>().unpairDevice(device.deviceId);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(
              foregroundColor: CopyCloudTheme.error,
            ),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );
  }
}
