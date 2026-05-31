import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/notifications_provider.dart';

/// Screen displaying the user's notifications list.
///
/// Features:
/// - Notifications ordered by creation time (newest first)
/// - Unread indicator (dot badge)
/// - Mark as read on tap
/// - Mark all as read button in app bar
/// - Pull to refresh
/// - Different icons/colors based on notification type
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  /// Load next page when scrolled near the bottom.
  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(notificationsProvider.notifier).loadNextPage();
    }
  }

  Future<void> _onRefresh() async {
    await ref.read(notificationsProvider.notifier).refresh();
  }

  Future<void> _markAllAsRead() async {
    final success =
        await ref.read(notificationsProvider.notifier).markAllAsRead();
    if (mounted && success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('All notifications marked as read'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _onNotificationTap(AppNotification notification) async {
    if (!notification.isRead) {
      await ref
          .read(notificationsProvider.notifier)
          .markAsRead(notification.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          notificationsAsync.whenOrNull(
                data: (state) {
                  final hasUnread =
                      state.notifications.any((n) => !n.isRead);
                  if (!hasUnread) return const SizedBox.shrink();
                  return IconButton(
                    icon: const Icon(Icons.done_all),
                    tooltip: 'Mark all as read',
                    onPressed: _markAllAsRead,
                  );
                },
              ) ??
              const SizedBox.shrink(),
        ],
      ),
      body: notificationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _buildErrorState(context),
        data: (state) {
          if (state.notifications.isEmpty) {
            return _buildEmptyState(context);
          }
          return RefreshIndicator(
            onRefresh: _onRefresh,
            child: ListView.builder(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: state.notifications.length +
                  (state.page < state.totalPages ? 1 : 0),
              itemBuilder: (context, index) {
                if (index >= state.notifications.length) {
                  return const Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final notification = state.notifications[index];
                return _NotificationTile(
                  notification: notification,
                  onTap: () => _onNotificationTap(notification),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          Icon(
            Icons.notifications_none_outlined,
            size: 80,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 16),
          Text(
            'No notifications yet',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Pull down to refresh',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          Icon(
            Icons.error_outline,
            size: 80,
            color: Theme.of(context).colorScheme.error,
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load notifications',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Theme.of(context).colorScheme.error,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Pull down to try again',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
        ],
      ),
    );
  }
}

/// Individual notification list tile with type-based icon and unread indicator.
class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;

  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final iconData = _getIconForType(notification.type);
    final iconColor = _getColorForType(notification.type, colorScheme);

    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      tileColor: notification.isRead
          ? null
          : colorScheme.primaryContainer.withValues(alpha: 0.1),
      leading: Stack(
        clipBehavior: Clip.none,
        children: [
          CircleAvatar(
            backgroundColor: iconColor.withValues(alpha: 0.15),
            child: Icon(iconData, color: iconColor, size: 22),
          ),
          // Unread dot indicator
          if (!notification.isRead)
            Positioned(
              top: -2,
              right: -2,
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: colorScheme.surface,
                    width: 1.5,
                  ),
                ),
              ),
            ),
        ],
      ),
      title: Text(
        notification.title,
        style: TextStyle(
          fontWeight:
              notification.isRead ? FontWeight.normal : FontWeight.w600,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 2),
          Text(
            notification.body,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          Text(
            _formatTimestamp(notification.createdAt),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: colorScheme.outline,
                ),
          ),
        ],
      ),
      trailing: notification.isRead
          ? null
          : Icon(
              Icons.circle,
              size: 8,
              color: colorScheme.primary,
            ),
    );
  }

  /// Get the appropriate icon for each notification type.
  IconData _getIconForType(NotificationType type) {
    switch (type) {
      case NotificationType.matchRequest:
        return Icons.person_add_outlined;
      case NotificationType.matchAccepted:
        return Icons.handshake_outlined;
      case NotificationType.newMessage:
        return Icons.chat_bubble_outline;
      case NotificationType.communityReply:
        return Icons.forum_outlined;
      case NotificationType.reputationUpdate:
        return Icons.trending_up;
      case NotificationType.sessionReminder:
        return Icons.schedule_outlined;
      case NotificationType.endorsementReceived:
        return Icons.star_outline;
    }
  }

  /// Get the appropriate color for each notification type.
  Color _getColorForType(NotificationType type, ColorScheme colorScheme) {
    switch (type) {
      case NotificationType.matchRequest:
        return Colors.blue;
      case NotificationType.matchAccepted:
        return Colors.green;
      case NotificationType.newMessage:
        return colorScheme.primary;
      case NotificationType.communityReply:
        return Colors.orange;
      case NotificationType.reputationUpdate:
        return Colors.teal;
      case NotificationType.sessionReminder:
        return Colors.deepPurple;
      case NotificationType.endorsementReceived:
        return Colors.amber.shade700;
    }
  }

  /// Format a timestamp string into a human-readable relative time.
  String _formatTimestamp(String timestamp) {
    try {
      final dateTime = DateTime.parse(timestamp);
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inMinutes < 1) {
        return 'Just now';
      } else if (difference.inMinutes < 60) {
        return '${difference.inMinutes}m ago';
      } else if (difference.inHours < 24) {
        return '${difference.inHours}h ago';
      } else if (difference.inDays < 7) {
        return '${difference.inDays}d ago';
      } else {
        return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
      }
    } catch (_) {
      return '';
    }
  }
}
