import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';

/// Model representing a community (skill category group).
class Community {
  final String id;
  final String name;
  final String description;
  final String createdAt;

  const Community({
    required this.id,
    required this.name,
    required this.description,
    required this.createdAt,
  });

  factory Community.fromJson(Map<String, dynamic> json) {
    return Community(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

/// Model representing a community post.
class CommunityPost {
  final String id;
  final String communityId;
  final String userId;
  final String username;
  final String content;
  final int upvoteCount;
  final bool hasUpvoted;
  final int commentCount;
  final String createdAt;

  const CommunityPost({
    required this.id,
    required this.communityId,
    required this.userId,
    required this.username,
    required this.content,
    required this.upvoteCount,
    required this.hasUpvoted,
    required this.commentCount,
    required this.createdAt,
  });

  factory CommunityPost.fromJson(Map<String, dynamic> json) {
    return CommunityPost(
      id: json['id']?.toString() ?? '',
      communityId: json['communityId']?.toString() ?? json['community_id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? json['author_id']?.toString() ?? '',
      username: json['username'] as String? ?? json['author_username'] as String? ?? '',
      content: json['content'] as String? ?? '',
      upvoteCount: (json['upvoteCount'] as num?)?.toInt() ?? (json['upvotes'] as num?)?.toInt() ?? 0,
      hasUpvoted: json['hasUpvoted'] as bool? ?? false,
      commentCount: (json['commentCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
    );
  }

  CommunityPost copyWith({
    int? upvoteCount,
    bool? hasUpvoted,
    int? commentCount,
  }) {
    return CommunityPost(
      id: id,
      communityId: communityId,
      userId: userId,
      username: username,
      content: content,
      upvoteCount: upvoteCount ?? this.upvoteCount,
      hasUpvoted: hasUpvoted ?? this.hasUpvoted,
      commentCount: commentCount ?? this.commentCount,
      createdAt: createdAt,
    );
  }
}

/// Model representing a comment on a post.
class PostComment {
  final String id;
  final String postId;
  final String userId;
  final String username;
  final String content;
  final String? parentId;
  final List<PostComment> replies;
  final String createdAt;

  const PostComment({
    required this.id,
    required this.postId,
    required this.userId,
    required this.username,
    required this.content,
    this.parentId,
    this.replies = const [],
    required this.createdAt,
  });

  factory PostComment.fromJson(Map<String, dynamic> json) {
    final repliesJson = json['replies'] as List<dynamic>? ?? [];
    return PostComment(
      id: json['id']?.toString() ?? '',
      postId: json['postId']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      username: json['username'] as String? ?? '',
      content: json['content'] as String? ?? '',
      parentId: json['parentId']?.toString(),
      replies: repliesJson
          .map((e) => PostComment.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

/// Provider for fetching the list of communities.
final communitiesProvider =
    AsyncNotifierProvider<CommunitiesNotifier, List<Community>>(
  CommunitiesNotifier.new,
);

class CommunitiesNotifier extends AsyncNotifier<List<Community>> {
  @override
  Future<List<Community>> build() async {
    return await fetchCommunities();
  }

  Future<List<Community>> fetchCommunities() async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.get('/api/v1/community');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] as List<dynamic>;
        return data
            .map((e) => Community.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (_) {
      rethrow;
    }
    return [];
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => fetchCommunities());
  }
}

/// Provider for fetching posts in a specific community.
final communityPostsProvider = AsyncNotifierProvider.family<
    CommunityPostsNotifier, List<CommunityPost>, String>(
  CommunityPostsNotifier.new,
);

class CommunityPostsNotifier
    extends FamilyAsyncNotifier<List<CommunityPost>, String> {
  @override
  Future<List<CommunityPost>> build(String arg) async {
    return await fetchPosts(arg);
  }

  Future<List<CommunityPost>> fetchPosts(String communityId) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response =
          await api.dio.get('/api/v1/community/$communityId/posts');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        // API returns { posts: [...], total, page, limit, totalPages }
        final List<dynamic> posts = data is List ? data : (data['posts'] as List<dynamic>? ?? []);
        return posts
            .map((e) => CommunityPost.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (_) {
      rethrow;
    }
    return [];
  }

  /// Create a new post in the community.
  Future<bool> createPost(String communityId, String content) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.post(
        '/api/v1/community/$communityId/posts',
        data: {'content': content},
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        state = await AsyncValue.guard(() => fetchPosts(communityId));
        return true;
      }
    } on DioException catch (_) {
      return false;
    }
    return false;
  }

  /// Upvote a post.
  Future<bool> upvotePost(String postId) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response =
          await api.dio.post('/api/v1/community/posts/$postId/upvote');
      if (response.statusCode == 200 || response.statusCode == 201) {
        // Optimistically update the local state.
        final currentPosts = state.valueOrNull ?? [];
        state = AsyncValue.data(
          currentPosts.map((post) {
            if (post.id == postId) {
              return post.copyWith(
                upvoteCount: post.upvoteCount + (post.hasUpvoted ? -1 : 1),
                hasUpvoted: !post.hasUpvoted,
              );
            }
            return post;
          }).toList(),
        );
        return true;
      }
    } on DioException catch (_) {
      return false;
    }
    return false;
  }

  /// Delete own post.
  Future<bool> deletePost(String postId, String communityId) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response =
          await api.dio.delete('/api/v1/community/posts/$postId');
      if (response.statusCode == 200) {
        state = await AsyncValue.guard(() => fetchPosts(communityId));
        return true;
      }
    } on DioException catch (_) {
      return false;
    }
    return false;
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => fetchPosts(arg));
  }
}

/// Provider for fetching comments on a specific post.
final postCommentsProvider = AsyncNotifierProvider.family<
    PostCommentsNotifier, List<PostComment>, String>(
  PostCommentsNotifier.new,
);

class PostCommentsNotifier
    extends FamilyAsyncNotifier<List<PostComment>, String> {
  @override
  Future<List<PostComment>> build(String arg) async {
    return await fetchComments(arg);
  }

  Future<List<PostComment>> fetchComments(String postId) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response =
          await api.dio.get('/api/v1/community/posts/$postId/comments');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] as List<dynamic>;
        return data
            .map((e) => PostComment.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (_) {
      rethrow;
    }
    return [];
  }

  /// Add a comment to a post. Optionally provide parentId for nested reply.
  Future<bool> addComment(
      String postId, String content, {String? parentId}) async {
    final api = ref.read(apiServiceProvider);
    try {
      final data = <String, dynamic>{'content': content};
      if (parentId != null) {
        data['parentId'] = parentId;
      }
      final response = await api.dio.post(
        '/api/v1/community/posts/$postId/comments',
        data: data,
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        state = await AsyncValue.guard(() => fetchComments(postId));
        return true;
      }
    } on DioException catch (_) {
      return false;
    }
    return false;
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => fetchComments(arg));
  }
}
