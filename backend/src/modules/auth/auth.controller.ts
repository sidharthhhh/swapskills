import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import type { RegisterInput, LoginInput, RefreshInput, LogoutInput, RecoverInput } from './auth.schema';

/**
 * Auth controller — handles request/response formatting.
 * All responses use the { success, data } or { success, error } envelope.
 */

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { password } = req.body as RegisterInput;
    const result = await authService.register(password);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        recoveryKey: result.recoveryKey,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body as LoginInput;
    const result = await authService.login(username, password);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as LogoutInput;
    const accessToken = req.headers.authorization?.replace('Bearer ', '') || '';

    await authService.logout(accessToken, refreshToken);

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshInput;
    const result = await authService.refresh(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function recover(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, recoveryKey } = req.body as RecoverInput;
    const result = await authService.recover(username, recoveryKey);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        recoveryKey: result.newRecoveryKey,
      },
    });
  } catch (err) {
    next(err);
  }
}
