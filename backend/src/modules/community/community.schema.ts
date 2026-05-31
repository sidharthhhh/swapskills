import { z } from 'zod';

/**
 * Zod schemas for community module validation.
 */

// POST /community/:id/posts — create a post in a community
export const createPostSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

// POST /community/posts/:id/comments — add a comment to a post
export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
  parentId: z.coerce.number().int().positive().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
