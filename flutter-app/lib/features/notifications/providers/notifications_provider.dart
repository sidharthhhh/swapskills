import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants.dart';
import '../../../services/api_service.dart';

/// Notification type enum matching backend types.
enum NotificationType {
  matchRequest,
  matchAccepted,
  newMessage,
  communityReply,
  reputationUpdate,
  sessionReminder,
  endorsementReceived;

  static NotificationType fromString(String value) {
    switch (value) {
      case 'match_request':
        return NotificationType.matchRequest;
      case 'match_accepted':
        return NotificationType.matchAccepted;
      case 'new_message':
        return NotificationType.newMessage;
      case 'community_reply':
        return NotificationType.communityReply;
      case 'reputation_update':
        return NotificationType.reputationUpdate;
      case 'session_reminder':
        return NotificationType.sessionReminder;
      case 'endorsement_received':
        return NotificationType.endorsementReceived;
      default:
        return NotificationType.matchRequest;
    }
  }
}

/// Model representing a single notification.
class AppNotification {
  final String id;
  final String userId;
  final NotificationType type;
  final Map<String, dynamic>? payload;
  final bool isRead;
  final String? readAt;
  final String createdAt;

  const AppNotification({
    required this.id,
    required this.userId,
    required this.type,
    this.payload,
    required this.isRead,
    this.readAt,
    required this.createdAt,
  });

  /// Parse from backend JSON response.
  /// Backend format: { id, user_id, type, payload (JSON), read_at (null if unread), created_at }
  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final readAt = json['read_at'] as String?;
    return AppNotification(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      type: NotificationType.fromString(json['type'] as String? ?? ''),
      payload: json['payload'] is Map<String, dynamic>
          ? json['payload'] as Map<String, dynamic>
          : null,
      isRead: readAt != null,
      readAt: readAt,
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  AppNotification copyWith({bool? isRead, String? readAt}) {
    return AppNotification(
      id: id,
      userId: userId,
      type: type,
      payload: payload,
      isRead: isRead ?? this.isRead,
      readAt: readAt ?? this.readAt,
      createdAt: createdAt,
    );
  }

  /// Get a human-readable title based on notification type and payload.
  String get title {
    switch (type) {
      case NotificationType.matchRequest:
        return 'New Match Request';
      case NotificationType.matchAccepted:
        return 'Match Accepted';
      case NotificationType.newMessage:
        return 'New Message';
      case NotificationType.communityReply:
        return 'New Reply';
      case NotificationType.reputationUpdate:
        return 'Reputation Update';
      case NotificationType.sessionReminder:
        return 'Session Reminder';
      case NotificationType.endorsementReceived:
        return 'New Endorsement';
    }
  }

  /// Get a description from the payload or a default message.
  String get body {
    if (payload != null && payload!.containsKey('message')) {
      return payload!['message'] as String? ?? _defaultBody;
    }
    return _defaultBody;
  }

  String get _defaultBody {
    switch (type) {
      case NotificationType.matchRequest:
        return 'Someone wants to exchange skills with you';
      case NotificationType.matchAccepted:
        return 'Your match request was accepted';
      case NotificationType.newMessage:
        return 'You have a new message';
      case NotificationType.communityReply:
        return 'Someone replied to your post';
      case NotificationType.reputationUpdate:
        return 'Your trust score has been updated';
      case NotificationType.sessionReminder:
        return 'You have an upcoming session';
      case NotificationType.endorsementReceived:
        return 'Someone endorsed your skill';
    }
  }
}

/// State holding the notifications list and pagination info.
class NotificationsState {
  final List<AppNotification> notifications;
  final int total;
  final int page;
  final int totalPages;
  final bool isLoading;

  const NotificationsState({
    this.notifications = const [],
    this.total = 0,
    this.page = 1,
    this.totalPages = 1,
    this.isLoading = false,
  });

  NotificationsState copyWith({
    List<AppNotification>? notifications,
    int? total,
    int? page,
    int? totalPages,
    bool? isLoading,
  }) {
    return NotificationsState(
      notifications: notifications ?? this.notifications,
      total: total ?? this.total,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

/// Provider for the unread notification count.
final unreadNotificationCountProvider =
    StateProvider<int>((ref) => 0);

/// Riverpod AsyncNotifier for managing notifications state.
final notificationsProvider =
    AsyncNotifierProvider<NotificationsNotifier, NotificationsState>(
  NotificationsNotifier.new,
);

class NotificationsNotifier extends AsyncNotifier<NotificationsState> {
  @override
  Future<NotificationsState> build() async {
    return await fetchNotifications();
  }

  /// Fetch notifications from the backend with pagination.
  Future<NotificationsState> fetchNotifications({int page = 1}) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.get(
        '/api/v1/notifications',
        queryParameters: {
          'page': page,
          'limit': AppConstants.defaultPageSize,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        final notificationsList = (data['notifications'] as List<dynamic>)
            .map((e) =>
                AppNotification.fromJson(e as Map<String, dynamic>))
            .toList();

        final total = data['total'] as int? ?? 0;
        final currentPage = data['page'] as int? ?? page;
        final totalPages = data['totalPages'] as int? ?? 1;

        // Update unread count.
        final unreadCount =
            notificationsList.where((n) => !n.isRead).length;
        ref.read(unreadNotificationCountProvider.notifier).state =
            unreadCount;

        return NotificationsState(
          notifications: notificationsList,
          total: total,
          page: currentPage,
          totalPages: totalPages,
        );
      }
    } on DioException catch (_) {
      // Network or server error — return empty state.
    }
    return const NotificationsState();
  }

  /// Refresh the notifications list (pull-to-refresh).
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => fetchNotifications());
  }

  /// Load the next page of notifications (append to existing list).
  Future<void> loadNextPage() async {
    final current = state.valueOrNull;
    if (current == null) return;
    if (current.page >= current.totalPages) return;

    try {
      final api = ref.read(apiServiceProvider);
      final nextPage = current.page + 1;
      final response = await api.dio.get(
        '/api/v1/notifications',
        queryParameters: {
          'page': nextPage,
          'limit': AppConstants.defaultPageSize,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        final newNotifications = (data['notifications'] as List<dynamic>)
            .map((e) =>
                AppNotification.fromJson(e as Map<String, dynamic>))
            .toList();

        state = AsyncValue.data(current.copyWith(
          notifications: [...current.notifications, ...newNotifications],
          page: nextPage,
          totalPages: data['totalPages'] as int? ?? current.totalPages,
        ));
      }
    } on DioException catch (_) {
      // Failed to load next page — keep current state.
    }
  }

  /// Mark a single notification as read.
  Future<bool> markAsRead(String notificationId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.put(
        '/api/v1/notifications/$notificationId/read',
      );

      if (response.statusCode == 200) {
        // Update local state optimistically.
        final current = state.valueOrNull;
        if (current != null) {
          final updated = current.notifications.map((n) {
            if (n.id == notificationId) {
              return n.copyWith(
                isRead: true,
                readAt: DateTime.now().toIso8601String(),
              );
            }
            return n;
          }).toList();

          state = AsyncValue.data(current.copyWith(notifications: updated));

          // Update unread count.
          final unreadCount = updated.where((n) => !n.isRead).length;
          ref.read(unreadNotificationCountProvider.notifier).state =
              unreadCount;
        }
        return true;
      }
    } on DioException catch (_) {
      // Failed to mark as read.
    }
    return false;
  }

  /// Mark all notifications as read.
  Future<bool> markAllAsRead() async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.put('/api/v1/notifications/read-all');

      if (response.statusCode == 200) {
        // Update local state — mark all as read.
        final current = state.valueOrNull;
        if (current != null) {
          final updated = current.notifications
              .map((n) => n.copyWith(isRead: true))
              .toList();

          state = AsyncValue.data(current.copyWith(notifications: updated));

          // Reset unread count.
          ref.read(unreadNotificationCountProvider.notifier).state = 0;
        }
        return true;
      }
    } on DioException catch (_) {
      // Failed to mark all as read.
    }
    return false;
  }
}
