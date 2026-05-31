import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';

/// Model representing a match suggestion from the backend.
class MatchSuggestion {
  final String userId;
  final String uid;
  final String username;
  final double trustScore;
  final String teachSkillId;
  final String teachSkillName;
  final String learnSkillId;
  final String learnSkillName;

  const MatchSuggestion({
    required this.userId,
    required this.uid,
    required this.username,
    required this.trustScore,
    required this.teachSkillId,
    required this.teachSkillName,
    required this.learnSkillId,
    required this.learnSkillName,
  });

  factory MatchSuggestion.fromJson(Map<String, dynamic> json) {
    return MatchSuggestion(
      userId: json['userId']?.toString() ?? '',
      uid: json['uid']?.toString() ?? '',
      username: json['username'] as String? ?? '',
      trustScore: double.tryParse(json['trustScore']?.toString() ?? '0') ?? 0.0,
      teachSkillId: json['teachSkillId']?.toString() ?? '',
      teachSkillName: json['teachSkillName'] as String? ?? '',
      learnSkillId: json['learnSkillId']?.toString() ?? '',
      learnSkillName: json['learnSkillName'] as String? ?? '',
    );
  }
}

/// Model representing a pending match request.
class MatchRequest {
  final String id;
  final String senderId;
  final String senderUsername;
  final double senderTrustScore;
  final String teachSkillName;
  final String learnSkillName;
  final String status;
  final String createdAt;

  const MatchRequest({
    required this.id,
    required this.senderId,
    required this.senderUsername,
    required this.senderTrustScore,
    required this.teachSkillName,
    required this.learnSkillName,
    required this.status,
    required this.createdAt,
  });

  factory MatchRequest.fromJson(Map<String, dynamic> json) {
    return MatchRequest(
      id: json['id']?.toString() ?? '',
      senderId: json['senderId']?.toString() ?? '',
      senderUsername: json['senderUsername'] as String? ?? '',
      senderTrustScore:
          (json['senderTrustScore'] as num?)?.toDouble() ?? 0.0,
      teachSkillName: json['teachSkillName'] as String? ?? '',
      learnSkillName: json['learnSkillName'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

/// Model representing an active match.
class ActiveMatch {
  final String id;
  final String partnerUsername;
  final String teachSkillName;
  final String learnSkillName;
  final String status;
  final String chatRoomId;
  final String createdAt;

  const ActiveMatch({
    required this.id,
    required this.partnerUsername,
    required this.teachSkillName,
    required this.learnSkillName,
    required this.status,
    required this.chatRoomId,
    required this.createdAt,
  });

  factory ActiveMatch.fromJson(Map<String, dynamic> json) {
    return ActiveMatch(
      id: json['id']?.toString() ?? '',
      partnerUsername: json['partnerUsername'] as String? ?? '',
      teachSkillName: json['teachSkillName'] as String? ?? '',
      learnSkillName: json['learnSkillName'] as String? ?? '',
      status: json['status'] as String? ?? '',
      chatRoomId: json['chatRoomId']?.toString() ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

/// Provider for fetching match suggestions.
final suggestionsProvider =
    AsyncNotifierProvider<SuggestionsNotifier, List<MatchSuggestion>>(
  SuggestionsNotifier.new,
);

class SuggestionsNotifier extends AsyncNotifier<List<MatchSuggestion>> {
  @override
  Future<List<MatchSuggestion>> build() async {
    return await fetchSuggestions();
  }

  Future<List<MatchSuggestion>> fetchSuggestions() async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.get('/api/v1/matches/suggestions');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] as List<dynamic>? ?? [];

        final allSuggestions = <MatchSuggestion>[];
        for (final e in data) {
          try {
            allSuggestions.add(MatchSuggestion.fromJson(e as Map<String, dynamic>));
          } catch (_) {
            // Skip malformed entries
          }
        }

        // Deduplicate by userId — keep first occurrence
        final seen = <String>{};
        final unique = <MatchSuggestion>[];
        for (final s in allSuggestions) {
          if (!seen.contains(s.userId)) {
            seen.add(s.userId);
            unique.add(s);
          }
        }
        return unique;
      }
    } catch (_) {
      // Return empty list instead of crashing
    }
    return [];
  }

  /// Refresh suggestions list.
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => fetchSuggestions());
  }
}

/// Provider for pending match requests received.
final pendingRequestsProvider =
    AsyncNotifierProvider<PendingRequestsNotifier, List<MatchRequest>>(
  PendingRequestsNotifier.new,
);

class PendingRequestsNotifier extends AsyncNotifier<List<MatchRequest>> {
  @override
  Future<List<MatchRequest>> build() async {
    return await fetchPendingRequests();
  }

  Future<List<MatchRequest>> fetchPendingRequests() async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.get('/api/v1/matches/request');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] as List<dynamic>;
        return data
            .map((e) => MatchRequest.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (_) {
      rethrow;
    }
    return [];
  }

  /// Accept or reject a match request.
  Future<bool> respondToRequest(String requestId, String action) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.put(
        '/api/v1/matches/request/$requestId',
        data: {'action': action},
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        // Refresh the list after responding.
        state = await AsyncValue.guard(() => fetchPendingRequests());
        // Also refresh active matches if accepted.
        if (action == 'accept') {
          ref.invalidate(activeMatchesProvider);
        }
        return true;
      }
    } on DioException catch (_) {
      return false;
    }
    return false;
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => fetchPendingRequests());
  }
}

/// Provider for active matches.
final activeMatchesProvider =
    AsyncNotifierProvider<ActiveMatchesNotifier, List<ActiveMatch>>(
  ActiveMatchesNotifier.new,
);

class ActiveMatchesNotifier extends AsyncNotifier<List<ActiveMatch>> {
  @override
  Future<List<ActiveMatch>> build() async {
    return await fetchActiveMatches();
  }

  Future<List<ActiveMatch>> fetchActiveMatches() async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.get('/api/v1/matches');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] as List<dynamic>;
        return data
            .map((e) => ActiveMatch.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (_) {
      rethrow;
    }
    return [];
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => fetchActiveMatches());
  }
}

/// Provider for sending a match request (action provider).
final sendMatchRequestProvider =
    FutureProvider.family<bool, SendMatchRequestParams>((ref, params) async {
  final api = ref.read(apiServiceProvider);
  try {
    final response = await api.dio.post(
      '/api/v1/matches/request',
      data: {
        'receiverId': params.receiverId,
        'teachSkillId': params.teachSkillId,
        'learnSkillId': params.learnSkillId,
      },
    );
    return response.statusCode == 200 || response.statusCode == 201;
  } on DioException catch (_) {
    return false;
  }
});

class SendMatchRequestParams {
  final String receiverId;
  final String teachSkillId;
  final String learnSkillId;

  const SendMatchRequestParams({
    required this.receiverId,
    required this.teachSkillId,
    required this.learnSkillId,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SendMatchRequestParams &&
          runtimeType == other.runtimeType &&
          receiverId == other.receiverId &&
          teachSkillId == other.teachSkillId &&
          learnSkillId == other.learnSkillId;

  @override
  int get hashCode =>
      receiverId.hashCode ^ teachSkillId.hashCode ^ learnSkillId.hashCode;
}
