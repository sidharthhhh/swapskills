import { z } from 'zod';

/**
 * Zod schemas for matching module validation.
 */

// POST /request — send a match request
export const matchRequestSchema = z.object({
  receiverId: z.coerce.number().int().positive(),
  teachSkillId: z.coerce.number().int().positive(),
  learnSkillId: z.coerce.number().int().positive(),
});

export type MatchRequestInput = z.infer<typeof matchRequestSchema>;

// PUT /request/:id — accept or reject a match request
export const matchRequestActionSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

export type MatchRequestActionInput = z.infer<typeof matchRequestActionSchema>;

// POST /:id/endorse — endorse a partner after match completion
export const endorseSchema = z.object({
  skillId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
});

export type EndorseInput = z.infer<typeof endorseSchema>;
