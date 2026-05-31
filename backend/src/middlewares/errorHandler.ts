import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

/**
 * Global error handler middleware.
 * - Handles AppError instances with their status code and client message.
 * - Handles Zod validation errors with a generic message (no field details exposed).
 * - Handles unknown errors with a generic 500 response.
 * - Logs all errors via Winston (no internal details exposed to client).
 * - Returns consistent { success: false, error: { message } } envelope.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle operational AppError instances
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      statusCode: err.statusCode,
      message: err.message,
      method: req.method,
      path: req.originalUrl,
      stack: err.stack,
    });

    res.status(err.statusCode).json({
      success: false,
      error: { message: err.clientMessage },
    });
    return;
  }

  // Handle Zod validation errors — never expose which field failed
  if (err instanceof ZodError) {
    logger.warn('Validation error', {
      method: req.method,
      path: req.originalUrl,
      issues: err.issues,
    });

    res.status(400).json({
      success: false,
      error: { message: 'Invalid request data' },
    });
    return;
  }

  // Unknown/programming error — log at error level, expose nothing
  logger.error('Unexpected error', {
    message: err.message,
    method: req.method,
    path: req.originalUrl,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: { message: 'An unexpected error occurred.' },
  });
};
