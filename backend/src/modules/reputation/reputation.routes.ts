import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { AppError } from '../../utils/AppError';
import * as reputationService from './reputation.service';

const router = Router();

/**
 * Reputation module routes.
 * Primarily an internal service consumed by other modules (matching, sessions, admin).
 * Exposes minimal routes for users to view their own reputation history.
 */

// All reputation routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/reputation/me
 * Get the authenticated user's reputation history and current trust score.
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(req as any).user) {
      throw new AppError(401, 'Authentication required');
    }

    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const [trustInfo, events] = await Promise.all([
      reputationService.getUserTrustInfo(userId),
      reputationService.getReputationHistory(userId, limit, offset),
    ]);

    if (!trustInfo) {
      throw new AppError(404, 'User not found');
    }

    res.status(200).json({
      trust_score: trustInfo.trust_score,
      status: trustInfo.status,
      cooldown_until: trustInfo.cooldown_until,
      events,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
