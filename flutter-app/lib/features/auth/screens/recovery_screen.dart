import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../services/api_service.dart';
import '../../../services/secure_storage_service.dart';

/// Screen for account recovery using a recovery key.
class RecoveryScreen extends ConsumerStatefulWidget {
  const RecoveryScreen({super.key});

  @override
  ConsumerState<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends ConsumerState<RecoveryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _recoveryKeyController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _recoveryKeyController.dispose();
    super.dispose();
  }

  Future<void> _handleRecover() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/auth/recover',
        data: {'recoveryKey': _recoveryKeyController.text.trim()},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        final storage = ref.read(secureStorageServiceProvider);

        await storage.saveAccessToken(data['accessToken'] as String);
        await storage.saveRefreshToken(data['refreshToken'] as String);

        if (mounted) {
          context.go('/home');
        }
      } else {
        setState(() {
          _error = response.data['message'] as String? ?? 'Recovery failed';
        });
      }
    } on DioException catch (e) {
      setState(() {
        if (e.response?.data is Map) {
          final data = e.response!.data as Map;
          _error = data['message'] as String? ??
              data['error'] as String? ??
              'Invalid recovery key';
        } else {
          _error = 'Unable to connect. Please try again.';
        }
      });
    } catch (_) {
      setState(() {
        _error = 'An unexpected error occurred';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Recovery'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Icon
                Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      Icons.key_rounded,
                      size: 36,
                      color: colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Title
                Text(
                  'Recover Your Account',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Enter the recovery key you received during registration to regain access to your account.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

                // Error message
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: colorScheme.errorContainer.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: colorScheme.error.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline_rounded,
                          color: colorScheme.error,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _error!,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: colorScheme.error,
                                      fontWeight: FontWeight.w500,
                                    ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Recovery key input
                TextFormField(
                  controller: _recoveryKeyController,
                  decoration: const InputDecoration(
                    labelText: 'Recovery Key',
                    hintText: 'XXXX-XXXX-XXXX-XXXX',
                    prefixIcon: Icon(Icons.vpn_key_outlined),
                  ),
                  textCapitalization: TextCapitalization.characters,
                  inputFormatters: [
                    _RecoveryKeyFormatter(),
                  ],
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your recovery key';
                    }
                    final cleaned = value.replaceAll('-', '').trim();
                    if (cleaned.length < 16) {
                      return 'Recovery key must be 16 characters (XXXX-XXXX-XXXX-XXXX)';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 28),

                // Submit button
                SizedBox(
                  height: 52,
                  child: FilledButton(
                    onPressed: _isLoading ? null : _handleRecover,
                    child: _isLoading
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Recover Account'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Input formatter that auto-inserts dashes in XXXX-XXXX-XXXX-XXXX format.
class _RecoveryKeyFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll('-', '').toUpperCase();
    if (text.length > 16) {
      return oldValue;
    }

    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      if (i > 0 && i % 4 == 0) {
        buffer.write('-');
      }
      buffer.write(text[i]);
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
