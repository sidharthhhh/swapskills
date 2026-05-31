import { redisClient } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Socket.IO rate limiter using Redis sliding window.
 * Limits: 30 events per 10 seconds per user.
 */

const MAX_EVENTS = 30;
const WINDOW_SECONDS = 10;

/**
 * Check if a user has exceeded the rate limit for socket events.
 * Uses a Redis key with TTL to track event count per user.
 *
 * @param userId - The user's numeric ID
 * @returns true if the event is allowed, false if rate limited
 */
export async function checkSocketRateLimit(userId: number): Promise<boolean> {
  const key = `socket_rate:${userId}`;

  try {
    const current = await redisClient.incr(key);

    // Set TTL on first event in the window
    if (current === 1) {
      await redisClient.expire(key, WINDOW_SECONDS);
    }

    if (current > MAX_EVENTS) {
      logger.warn('Socket rate limit exceeded', { userId, count: current });
      return false;
    }

    return true;
  } catch (err) {
    // If Redis is unavailable, allow the event (fail open)
    logger.error('Socket rate limiter Redis error', {
      userId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return true;
  }
}
