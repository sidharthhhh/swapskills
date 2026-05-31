import { z } from 'zod';

/**
 * Zod schemas for notifications module validation.
 */

// Query params for GET /notifications (pagination)
export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
