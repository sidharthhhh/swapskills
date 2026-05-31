import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as notificationsController from './notifications.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// GET /api/v1/notifications — list notifications (paginated)
router.get('/', notificationsController.listNotifications);

// PUT /api/v1/notifications/read-all — mark all notifications as read
// Note: This must be defined BEFORE /:id/read to avoid route conflicts
router.put('/read-all', notificationsController.markAllAsRead);

// PUT /api/v1/notifications/:id/read — mark single notification as read
router.put('/:id/read', notificationsController.markAsRead);

export default router;
