import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis';

/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 * Uses Redis store for distributed rate limiting.
 */
export const globalLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - ioredis call signature is compatible at runtime
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'rl:global:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later.' } },
});

/**
 * Auth rate limiter: 10 requests per 15 minutes per IP.
 * Applied to authentication endpoints to prevent brute-force attacks.
 * Uses Redis store for distributed rate limiting.
 */
export const authLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - ioredis call signature is compatible at runtime
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many authentication attempts, please try again later.' } },
});
