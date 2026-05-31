import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import * as notificationsModel from './notifications.model';
import type { NotificationType } from './notifications.model';

/**
 * Notifications service — business logic for notification records.
 * Push notifications (FCM) have been removed. This module only manages
 * database notification records.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaginatedNotifications {
  notifications: notificationsModel.NotificationRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Create Notification ─────────────────────────────────────────────────────

/**
 * Create a notification record in the database.
 * This function is exported for use by other modules.
 */
export async function createNotification(
  userId: number,
  type: NotificationType,
  payload: object
): Promise<void> {
  await notificationsModel.createNotification(userId, type, payload);
  logger.info('Notification created', { userId, type });
}

// ─── List Notifications ──────────────────────────────────────────────────────

/**
 * Get paginated notifications for a user.
 * Ordered by created_at descending.
 */
export async function listNotifications(
  userId: number,
  page: number,
  limit: number
): Promise<PaginatedNotifications> {
  const offset = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    notificationsModel.findNotificationsByUser(userId, limit, offset),
    notificationsModel.countNotificationsByUser(userId),
  ]);

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Mark Read ───────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 * Verifies the notification belongs to the requesting user (IDOR prevention).
 */
export async function markAsRead(notificationId: number, userId: number): Promise<void> {
  const notification = await notificationsModel.findNotificationById(notificationId);

  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  if (notification.user_id !== userId) {
    throw new AppError(403, 'Access denied');
  }

  await notificationsModel.markAsRead(notificationId);
  logger.info('Notification marked as read', { notificationId, userId });
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: number): Promise<void> {
  await notificationsModel.markAllAsRead(userId);
  logger.info('All notifications marked as read', { userId });
}

export type { NotificationType };
