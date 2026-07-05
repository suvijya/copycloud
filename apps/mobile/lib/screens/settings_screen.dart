import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';
import '../services/storage_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _serverUrlController = TextEditingController();
  final _deviceNameController = TextEditingController();
  final _encryptionKeyController = TextEditingController();
  final _spaceSecretController = TextEditingController();
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    _serverUrlController.text = await StorageService.getServerUrl() ?? 'http://localhost:3737';
    _deviceNameController.text = await StorageService.getDeviceName() ?? '';
    _encryptionKeyController.text = await StorageService.getEncryptionKey() ?? '';
    _spaceSecretController.text = await StorageService.getSpaceSecret() ?? '';
    setState(() => _isLoading = false);
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    _deviceNameController.dispose();
    _encryptionKeyController.dispose();
    _spaceSecretController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Consumer<AppProvider>(
              builder: (context, provider, child) {
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Connection section
                    _buildSectionHeader('CONNECTION'),
                    const SizedBox(height: 8),
                    _buildSettingsCard(
                      children: [
                        _buildTextField(
                          label: 'Server URL',
                          controller: _serverUrlController,
                          icon: Icons.link_rounded,
                          keyboardType: TextInputType.url,
                        ),
                        const SizedBox(height: 16),
                        _buildTextField(
                          label: 'Device Name',
                          controller: _deviceNameController,
                          icon: Icons.phone_android_rounded,
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () => _saveConnectionSettings(provider),
                            child: const Text('Save & Reconnect'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    
                    // Security section
                    _buildSectionHeader('SECURITY'),
                    const SizedBox(height: 8),
                    _buildSettingsCard(
                      children: [
                        _buildTextField(
                          label: 'Encryption Key',
                          controller: _encryptionKeyController,
                          icon: Icons.key_rounded,
                          obscureText: true,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Must match the key on your other devices',
                          style: CopyCloudTheme.bodySmall,
                        ),
                        const SizedBox(height: 16),
                        _buildTextField(
                          label: 'Space Secret',
                          controller: _spaceSecretController,
                          icon: Icons.group_rounded,
                          obscureText: true,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Groups devices for internet sync',
                          style: CopyCloudTheme.bodySmall,
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () => _saveSecuritySettings(provider),
                            child: const Text('Save Security Settings'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    
                    // App section
                    _buildSectionHeader('APP'),
                    const SizedBox(height: 8),
                    _buildSettingsCard(
                      children: [
                        _buildSwitchTile(
                          title: 'Clipboard Monitoring',
                          subtitle: 'Automatically sync clipboard changes',
                          icon: Icons.content_paste_rounded,
                          value: StorageService.clipboardMonitoringEnabled,
                          onChanged: (value) {
                            StorageService.setClipboardMonitoringEnabled(value);
                            setState(() {});
                          },
                        ),
                        const Divider(height: 1),
                        _buildSwitchTile(
                          title: 'Notifications',
                          subtitle: 'Notify on clipboard updates',
                          icon: Icons.notifications_outlined,
                          value: StorageService.notificationsEnabled,
                          onChanged: (value) {
                            StorageService.setNotificationsEnabled(value);
                            setState(() {});
                          },
                        ),
                        const Divider(height: 1),
                        _buildSwitchTile(
                          title: 'Haptic Feedback',
                          subtitle: 'Vibrate on actions',
                          icon: Icons.vibration_rounded,
                          value: StorageService.hapticFeedbackEnabled,
                          onChanged: (value) {
                            StorageService.setHapticFeedbackEnabled(value);
                            setState(() {});
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    
                    // Data section
                    _buildSectionHeader('DATA'),
                    const SizedBox(height: 8),
                    _buildSettingsCard(
                      children: [
                        _buildActionTile(
                          title: 'Clear Clipboard History',
                          subtitle: 'Remove all saved clips',
                          icon: Icons.delete_outline_rounded,
                          color: CopyCloudTheme.error,
                          onTap: _showClearHistoryConfirmation,
                        ),
                        const Divider(height: 1),
                        _buildActionTile(
                          title: 'Reset All Settings',
                          subtitle: 'Restore default configuration',
                          icon: Icons.restore_rounded,
                          color: CopyCloudTheme.warning,
                          onTap: _showResetConfirmation,
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    
                    // About section
                    _buildSectionHeader('ABOUT'),
                    const SizedBox(height: 8),
                    _buildSettingsCard(
                      children: [
                        ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              gradient: CopyCloudTheme.accentGradient,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.cloud_sync_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          title: const Text('CopyCloud'),
                          subtitle: const Text('Version 1.0.0'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                  ],
                );
              },
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Text(
        title,
        style: CopyCloudTheme.labelSmall.copyWith(
          letterSpacing: 0.12,
          color: CopyCloudTheme.foregroundMuted,
        ),
      ),
    );
  }

  Widget _buildSettingsCard({required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: CopyCloudTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: CopyCloudTheme.labelLarge),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          decoration: InputDecoration(
            prefixIcon: Icon(icon, size: 18),
            suffixIcon: obscureText
                ? IconButton(
                    icon: const Icon(Icons.copy_rounded, size: 18),
                    onPressed: () {
                      // Copy to clipboard
                    },
                  )
                : null,
          ),
          keyboardType: keyboardType,
          obscureText: obscureText,
        ),
      ],
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile(
      title: Text(title, style: CopyCloudTheme.bodyMedium),
      subtitle: Text(subtitle, style: CopyCloudTheme.bodySmall),
      secondary: Icon(icon, color: CopyCloudTheme.foregroundMuted, size: 20),
      value: value,
      onChanged: onChanged,
      activeColor: CopyCloudTheme.accentOrange,
      contentPadding: EdgeInsets.zero,
    );
  }

  Widget _buildActionTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: color, size: 20),
      title: Text(
        title,
        style: CopyCloudTheme.bodyMedium.copyWith(color: color),
      ),
      subtitle: Text(subtitle, style: CopyCloudTheme.bodySmall),
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
    );
  }

  Future<void> _saveConnectionSettings(AppProvider provider) async {
    await provider.setServerUrl(_serverUrlController.text.trim());
    await provider.setDeviceName(_deviceNameController.text.trim());
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connection settings saved')),
      );
    }
  }

  Future<void> _saveSecuritySettings(AppProvider provider) async {
    await provider.setEncryptionKey(_encryptionKeyController.text.trim());
    await provider.setSpaceSecret(_spaceSecretController.text.trim());
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Security settings saved')),
      );
    }
  }

  void _showClearHistoryConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear History'),
        content: const Text('This will permanently delete all clipboard history. This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              context.read<AppProvider>().clearHistory();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Clipboard history cleared')),
              );
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

  void _showResetConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Settings'),
        content: const Text('This will reset all settings to their default values. You will need to go through onboarding again.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              await StorageService.setOnboardingComplete(false);
              if (mounted) {
                Navigator.pop(context);
                // Navigate to onboarding
                Navigator.pushReplacementNamed(context, '/onboarding');
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: CopyCloudTheme.warning,
            ),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
  }
}
