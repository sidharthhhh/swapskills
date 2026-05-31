import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Redis client instance using ioredis.
 * Used for rate limiting, caching, and token revocation.
 */
const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times: number) {
    if (times > 10) {
      return null; // Stop retrying after 10 attempts
    }
    return Math.min(times * 200, 2000);
  },
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

export { redisClient };
