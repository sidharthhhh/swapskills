import prisma from '../../config/prisma';

/**
 * Database access layer for notifications module using Prisma.
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

export interface NotificationRow {
  id: number;
  user_id: number;
  type: string;
  payload: any;
  read_at: Date | null;
  created_at: Date;
}

// ─── Notification Queries ────────────────────────────────────────────────────

export async function createNotification(
  userId: number,
  type: NotificationType,
  payload: object
) {
  const notif = await prisma.notification.create({
    data: {
      user_id: userId,
      type,
      payload: payload as any,
    }
  });
  return { insertId: notif.id };
}

export async function findNotificationsByUser(
  userId: number,
  limit: number,
  offset: number
): Promise<NotificationRow[]> {
  // Prisma orderBy doesn't directly support complex IS NOT NULL sort,
  // but we can sort by read_at ASC (nulls first usually, but Prisma puts nulls first in ascending)
  // Let's sort by read_at (nulls first in Prisma) then created_at DESC
  return prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: [
      { read_at: 'asc' }, // nulls first
      { created_at: 'desc' }
    ],
    skip: offset,
    take: limit,
  });
}

export async function countNotificationsByUser(userId: number): Promise<number> {
  return prisma.notification.count({ where: { user_id: userId } });
}

export async function findNotificationById(notificationId: number): Promise<NotificationRow | null> {
  return prisma.notification.findUnique({ where: { id: notificationId } });
}

export async function markAsRead(notificationId: number) {
  await prisma.notification.updateMany({
    where: { id: notificationId, read_at: null },
    data: { read_at: new Date() }
  });
  return { affectedRows: 1 };
}

export async function markAllAsRead(userId: number) {
  await prisma.notification.updateMany({
    where: { user_id: userId, read_at: null },
    data: { read_at: new Date() }
  });
  return { affectedRows: 1 };
}
