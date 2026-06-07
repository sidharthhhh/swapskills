import { logger } from '../config/logger';

/**
 * Socket.IO rate limiter using memory.
 * Limits: 30 events per 10 seconds per user.
 */

const MAX_EVENTS = 30;
const WINDOW_SECONDS = 10;
const memoryStore = new Map<string, { count: number, resetAt: number }>();

/**
 * Check if a user has exceeded the rate limit for socket events.
 * Uses a memory map with TTL to track event count per user.
 *
 * @param userId - The user's numeric ID
 * @returns true if the event is allowed, false if rate limited
 */
export async function checkSocketRateLimit(userId: number): Promise<boolean> {
  const key = `socket_rate:${userId}`;
  const now = Date.now();

  try {
    let current = memoryStore.get(key);

    if (!current || now > current.resetAt) {
      current = { count: 1, resetAt: now + WINDOW_SECONDS * 1000 };
      memoryStore.set(key, current);
    } else {
      current.count++;
    }

    if (current.count > MAX_EVENTS) {
      logger.warn('Socket rate limit exceeded', { userId, count: current.count });
      return false;
    }

    // Optional: cleanup old entries periodically (not shown for brevity)
    return true;
  } catch (err) {
    logger.error('Socket rate limiter memory error', {
      userId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return true;
  }
}
