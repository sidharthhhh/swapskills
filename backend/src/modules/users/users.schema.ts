import { z } from 'zod';

/**
 * Zod schemas for users module validation.
 */

// Profile update schema
export const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  availability: z.enum(['weekdays', 'weekends', 'flexible']).optional(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Skill add schema
export const addSkillSchema = z.object({
  skillId: z.coerce.number().int().positive(),
});

export type AddSkillInput = z.infer<typeof addSkillSchema>;

// Report schema
export const createReportSchema = z.object({
  targetType: z.enum(['user', 'post', 'comment', 'message', 'match']),
  targetId: z.number().int().positive(),
  reason: z.enum(['spam', 'harassment', 'ghosting', 'inappropriate', 'other']),
  detail: z.string().max(1000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
