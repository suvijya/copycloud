import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;
  
  final _serverUrlController = TextEditingController(text: 'http://localhost:3737');
  final _deviceNameController = TextEditingController();
  final _encryptionKeyController = TextEditingController();
  final _spaceSecretController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _deviceNameController.text = 'Flutter ${DateTime.now().millisecondsSinceEpoch % 10000}';
    _encryptionKeyController.text = const Uuid().v4().replaceAll('-', '');
  }

  @override
  void dispose() {
    _pageController.dispose();
    _serverUrlController.dispose();
    _deviceNameController.dispose();
    _encryptionKeyController.dispose();
    _spaceSecretController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
    }
  }

  void _previousPage() {
    if (_currentPage > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _completeOnboarding() {
    final provider = context.read<AppProvider>();
    provider.completeOnboarding(
      serverUrl: _serverUrlController.text.trim(),
      deviceName: _deviceNameController.text.trim(),
      encryptionKey: _encryptionKeyController.text.trim(),
      spaceSecret: _spaceSecretController.text.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Progress indicator
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: List.generate(3, (index) {
                  return Expanded(
                    child: Container(
                      height: 3,
                      margin: EdgeInsets.only(right: index < 2 ? 8 : 0),
                      decoration: BoxDecoration(
                        color: index <= _currentPage
                            ? CopyCloudTheme.accentOrange
                            : CopyCloudTheme.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
            
            // Pages
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: (page) {
                  setState(() => _currentPage = page);
                },
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildWelcomePage(),
                  _buildServerPage(),
                  _buildSecurityPage(),
                ],
              ),
            ),
            
            // Navigation buttons
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  if (_currentPage > 0)
                    OutlinedButton(
                      onPressed: _previousPage,
                      child: const Text('Back'),
                    ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: _nextPage,
                    child: Text(_currentPage < 2 ? 'Next' : 'Get Started'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomePage() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Logo
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              gradient: CopyCloudTheme.accentGradient,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: CopyCloudTheme.accentOrange.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(
              Icons.cloud_sync_rounded,
              size: 48,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 32),
          
          Text(
            'Welcome to\nCopyCloud',
            textAlign: TextAlign.center,
            style: CopyCloudTheme.headingLarge.copyWith(
              fontSize: 32,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 16),
          
          Text(
            'Copy once, paste everywhere.\nSync your clipboard across all devices.',
            textAlign: TextAlign.center,
            style: CopyCloudTheme.bodyLarge.copyWith(
              color: CopyCloudTheme.foregroundMuted,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 48),
          
          // Features
          _buildFeatureItem(
            icon: Icons.lock_outline_rounded,
            title: 'End-to-End Encrypted',
            description: 'Your data stays private',
          ),
          const SizedBox(height: 16),
          _buildFeatureItem(
            icon: Icons.sync_rounded,
            title: 'Real-time Sync',
            description: 'Instant clipboard updates',
          ),
          const SizedBox(height: 16),
          _buildFeatureItem(
            icon: Icons.devices_rounded,
            title: 'Cross-Platform',
            description: 'Works on all your devices',
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureItem({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: CopyCloudTheme.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: CopyCloudTheme.border),
          ),
          child: Icon(icon, color: CopyCloudTheme.accentOrange, size: 22),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: CopyCloudTheme.labelLarge),
              const SizedBox(height: 2),
              Text(description, style: CopyCloudTheme.bodySmall),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildServerPage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Text('Connect to Server', style: CopyCloudTheme.headingMedium),
          const SizedBox(height: 8),
          Text(
            'Enter your CopyCloud server URL. You can run your own server or use the default local server.',
            style: CopyCloudTheme.bodyMedium.copyWith(
              color: CopyCloudTheme.foregroundMuted,
            ),
          ),
          const SizedBox(height: 32),
          
          // Server URL
          Text('Server URL', style: CopyCloudTheme.labelLarge),
          const SizedBox(height: 8),
          TextField(
            controller: _serverUrlController,
            decoration: const InputDecoration(
              hintText: 'http://192.168.1.100:3737',
              prefixIcon: Icon(Icons.link_rounded),
            ),
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 24),
          
          // Device Name
          Text('Device Name', style: CopyCloudTheme.labelLarge),
          const SizedBox(height: 8),
          TextField(
            controller: _deviceNameController,
            decoration: const InputDecoration(
              hintText: 'My Phone',
              prefixIcon: Icon(Icons.phone_android_rounded),
            ),
          ),
          const SizedBox(height: 24),
          
          // Info box
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: CopyCloudTheme.cloudBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: CopyCloudTheme.cloudBlue.withOpacity(0.3),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  color: CopyCloudTheme.cloudBlue,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Make sure your phone and computer are on the same network, or use a public server URL.',
                    style: CopyCloudTheme.bodySmall.copyWith(
                      color: CopyCloudTheme.cloudBlue,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityPage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Text('Security Setup', style: CopyCloudTheme.headingMedium),
          const SizedBox(height: 8),
          Text(
            'Set up encryption to keep your clipboard data private. Share the same key across all your devices.',
            style: CopyCloudTheme.bodyMedium.copyWith(
              color: CopyCloudTheme.foregroundMuted,
            ),
          ),
          const SizedBox(height: 32),
          
          // Encryption Key
          Text('Encryption Key', style: CopyCloudTheme.labelLarge),
          const SizedBox(height: 8),
          TextField(
            controller: _encryptionKeyController,
            decoration: InputDecoration(
              hintText: 'Enter or generate a key',
              prefixIcon: const Icon(Icons.key_rounded),
              suffixIcon: IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: () {
                  _encryptionKeyController.text = 
                      const Uuid().v4().replaceAll('-', '');
                },
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Use the same key on all your devices to sync.',
            style: CopyCloudTheme.bodySmall,
          ),
          const SizedBox(height: 24),
          
          // Space Secret (optional)
          Text('Space Secret (Optional)', style: CopyCloudTheme.labelLarge),
          const SizedBox(height: 8),
          TextField(
            controller: _spaceSecretController,
            decoration: const InputDecoration(
              hintText: 'Leave empty for local network only',
              prefixIcon: Icon(Icons.group_rounded),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Groups your devices into a private space. Required for internet sync.',
            style: CopyCloudTheme.bodySmall,
          ),
          const SizedBox(height: 24),
          
          // Warning box
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: CopyCloudTheme.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: CopyCloudTheme.warning.withOpacity(0.3),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  color: CopyCloudTheme.warning,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Save your encryption key somewhere safe. If you lose it, you won\'t be able to decrypt your clipboard history.',
                    style: CopyCloudTheme.bodySmall.copyWith(
                      color: CopyCloudTheme.warning,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
