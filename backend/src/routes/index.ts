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
import { pool } from '../config/database';
import { redisClient } from '../config/redis';

const router = Router();

// Health check endpoint — verifies DB and Redis connectivity
router.get('/health', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';

  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  try {
    const pong = await redisClient.ping();
    redisStatus = pong === 'PONG' ? 'connected' : 'disconnected';
  } catch {
    redisStatus = 'disconnected';
  }

  const allHealthy = dbStatus === 'connected' && redisStatus === 'connected';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ok' : 'degraded',
    db: dbStatus,
    redis: redisStatus,
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
