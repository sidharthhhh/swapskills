import { query } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Database access layer for notifications module.
 * All queries use parameterized SQL to prevent injection.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export type NotificationType =
  | 'match_request'
  | 'match_accepted'
  | 'new_message'
  | 'community_reply'
  | 'reputation_update'
  | 'session_reminder'
  | 'endorsement_received';

export interface NotificationRow extends RowDataPacket {
  id: number;
  user_id: number;
  type: NotificationType;
  payload: object;
  read_at: Date | null;
  created_at: Date;
}

// ─── Notification Queries ────────────────────────────────────────────────────

/**
 * Insert a new notification record.
 */
export async function createNotification(
  userId: number,
  type: NotificationType,
  payload: object
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)`,
    [userId, type, JSON.stringify(payload)]
  );
}

/**
 * Fetch paginated notifications for a user.
 * Ordered: unread first, then by created_at descending.
 */
export async function findNotificationsByUser(
  userId: number,
  limit: number,
  offset: number
): Promise<NotificationRow[]> {
  const sql = `
    SELECT id, user_id, type, payload, read_at, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY read_at IS NOT NULL ASC, created_at DESC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;
  return query<NotificationRow[]>(sql, [userId]);
}

/**
 * Count total notifications for a user (for pagination metadata).
 */
export async function countNotificationsByUser(userId: number): Promise<number> {
  const rows = await query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?',
    [userId]
  );
  return Number(rows[0].total);
}

/**
 * Find a notification by ID.
 */
export async function findNotificationById(notificationId: number): Promise<NotificationRow | null> {
  const rows = await query<NotificationRow[]>(
    'SELECT id, user_id, type, payload, read_at, created_at FROM notifications WHERE id = ?',
    [notificationId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'UPDATE notifications SET read_at = NOW() WHERE id = ? AND read_at IS NULL',
    [notificationId]
  );
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
    [userId]
  );
}


