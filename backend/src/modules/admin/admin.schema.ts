import { z } from 'zod';

/**
 * Admin login schema
 */
export const adminLoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

/**
 * Update user status schema
 */
export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned', 'cooldown']),
  reason: z.string().min(1).max(500),
});

/**
 * Resolve report schema
 */
export const resolveReportSchema = z.object({
  resolution: z.enum(['dismiss', 'remove_content', 'suspend_user']),
  notes: z.string().max(1000).optional(),
});

/**
 * Pagination query schema (used for query params validation)
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * User list filter schema
 */
export const userListFilterSchema = paginationSchema.extend({
  status: z.enum(['active', 'suspended', 'banned', 'cooldown']).optional(),
  trust_min: z.coerce.number().min(0).optional(),
  trust_max: z.coerce.number().max(200).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().max(100).optional(),
});

/**
 * Audit log filter schema
 */
export const auditLogFilterSchema = paginationSchema.extend({
  admin_id: z.coerce.number().int().positive().optional(),
  action: z.string().max(100).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

/**
 * Match list filter schema
 */
export const matchListFilterSchema = paginationSchema.extend({
  status: z.enum(['active', 'completed', 'stalled', 'ghosted']).optional(),
});

/**
 * Report list filter schema
 */
export const reportListFilterSchema = paginationSchema.extend({
  status: z.enum(['open', 'in_review', 'resolved', 'dismissed']).optional(),
});

/**
 * Post list filter schema
 */
export const postListFilterSchema = paginationSchema.extend({
  status: z.enum(['active', 'removed', 'flagged']).optional(),
});

/**
 * Add skill schema
 */
export const addSkillSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  category: z.enum(['programming', 'devops', 'cloud', 'ai_ml', 'design', 'business', 'languages', 'finance', 'productivity', 'career']),
});
