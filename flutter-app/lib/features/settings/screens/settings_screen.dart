import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants.dart';
import '../../../core/theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/router.dart';

/// Settings screen with theme mode toggle, app version, and logout.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Theme section
          _buildSectionHeader(context, 'Appearance'),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                RadioListTile<ThemeMode>(
                  title: const Text('System'),
                  subtitle: const Text('Follow device theme'),
                  value: ThemeMode.system,
                  groupValue: themeMode,
                  onChanged: (value) {
                    ref.read(themeModeProvider.notifier).state = value!;
                  },
                  secondary: const Icon(Icons.settings_suggest_outlined),
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                RadioListTile<ThemeMode>(
                  title: const Text('Light'),
                  subtitle: const Text('Always use light theme'),
                  value: ThemeMode.light,
                  groupValue: themeMode,
                  onChanged: (value) {
                    ref.read(themeModeProvider.notifier).state = value!;
                  },
                  secondary: const Icon(Icons.light_mode_outlined),
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                RadioListTile<ThemeMode>(
                  title: const Text('Dark'),
                  subtitle: const Text('Always use dark theme'),
                  value: ThemeMode.dark,
                  groupValue: themeMode,
                  onChanged: (value) {
                    ref.read(themeModeProvider.notifier).state = value!;
                  },
                  secondary: const Icon(Icons.dark_mode_outlined),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // About section
          _buildSectionHeader(context, 'About'),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: const Text('App Version'),
                  trailing: Text(
                    AppConstants.appVersion,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Account section
          _buildSectionHeader(context, 'Account'),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: Icon(Icons.logout, color: colorScheme.error),
              title: Text(
                'Logout',
                style: TextStyle(color: colorScheme.error),
              ),
              onTap: () => _showLogoutDialog(context, ref),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w600,
          ),
    );
  }

  Future<void> _showLogoutDialog(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      await ref.read(authProvider.notifier).logout();
      if (context.mounted) {
        final router = ref.read(routerProvider);
        router.go('/login');
      }
    }
  }
}
