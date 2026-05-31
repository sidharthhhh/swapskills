import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';

/// Model representing a skill exchange session.
class Session {
  final String id;
  final String matchId;
  final String partnerUsername;
  final String scheduledAt;
  final int duration;
  final String status;
  final String createdAt;

  const Session({
    required this.id,
    required this.matchId,
    required this.partnerUsername,
    required this.scheduledAt,
    required this.duration,
    required this.status,
    required this.createdAt,
  });

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      id: json['id']?.toString() ?? '',
      matchId: json['matchId']?.toString() ?? '',
      partnerUsername: json['partnerUsername'] as String? ?? '',
      scheduledAt: json['scheduledAt'] as String? ?? '',
      duration: (json['duration'] as num?)?.toInt() ?? 60,
      status: json['status'] as String? ?? 'scheduled',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

/// Model representing a session note.
class SessionNote {
  final String id;
  final String sessionId;
  final String userId;
  final String username;
  final String content;
  final String createdAt;

  const SessionNote({
    required this.id,
    required this.sessionId,
    required this.userId,
    required this.username,
    required this.content,
    required this.createdAt,
  });

  factory SessionNote.fromJson(Map<String, dynamic> json) {
    return SessionNote(
      id: json['id']?.toString() ?? '',
      sessionId: json['sessionId']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      username: json['username'] as String? ?? '',
      content: json['content'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

/// Provider for managing sessions.
final sessionsProvider =
    AsyncNotifierProvider<SessionsNotifier, List<Session>>(
  SessionsNotifier.new,
);

class SessionsNotifier extends AsyncNotifier<List<Session>> {
  @override
  Future<List<Session>> build() async {
    return await fetchSessions();
  }

  Future<List<Session>> fetchSessions() async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.get('/api/v1/sessions');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] as List<dynamic>;
        return data
            .map((e) => Session.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (_) {
      rethrow;
    }
    return [];
  }

  /// Fetch sessions for a specific match.
  Future<List<Session>> fetchSessionsForMatch(String matchId) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response =
          await api.dio.get('/api/v1/sessions/match/$matchId');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] as List<dynamic>;
        return data
            .map((e) => Session.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (_) {
      rethrow;
    }
    return [];
  }

  /// Schedule a new session.
  Future<bool> scheduleSession({
    required String matchId,
    required String scheduledAt,
    required int duration,
  }) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.post(
        '/api/v1/sessions',
        data: {
          'matchId': matchId,
          'scheduledAt': scheduledAt,
          'duration': duration,
        },
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        state = await AsyncValue.guard(() => fetchSessions());
        return true;
      }
    } on DioException catch (_) {
      return false;
    }
    return false;
  }

  /// Update session status (completed, cancelled, no_show).
  Future<bool> updateSessionStatus(String sessionId, String status) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.put(
        '/api/v1/sessions/$sessionId/status',
        data: {'status': status},
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        state = await AsyncValue.guard(() => fetchSessions());
        return true;
      }
    } on DioException catch (_) {
      return false;
    }
    return false;
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => fetchSessions());
  }
}

/// Provider for session notes.
final sessionNotesProvider = AsyncNotifierProvider.family<
    SessionNotesNotifier, List<SessionNote>, String>(
  SessionNotesNotifier.new,
);

class SessionNotesNotifier
    extends FamilyAsyncNotifier<List<SessionNote>, String> {
  @override
  Future<List<SessionNote>> build(String arg) async {
    return await fetchNotes(arg);
  }

  Future<List<SessionNote>> fetchNotes(String sessionId) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response =
          await api.dio.get('/api/v1/sessions/$sessionId/notes');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] as List<dynamic>;
        return data
            .map((e) => SessionNote.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (_) {
      rethrow;
    }
    return [];
  }

  /// Add a note to a session.
  Future<bool> addNote(String sessionId, String content) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.post(
        '/api/v1/sessions/$sessionId/notes',
        data: {'content': content},
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        state = await AsyncValue.guard(() => fetchNotes(sessionId));
        return true;
      }
    } on DioException catch (_) {
      return false;
    }
    return false;
  }
}
