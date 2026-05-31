import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { sanitize } from '../../utils/sanitize';
import * as communityModel from './community.model';

/**
 * Community service — business logic for communities, posts, comments, and upvotes.
 */

// ─── Communities ─────────────────────────────────────────────────────────────

/**
 * List all communities.
 */
export async function listCommunities() {
  return communityModel.findAllCommunities();
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export interface PaginatedPosts {
  posts: communityModel.PostRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get paginated posts for a community.
 * Filters out posts from users blocked by the authenticated user.
 */
export async function getCommunityPosts(
  communityId: number,
  userId: number | null,
  page: number,
  limit: number
): Promise<PaginatedPosts> {
  const exists = await communityModel.communityExists(communityId);
  if (!exists) {
    throw new AppError(404, 'Community not found');
  }

  const offset = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    communityModel.findPostsByCommunity(communityId, userId, limit, offset),
    communityModel.countPostsByCommunity(communityId, userId),
  ]);

  return {
    posts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Create a new post in a community.
 */
export async function createPost(
  communityId: number,
  authorId: number,
  content: string
) {
  const exists = await communityModel.communityExists(communityId);
  if (!exists) {
    throw new AppError(404, 'Community not found');
  }

  const sanitizedContent = sanitize(content);
  const result = await communityModel.createPost(communityId, authorId, sanitizedContent);

  logger.info('Post created', {
    postId: result.insertId,
    communityId,
    authorId,
  });

  return { id: result.insertId };
}

/**
 * Delete a post. Only the author can delete their own post.
 */
export async function deletePost(postId: number, userId: number): Promise<void> {
  const post = await communityModel.findPostById(postId);
  if (!post || post.status === 'removed') {
    throw new AppError(404, 'Post not found');
  }

  if (post.author_id !== userId) {
    throw new AppError(403, 'You can only delete your own posts');
  }

  await communityModel.deletePost(postId);

  logger.info('Post deleted', { postId, userId });
}

// ─── Upvotes ─────────────────────────────────────────────────────────────────

/**
 * Upvote a post. Idempotent — duplicate votes are silently ignored.
 * Uses INSERT IGNORE to prevent duplicates; only increments counter if insert succeeds.
 */
export async function upvotePost(postId: number, userId: number): Promise<void> {
  const post = await communityModel.findPostById(postId);
  if (!post || post.status === 'removed') {
    throw new AppError(404, 'Post not found');
  }

  const result = await communityModel.insertPostVote(userId, postId);

  // Only increment if the vote was actually inserted (not a duplicate)
  if (result.affectedRows > 0) {
    await communityModel.incrementPostUpvotes(postId);
    logger.info('Post upvoted', { postId, userId });
  }
}

/**
 * Upvote a comment. Idempotent — increments counter directly.
 * Note: The schema doesn't have a comment_votes table, so we just increment.
 */
export async function upvoteComment(commentId: number, userId: number): Promise<void> {
  const comment = await communityModel.findCommentById(commentId);
  if (!comment || comment.status === 'removed') {
    throw new AppError(404, 'Comment not found');
  }

  await communityModel.incrementCommentUpvotes(commentId);
  logger.info('Comment upvoted', { commentId, userId });
}

// ─── Comments ────────────────────────────────────────────────────────────────

/**
 * Add a comment to a post.
 */
export async function addComment(
  postId: number,
  authorId: number,
  content: string,
  parentId?: number
) {
  const post = await communityModel.findPostById(postId);
  if (!post || post.status === 'removed') {
    throw new AppError(404, 'Post not found');
  }

  // Validate parent comment exists if parentId is provided
  if (parentId) {
    const parentComment = await communityModel.findCommentById(parentId);
    if (!parentComment || parentComment.post_id !== postId) {
      throw new AppError(400, 'Invalid parent comment');
    }
  }

  const sanitizedContent = sanitize(content);
  const result = await communityModel.createComment(
    postId,
    authorId,
    sanitizedContent,
    parentId || null
  );

  logger.info('Comment created', {
    commentId: result.insertId,
    postId,
    authorId,
  });

  return { id: result.insertId };
}

/**
 * Get comments for a post, filtering blocked users.
 */
export async function getPostComments(postId: number, userId: number | null) {
  const post = await communityModel.findPostById(postId);
  if (!post || post.status === 'removed') {
    throw new AppError(404, 'Post not found');
  }

  return communityModel.findCommentsByPost(postId, userId);
}

// ─── Trending ────────────────────────────────────────────────────────────────

/**
 * Get top 10 trending posts by upvotes from the last 7 days.
 */
export async function getTrendingPosts() {
  return communityModel.findTrendingPosts();
}
