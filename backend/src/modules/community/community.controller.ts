import { Request, Response, NextFunction } from 'express';
import * as communityService from './community.service';

/**
 * Community controller — handles request/response formatting.
 * All responses use the { success, data } envelope.
 */

/**
 * GET /api/v1/community — list all communities.
 */
export async function listCommunities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const communities = await communityService.listCommunities();

    res.status(200).json({
      success: true,
      data: communities,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/community/:id/posts — paginated posts for a community.
 */
export async function getCommunityPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const communityId = parseInt(req.params.id as string, 10);
    if (isNaN(communityId) || communityId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid community ID' } });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const userId = (req as any).user?.id || null;

    const result = await communityService.getCommunityPosts(communityId, userId, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/community/:id/posts — create a post in a community.
 */
export async function createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const communityId = parseInt(req.params.id as string, 10);
    if (isNaN(communityId) || communityId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid community ID' } });
      return;
    }

    const userId = (req as any).user.id;
    const { content } = req.body;

    const result = await communityService.createPost(communityId, userId, content);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/community/posts/:id/upvote — upvote a post.
 */
export async function upvotePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const postId = parseInt(req.params.id as string, 10);
    if (isNaN(postId) || postId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid post ID' } });
      return;
    }

    const userId = (req as any).user.id;
    await communityService.upvotePost(postId, userId);

    res.status(200).json({
      success: true,
      data: { message: 'Post upvoted' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/community/posts/:id/comments — add a comment to a post.
 */
export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const postId = parseInt(req.params.id as string, 10);
    if (isNaN(postId) || postId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid post ID' } });
      return;
    }

    const userId = (req as any).user.id;
    const { content, parentId } = req.body;

    const result = await communityService.addComment(postId, userId, content, parentId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/community/comments/:id/upvote — upvote a comment.
 */
export async function upvoteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const commentId = parseInt(req.params.id as string, 10);
    if (isNaN(commentId) || commentId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid comment ID' } });
      return;
    }

    const userId = (req as any).user.id;
    await communityService.upvoteComment(commentId, userId);

    res.status(200).json({
      success: true,
      data: { message: 'Comment upvoted' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/community/posts/:id — delete own post.
 */
export async function deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const postId = parseInt(req.params.id as string, 10);
    if (isNaN(postId) || postId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid post ID' } });
      return;
    }

    const userId = (req as any).user.id;
    await communityService.deletePost(postId, userId);

    res.status(200).json({
      success: true,
      data: { message: 'Post deleted' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/community/posts/:id/comments — get comments for a post.
 */
export async function getPostComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const postId = parseInt(req.params.id as string, 10);
    if (isNaN(postId) || postId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid post ID' } });
      return;
    }

    const userId = (req as any).user?.id || null;
    const comments = await communityService.getPostComments(postId, userId);

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/community/trending — get top 10 trending posts.
 */
export async function getTrendingPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const posts = await communityService.getTrendingPosts();

    res.status(200).json({
      success: true,
      data: posts,
    });
  } catch (err) {
    next(err);
  }
}
