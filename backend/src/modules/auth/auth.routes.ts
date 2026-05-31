import { Router } from 'express';
import { authLimiter } from '../../middlewares/rateLimiter';
import { validate } from '../../middlewares/validate';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  recoverSchema,
} from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

// POST /api/auth/register
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/logout
router.post('/logout', validate(logoutSchema), authController.logout);

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), authController.refresh);

// POST /api/auth/recover
router.post('/recover', validate(recoverSchema), authController.recover);

export default router;
