import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../models/device.dart';
import '../theme/app_theme.dart';

class PairingModal extends StatefulWidget {
  final Device device;

  const PairingModal({super.key, required this.device});

  @override
  State<PairingModal> createState() => _PairingModalState();
}

class _PairingModalState extends State<PairingModal> {
  final _codeController = TextEditingController();
  String? _errorCode;
  bool _isVerifying = false;
  bool _showCodeInput = false;

  @override
  void initState() {
    super.initState();
    // Listen for pairing events
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<AppProvider>();
      // TODO: Listen for pair code events
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CopyCloudTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: CopyCloudTheme.border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: CopyCloudTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Device icon
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: CopyCloudTheme.accentOrange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: CopyCloudTheme.accentOrange.withOpacity(0.3),
                    ),
                  ),
                  child: Center(
                    child: Text(
                      widget.device.platformIcon,
                      style: const TextStyle(fontSize: 28),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                // Title
                Text(
                  'Pair with ${widget.device.name}',
                  style: CopyCloudTheme.headingSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                
                // Description
                Text(
                  'Enter the 6-digit code shown on the other device to establish a secure connection.',
                  style: CopyCloudTheme.bodyMedium.copyWith(
                    color: CopyCloudTheme.foregroundMuted,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 28),
                
                // Code input
                if (_showCodeInput) ...[
                  TextField(
                    controller: _codeController,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    maxLength: 6,
                    style: CopyCloudTheme.monospace.copyWith(
                      fontSize: 24,
                      letterSpacing: 0.3,
                    ),
                    decoration: InputDecoration(
                      hintText: '••••••',
                      hintStyle: CopyCloudTheme.monospace.copyWith(
                        fontSize: 24,
                        letterSpacing: 0.3,
                        color: CopyCloudTheme.foregroundMuted,
                      ),
                      counterText: '',
                      errorText: _errorCode,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                    ],
                    onChanged: (value) {
                      if (value.length == 6) {
                        _verifyCode();
                      }
                    },
                  ),
                  const SizedBox(height: 20),
                  
                  // Verify button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isVerifying ? null : _verifyCode,
                      child: _isVerifying
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Verify Code'),
                    ),
                  ),
                ] else ...[
                  // Waiting state
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: CopyCloudTheme.surfaceLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: CopyCloudTheme.accentOrange,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Waiting for pairing request...',
                          style: CopyCloudTheme.bodyMedium.copyWith(
                            color: CopyCloudTheme.foregroundMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  
                  // Enter code manually
                  OutlinedButton(
                    onPressed: () {
                      setState(() => _showCodeInput = true);
                    },
                    child: const Text('Enter Code Manually'),
                  ),
                ],
                
                const SizedBox(height: 16),
                
                // Cancel button
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'Cancel',
                    style: TextStyle(color: CopyCloudTheme.foregroundMuted),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _verifyCode() {
    final code = _codeController.text.trim();
    if (code.length != 6) {
      setState(() => _errorCode = 'Enter all 6 digits');
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorCode = null;
    });

    final provider = context.read<AppProvider>();
    provider.verifyPairing(widget.device.deviceId, code);

    // Close after a delay (success/failure will be handled by the provider)
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.pop(context);
      }
    });
  }
}
