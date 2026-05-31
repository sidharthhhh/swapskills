import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../matching/screens/matches_screen.dart';
import '../../chat/screens/chat_list_screen.dart';
import '../../community/screens/community_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../../notifications/providers/notifications_provider.dart';

/// Main home screen with bottom navigation bar and greeting header.
/// Provides access to: Matches, Chat, Community, Profile.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    MatchesScreen(),
    ChatListScreen(),
    CommunityScreen(),
    ProfileScreen(),
  ];

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final authState = ref.watch(authProvider).valueOrNull;
    final username = authState is AuthAuthenticated ? authState.username : '';
    final unreadCount = ref.watch(unreadNotificationCountProvider);

    return Scaffold(
      body: Column(
        children: [
          // Top greeting section
          _buildGreetingHeader(context, colorScheme, username, unreadCount),
          // Main content
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: _screens,
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: colorScheme.outlineVariant.withOpacity(0.3),
              width: 0.5,
            ),
          ),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (index) {
            setState(() => _currentIndex = index);
          },
          animationDuration: const Duration(milliseconds: 400),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.handshake_outlined),
              selectedIcon: Icon(Icons.handshake),
              label: 'Matches',
            ),
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline),
              selectedIcon: Icon(Icons.chat_bubble),
              label: 'Chat',
            ),
            NavigationDestination(
              icon: Icon(Icons.forum_outlined),
              selectedIcon: Icon(Icons.forum),
              label: 'Community',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGreetingHeader(
    BuildContext context,
    ColorScheme colorScheme,
    String username,
    int unreadCount,
  ) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 16,
        left: 20,
        right: 16,
        bottom: 12,
      ),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: colorScheme.outlineVariant.withOpacity(0.2),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getGreeting(),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  username.isNotEmpty ? 'Hello, $username!' : 'Hello!',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                ),
              ],
            ),
          ),
          // Search button
          IconButton(
            onPressed: () => context.push('/search'),
            style: IconButton.styleFrom(
              backgroundColor: colorScheme.surfaceContainerHighest.withOpacity(0.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            icon: Icon(
              Icons.search,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(width: 4),
          // Notification bell with badge
          _buildNotificationBell(context, colorScheme, unreadCount),
        ],
      ),
    );
  }

  Widget _buildNotificationBell(
    BuildContext context,
    ColorScheme colorScheme,
    int unreadCount,
  ) {
    return IconButton(
      onPressed: () => context.push('/notifications'),
      style: IconButton.styleFrom(
        backgroundColor: colorScheme.surfaceContainerHighest.withOpacity(0.5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      icon: Badge(
        isLabelVisible: unreadCount > 0,
        label: Text(
          unreadCount > 99 ? '99+' : unreadCount.toString(),
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
        ),
        child: Icon(
          unreadCount > 0
              ? Icons.notifications_active_rounded
              : Icons.notifications_outlined,
          color: unreadCount > 0
              ? colorScheme.primary
              : colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
