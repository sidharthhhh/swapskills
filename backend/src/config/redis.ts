import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

const REDIS_URL = process.env.REDIS_URL;

/**
 * Redis client instance.
 * If REDIS_URL is not provided (e.g., local development without Redis),
 * it gracefully degrades to an in-memory mock using ioredis-mock.
 * Used for rate limiting, caching, and token revocation.
 */
const redisClient = REDIS_URL 
  ? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times: number) {
        if (times > 10) {
          return null; // Stop retrying after 10 attempts
        }
        return Math.min(times * 200, 2000);
      },
    })
  : new (RedisMock as any)();

redisClient.on('error', (err: any) => {
  console.error('[Redis] Connection error:', err.message);
});

redisClient.on('connect', () => {
  console.log(REDIS_URL ? '[Redis] Connected successfully' : '[Redis] Connected to in-memory mock');
});

export { redisClient };
