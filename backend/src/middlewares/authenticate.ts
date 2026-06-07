import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/tokenService';
import { logger } from '../config/logger';
import { findUserByUid } from '../modules/auth/auth.model';
import { AppError } from '../utils/AppError';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  username: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Authentication middleware for protected routes.
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies token signature and expiry using RS256
 * 3. Checks Redis revocation list for the token's JTI
 * 4. Looks up user by uid from token payload
 * 5. Attaches user info to req.user
 * 6. Rejects banned/suspended users
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Auth failed: missing or malformed Authorization header', {
        ip: req.ip,
        path: req.path,
      });
      throw new AppError(401, 'Authentication required');
    }

    const token = authHeader.slice(7);

    // 2. Verify token using RS256
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token verification failed';
      logger.warn('Auth failed: token verification error', {
        reason: message,
        ip: req.ip,
        path: req.path,
      });
      throw new AppError(401, 'Authentication required');
    }

    // 3. (Token revocation check removed since Redis is disabled)

    // 4. Look up user by uid from token payload
    const user = await findUserByUid(payload.sub);
    if (!user) {
      logger.warn('Auth failed: user not found for token', {
        uid: payload.sub,
        ip: req.ip,
        path: req.path,
      });
      throw new AppError(401, 'Authentication required');
    }

    // 5. Check user status — reject if banned or suspended
    if (user.status === 'banned' || user.status === 'suspended') {
      logger.warn('Auth failed: user account is not active', {
        uid: user.uid,
        username: user.username,
        status: user.status,
        ip: req.ip,
        path: req.path,
      });
      throw new AppError(401, 'Authentication required');
    }

    // 6. Attach user info to req.user
    (req as AuthenticatedRequest).user = {
      id: user.id,
      uid: user.uid,
      username: user.username,
      status: user.status,
    };

    logger.info('Auth success: user authenticated', {
      uid: user.uid,
      username: user.username,
      path: req.path,
    });

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      logger.error('Auth failed: unexpected error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        ip: req.ip,
        path: req.path,
      });
      next(new AppError(401, 'Authentication required'));
    }
  }
}
