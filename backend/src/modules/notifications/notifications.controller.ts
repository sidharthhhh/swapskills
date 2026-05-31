import { Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service';

/**
 * Notifications controller — handles request/response formatting.
 * All responses use the { success, data } envelope.
 */

/**
 * GET /api/v1/notifications — list notifications for the authenticated user.
 */
export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await notificationsService.listNotifications(userId, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/notifications/:id/read — mark a single notification as read.
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notificationId = parseInt(req.params.id as string, 10);
    if (isNaN(notificationId) || notificationId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid notification ID' } });
      return;
    }

    const userId = (req as any).user.id;
    await notificationsService.markAsRead(notificationId, userId);

    res.status(200).json({
      success: true,
      data: { message: 'Notification marked as read' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/notifications/read-all — mark all notifications as read.
 */
export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    await notificationsService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (err) {
    next(err);
  }
}
