import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/community_provider.dart';
import '../providers/trending_provider.dart';

/// Screen for browsing communities by skill category.
/// Displays a list of communities, and tapping one shows the post feed.
/// Also includes a "Trending" tab showing top posts.
class CommunityScreen extends ConsumerWidget {
  const CommunityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Communities'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Communities'),
              Tab(text: 'Trending'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _CommunitiesTab(),
            _TrendingTab(),
          ],
        ),
      ),
    );
  }
}

/// Tab showing the list of communities.
class _CommunitiesTab extends ConsumerWidget {
  const _CommunitiesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final communitiesAsync = ref.watch(communitiesProvider);

    return communitiesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            const Text('Failed to load communities'),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () =>
                  ref.read(communitiesProvider.notifier).refresh(),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (communities) {
        if (communities.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.forum_outlined, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('No communities available'),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () =>
              ref.read(communitiesProvider.notifier).refresh(),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: communities.length,
            itemBuilder: (context, index) {
              final community = communities[index];
              return _CommunityTile(community: community);
            },
          ),
        );
      },
    );
  }
}

/// Tab showing trending posts.
class _TrendingTab extends ConsumerWidget {
  const _TrendingTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trendingAsync = ref.watch(trendingPostsProvider);

    return trendingAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            const Text('Failed to load trending posts'),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => ref.invalidate(trendingPostsProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (posts) {
        if (posts.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.trending_up, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('No trending posts yet'),
                SizedBox(height: 8),
                Text('Posts with the most upvotes this week will appear here.'),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(trendingPostsProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: posts.length,
            itemBuilder: (context, index) {
              final post = posts[index];
              return _TrendingPostCard(post: post, rank: index + 1);
            },
          ),
        );
      },
    );
  }
}

/// Card widget for a trending post.
class _TrendingPostCard extends StatelessWidget {
  final CommunityPost post;
  final int rank;

  const _TrendingPostCard({required this.post, required this.rank});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Rank badge
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: rank <= 3
                    ? theme.colorScheme.primaryContainer
                    : theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  '#$rank',
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: rank <= 3
                        ? theme.colorScheme.onPrimaryContainer
                        : theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Post content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundColor: theme.colorScheme.secondaryContainer,
                        child: Text(
                          post.username.isNotEmpty
                              ? post.username[0].toUpperCase()
                              : '?',
                          style: TextStyle(
                            fontSize: 11,
                            color: theme.colorScheme.onSecondaryContainer,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        post.username,
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      Icon(Icons.thumb_up, size: 14, color: theme.colorScheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        '${post.upvoteCount}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    post.content,
                    style: theme.textTheme.bodyMedium,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tile widget for a single community in the list.
class _CommunityTile extends StatelessWidget {
  final Community community;

  const _CommunityTile({required this.community});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Icon(
            Icons.group,
            color: theme.colorScheme.onPrimaryContainer,
          ),
        ),
        title: Text(
          community.name,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: community.description.isNotEmpty
            ? Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  community.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              )
            : null,
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => _CommunityPostsScreen(community: community),
            ),
          );
        },
      ),
    );
  }
}

/// Screen showing the post feed for a specific community.
class _CommunityPostsScreen extends ConsumerWidget {
  final Community community;

  const _CommunityPostsScreen({required this.community});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final postsAsync = ref.watch(communityPostsProvider(community.id));

    return Scaffold(
      appBar: AppBar(
        title: Text(community.name),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreatePostDialog(context, ref),
        child: const Icon(Icons.edit),
      ),
      body: postsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Failed to load posts'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref
                    .read(communityPostsProvider(community.id).notifier)
                    .refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (posts) {
          if (posts.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.article_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No posts yet'),
                  SizedBox(height: 8),
                  Text('Be the first to post!'),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref
                .read(communityPostsProvider(community.id).notifier)
                .refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: posts.length,
              itemBuilder: (context, index) {
                final post = posts[index];
                return _PostCard(
                  post: post,
                  communityId: community.id,
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showCreatePostDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _CreatePostSheet(communityId: community.id),
    );
  }
}

/// Card widget for displaying a single post with upvote and comment actions.
class _PostCard extends ConsumerWidget {
  final CommunityPost post;
  final String communityId;

  const _PostCard({required this.post, required this.communityId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Author row
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: theme.colorScheme.secondaryContainer,
                  child: Text(
                    post.username.isNotEmpty
                        ? post.username[0].toUpperCase()
                        : '?',
                    style: TextStyle(
                      fontSize: 14,
                      color: theme.colorScheme.onSecondaryContainer,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post.username,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        _formatDate(post.createdAt),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Post content
            Text(post.content, style: theme.textTheme.bodyLarge),
            const SizedBox(height: 12),
            // Action row
            Row(
              children: [
                // Upvote button
                InkWell(
                  onTap: () => ref
                      .read(communityPostsProvider(communityId).notifier)
                      .upvotePost(post.id),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Row(
                      children: [
                        Icon(
                          post.hasUpvoted
                              ? Icons.thumb_up
                              : Icons.thumb_up_outlined,
                          size: 18,
                          color: post.hasUpvoted
                              ? theme.colorScheme.primary
                              : Colors.grey,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${post.upvoteCount}',
                          style: TextStyle(
                            color: post.hasUpvoted
                                ? theme.colorScheme.primary
                                : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // Comments button
                InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => _CommentThreadScreen(post: post),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Row(
                      children: [
                        const Icon(Icons.comment_outlined,
                            size: 18, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          '${post.commentCount}',
                          style: const TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else if (diff.inDays < 7) {
        return '${diff.inDays}d ago';
      }
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}

/// Bottom sheet for creating a new post.
class _CreatePostSheet extends ConsumerStatefulWidget {
  final String communityId;

  const _CreatePostSheet({required this.communityId});

  @override
  ConsumerState<_CreatePostSheet> createState() => _CreatePostSheetState();
}

class _CreatePostSheetState extends ConsumerState<_CreatePostSheet> {
  final _contentController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Create Post',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _contentController,
            decoration: const InputDecoration(
              hintText: 'What would you like to share?',
              border: OutlineInputBorder(),
            ),
            maxLines: 5,
            minLines: 3,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _createPost,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Post'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _createPost() async {
    final content = _contentController.text.trim();
    if (content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write something')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final success = await ref
        .read(communityPostsProvider(widget.communityId).notifier)
        .createPost(widget.communityId, content);

    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Post created')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to create post')),
        );
      }
    }
  }
}

/// Screen showing the comment thread for a post (nested 1 level).
class _CommentThreadScreen extends ConsumerStatefulWidget {
  final CommunityPost post;

  const _CommentThreadScreen({required this.post});

  @override
  ConsumerState<_CommentThreadScreen> createState() =>
      _CommentThreadScreenState();
}

class _CommentThreadScreenState
    extends ConsumerState<_CommentThreadScreen> {
  final _commentController = TextEditingController();
  bool _isSubmitting = false;
  String? _replyingToId;
  String? _replyingToUsername;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final commentsAsync = ref.watch(postCommentsProvider(widget.post.id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Comments'),
      ),
      body: Column(
        children: [
          // Post summary at top
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest
                  .withValues(alpha: 0.3),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.post.username,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(widget.post.content, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
          const Divider(height: 1),
          // Comments list
          Expanded(
            child: commentsAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (_, __) => const Center(
                child: Text('Failed to load comments'),
              ),
              data: (comments) {
                if (comments.isEmpty) {
                  return const Center(
                    child: Text('No comments yet. Be the first!'),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: comments.length,
                  itemBuilder: (context, index) {
                    final comment = comments[index];
                    return _CommentTile(
                      comment: comment,
                      onReply: () => _setReplyTarget(comment),
                    );
                  },
                );
              },
            ),
          ),
          // Reply indicator
          if (_replyingToId != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: theme.colorScheme.surfaceContainerHighest,
              child: Row(
                children: [
                  Text(
                    'Replying to $_replyingToUsername',
                    style: theme.textTheme.bodySmall,
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: _clearReplyTarget,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
          // Comment input
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: InputDecoration(
                      hintText: _replyingToId != null
                          ? 'Write a reply...'
                          : 'Write a comment...',
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                    maxLines: 3,
                    minLines: 1,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _isSubmitting ? null : _submitComment,
                  icon: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _setReplyTarget(PostComment comment) {
    setState(() {
      _replyingToId = comment.id;
      _replyingToUsername = comment.username;
    });
  }

  void _clearReplyTarget() {
    setState(() {
      _replyingToId = null;
      _replyingToUsername = null;
    });
  }

  Future<void> _submitComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) return;

    setState(() => _isSubmitting = true);

    final success = await ref
        .read(postCommentsProvider(widget.post.id).notifier)
        .addComment(widget.post.id, content, parentId: _replyingToId);

    setState(() => _isSubmitting = false);

    if (success) {
      _commentController.clear();
      _clearReplyTarget();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to add comment')),
      );
    }
  }
}

/// Tile widget for a single comment with nested replies (1 level).
class _CommentTile extends StatelessWidget {
  final PostComment comment;
  final VoidCallback onReply;

  const _CommentTile({required this.comment, required this.onReply});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Main comment
          _buildCommentContent(context, theme, comment, showReplyButton: true),
          // Nested replies (1 level deep)
          if (comment.replies.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 32, top: 8),
              child: Column(
                children: comment.replies.map((reply) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _buildCommentContent(context, theme, reply,
                        showReplyButton: false),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCommentContent(
    BuildContext context,
    ThemeData theme,
    PostComment commentData, {
    required bool showReplyButton,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: theme.colorScheme.secondaryContainer,
          child: Text(
            commentData.username.isNotEmpty
                ? commentData.username[0].toUpperCase()
                : '?',
            style: TextStyle(
              fontSize: 12,
              color: theme.colorScheme.onSecondaryContainer,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    commentData.username,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _formatDate(commentData.createdAt),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(commentData.content, style: theme.textTheme.bodyMedium),
              if (showReplyButton)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: InkWell(
                    onTap: onReply,
                    child: Text(
                      'Reply',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else if (diff.inDays < 7) {
        return '${diff.inDays}d ago';
      }
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}
