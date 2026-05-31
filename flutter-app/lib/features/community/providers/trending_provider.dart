import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';
import 'community_provider.dart';

/// Provider for fetching trending posts from the backend.
final trendingPostsProvider = FutureProvider<List<CommunityPost>>((ref) async {
  try {
    final api = ref.read(apiServiceProvider);
    final response = await api.dio.get('/api/v1/community/trending');

    if (response.statusCode == 200 && response.data['success'] == true) {
      final List<dynamic> data = response.data['data'] as List<dynamic>;
      return data
          .map((e) => CommunityPost.fromJson(e as Map<String, dynamic>))
          .toList();
    }
  } on DioException catch (_) {
    // Failed to fetch trending posts.
  }
  return [];
});
