import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_secret_change_me';

export interface AdminUser {
  id: number;
  username: string;
  role: 'super_admin' | 'moderator' | 'analyst';
}

interface AdminTokenPayload {
  sub: number;
  username: string;
  role: 'super_admin' | 'moderator' | 'analyst';
}

/**
 * Role-based access control configuration.
 * Defines which route prefixes each role can access.
 *
 * - super_admin: full access to everything
 * - moderator: users, reports, posts, matches — NO analytics, NO settings, NO audit-log
 * - analyst: dashboard stats, skills analytics, reputation outliers — READ ONLY, no actions
 */
const ROLE_ACCESS: Record<string, string[]> = {
  super_admin: ['*'],
  moderator: ['users', 'reports', 'posts', 'matches'],
  analyst: ['dashboard', 'skills', 'reputation'],
};

/**
 * HTTP methods considered as state-changing (write) operations.
 */
const WRITE_METHODS = new Set(['PUT', 'POST', 'DELETE', 'PATCH']);

/**
 * Determine the route category from the request path.
 * Extracts the first segment after the admin router mount point.
 * e.g., /dashboard/stats -> dashboard, /users/:id/status -> users, /audit-log -> audit-log
 */
function getRouteCategory(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[0] || '';
}

/**
 * Check if a role has access to a given route category.
 */
function hasAccess(role: string, category: string): boolean {
  const permissions = ROLE_ACCESS[role];
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return permissions.includes(category);
}

/**
 * Admin authentication middleware.
 * 1. Verifies admin JWT from Authorization header (HS256, signed with ADMIN_JWT_SECRET)
 * 2. Attaches admin user info to request (id, username, role)
 * 3. Enforces role-based access control:
 *    - super_admin: full access
 *    - moderator: users, reports, posts, matches — no analytics/settings/audit-log
 *    - analyst: dashboard, skills, reputation — READ ONLY (no state-changing actions)
 */
export function adminAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    // 1. Extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Admin auth failed: missing or malformed Authorization header', {
        ip: req.ip,
        path: req.path,
      });
      throw new AppError(401, 'Admin authentication required');
    }

    const token = authHeader.slice(7);

    // 2. Verify token using HS256
    let payload: AdminTokenPayload;
    try {
      payload = jwt.verify(token, ADMIN_JWT_SECRET, {
        algorithms: ['HS256'],
      }) as unknown as AdminTokenPayload;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token verification failed';
      logger.warn('Admin auth failed: token verification error', {
        reason: message,
        ip: req.ip,
        path: req.path,
      });
      throw new AppError(401, 'Admin authentication required');
    }

    // 3. Attach admin user to request
    const adminUser: AdminUser = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    // 4. Role-based access check
    const category = getRouteCategory(req.path);
    if (!hasAccess(adminUser.role, category)) {
      logger.warn('Admin auth failed: insufficient permissions', {
        adminId: adminUser.id,
        role: adminUser.role,
        category,
        path: req.path,
      });
      throw new AppError(403, 'Insufficient permissions');
    }

    // 5. Analyst role is READ ONLY — block any state-changing requests
    if (adminUser.role === 'analyst' && WRITE_METHODS.has(req.method)) {
      logger.warn('Admin auth failed: analyst role is read-only', {
        adminId: adminUser.id,
        method: req.method,
        path: req.path,
      });
      throw new AppError(403, 'Insufficient permissions');
    }

    // Attach admin user to request
    (req as any).adminUser = adminUser;

    logger.debug('Admin auth success', {
      adminId: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      path: req.path,
    });

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      logger.error('Admin auth failed: unexpected error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        ip: req.ip,
        path: req.path,
      });
      next(new AppError(401, 'Admin authentication required'));
    }
  }
}
