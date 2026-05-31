import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { createPostSchema, createCommentSchema } from './community.schema';
import * as communityController from './community.controller';

const router = Router();

// GET /api/v1/community/trending — top 10 trending posts (public)
router.get('/trending', communityController.getTrendingPosts);

// GET /api/v1/community — list all communities (public)
router.get('/', communityController.listCommunities);

// GET /api/v1/community/:id/posts — paginated posts for a community (public, auth optional for block filtering)
router.get('/:id/posts', communityController.getCommunityPosts);

// POST /api/v1/community/:id/posts — create a post (auth required)
router.post('/:id/posts', authenticate, validate(createPostSchema), communityController.createPost);

// POST /api/v1/community/posts/:id/upvote — upvote a post (auth required)
router.post('/posts/:id/upvote', authenticate, communityController.upvotePost);

// POST /api/v1/community/posts/:id/comments — add a comment (auth required)
router.post('/posts/:id/comments', authenticate, validate(createCommentSchema), communityController.addComment);

// GET /api/v1/community/posts/:id/comments — get comments for a post (public)
router.get('/posts/:id/comments', communityController.getPostComments);

// POST /api/v1/community/comments/:id/upvote — upvote a comment (auth required)
router.post('/comments/:id/upvote', authenticate, communityController.upvoteComment);

// DELETE /api/v1/community/posts/:id — delete own post (auth required)
router.delete('/posts/:id', authenticate, communityController.deletePost);

export default router;
