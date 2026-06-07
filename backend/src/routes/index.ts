import { Router, Request, Response } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import skillsRoutes from '../modules/skills/skills.routes';
import reputationRoutes from '../modules/reputation/reputation.routes';
import matchingRoutes from '../modules/matching/matching.routes';
import chatRoutes from '../modules/chat/chat.routes';
import communityRoutes from '../modules/community/community.routes';
import sessionsRoutes from '../modules/sessions/sessions.routes';
import adminRoutes from '../modules/admin/admin.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import prisma from '../config/prisma';
const router = Router();

// Health check endpoint — verifies DB connectivity
router.get('/health', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const allHealthy = dbStatus === 'connected';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ok' : 'degraded',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (no version prefix)
router.use('/auth', authRoutes);

// Versioned API routes
router.use('/v1/users', usersRoutes);
router.use('/v1/skills', skillsRoutes);
router.use('/v1/matches', matchingRoutes);
router.use('/v1/reputation', reputationRoutes);
router.use('/v1/chat', chatRoutes);
router.use('/v1/sessions', sessionsRoutes);
router.use('/v1/community', communityRoutes);
router.use('/v1/notifications', notificationsRoutes);
router.use('/v1/admin', adminRoutes);

export default router;
