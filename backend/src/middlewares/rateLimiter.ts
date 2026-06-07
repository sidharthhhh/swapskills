import rateLimit from 'express-rate-limit';
/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 * Uses Redis store for distributed rate limiting.
 */
export const globalLimiter = rateLimit({
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many authentication attempts, please try again later.' } },
});
