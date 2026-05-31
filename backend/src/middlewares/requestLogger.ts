import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * HTTP request logging middleware using Winston.
 * Logs method, path, status code, and response time for every request.
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  // Listen for the response finish event to capture status code and timing
  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${duration}ms`,
    });
  });

  next();
};
