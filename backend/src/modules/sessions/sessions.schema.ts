import { z } from 'zod';

/**
 * Zod schemas for sessions module validation.
 */

// POST / — schedule a session
export const createSessionSchema = z.object({
  matchId: z.number().int().positive(),
  skillId: z.number().int().positive(),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  durationMin: z.number().int().min(15).max(180).optional().default(60),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

// PUT /:id/status — update session status
export const updateSessionStatusSchema = z.object({
  status: z.enum(['completed', 'cancelled', 'no_show']),
});

export type UpdateSessionStatusInput = z.infer<typeof updateSessionStatusSchema>;

// POST /:id/notes — add session notes
export const createSessionNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export type CreateSessionNoteInput = z.infer<typeof createSessionNoteSchema>;
