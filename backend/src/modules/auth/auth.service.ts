import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { generateUsername } from '../../utils/generateUsername';
import { generateUserId } from '../../utils/generateUserId';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../utils/tokenService';
import { AppError } from '../../utils/AppError';
import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import * as authModel from './auth.model';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_REVOCATION_TTL = 15 * 60; // 15 minutes in seconds

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a recovery key in XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX format.
 * Uses first 32 hex chars from crypto.randomBytes(32), grouped into 8 groups of 4.
 */
function generateRecoveryKey(): { plaintext: string; hash: string } {
  const bytes = crypto.randomBytes(32);
  const hex = bytes.toString('hex'); // 64 hex chars
  const first32 = hex.slice(0, 32);
  const formatted = first32.match(/.{1,4}/g)!.join('-'); // XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  const hash = bcrypt.hashSync(formatted, SALT_ROUNDS);
  return { plaintext: formatted, hash };
}

/**
 * Hash a refresh token for storage (we never store plaintext tokens).
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Add an access token's JTI to the Redis revocation list.
 */
async function revokeAccessToken(token: string): Promise<void> {
  try {
    const payload = verifyToken(token);
    if (payload.jti) {
      await redisClient.set(`revoked:${payload.jti}`, '1', 'EX', ACCESS_TOKEN_REVOCATION_TTL);
    }
  } catch {
    // Token may already be expired — that's fine, no need to revoke
  }
}

// ─── Service Functions ───────────────────────────────────────────────────────

export interface RegisterResult {
  user: { uid: string; username: string };
  accessToken: string;
  refreshToken: string;
  recoveryKey: string;
}

export async function register(password: string): Promise<RegisterResult> {
  // Generate unique username
  const username = await generateUsername(async (candidate: string) => {
    return authModel.usernameExists(candidate);
  });

  // Generate unique user ID
  const uid = generateUserId();

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user in DB
  const result = await authModel.createUser(uid, username, passwordHash);
  const userId = result.insertId;

  // Generate recovery key
  const recoveryKey = generateRecoveryKey();
  await authModel.createRecoveryKey(userId, recoveryKey.hash);

  // Issue tokens
  const accessToken = generateAccessToken(uid);
  const refreshToken = generateRefreshToken(uid);

  // Store refresh token hash
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await authModel.createRefreshToken(userId, tokenHash, expiresAt);

  logger.info('User registered', { uid, username });

  return {
    user: { uid, username },
    accessToken,
    refreshToken,
    recoveryKey: recoveryKey.plaintext,
  };
}

export interface LoginResult {
  user: { uid: string; username: string };
  accessToken: string;
  refreshToken: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  // Find user — same error for "not found" and "wrong password"
  const user = await authModel.findUserByUsername(username);
  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  // Check if user is banned or suspended
  if (user.status === 'banned' || user.status === 'suspended') {
    throw new AppError(403, 'Account is not accessible');
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'Invalid credentials');
  }

  // Issue tokens
  const accessToken = generateAccessToken(user.uid);
  const refreshToken = generateRefreshToken(user.uid);

  // Store refresh token hash
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await authModel.createRefreshToken(user.id, tokenHash, expiresAt);

  logger.info('User logged in', { uid: user.uid });

  return {
    user: { uid: user.uid, username: user.username },
    accessToken,
    refreshToken,
  };
}

export async function logout(accessToken: string, refreshToken: string): Promise<void> {
  // Revoke access token in Redis
  await revokeAccessToken(accessToken);

  // Revoke refresh token in DB
  const tokenHash = hashToken(refreshToken);
  const storedToken = await authModel.findRefreshTokenByHash(tokenHash);
  if (storedToken) {
    await authModel.revokeRefreshToken(storedToken.id);
  }

  logger.info('User logged out');
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function refresh(oldRefreshToken: string): Promise<RefreshResult> {
  // Verify the token signature
  let payload;
  try {
    payload = verifyToken(oldRefreshToken);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const tokenHash = hashToken(oldRefreshToken);
  const storedToken = await authModel.findRefreshTokenByHash(tokenHash);

  if (!storedToken) {
    throw new AppError(401, 'Invalid refresh token');
  }

  // Replay detection: if token is already revoked, invalidate ALL tokens for this user
  if (storedToken.revoked) {
    await authModel.revokeAllUserRefreshTokens(storedToken.user_id);
    logger.warn('Refresh token replay detected, all tokens revoked', {
      userId: storedToken.user_id,
    });
    throw new AppError(401, 'Invalid refresh token');
  }

  // Check expiration
  if (new Date(storedToken.expires_at) < new Date()) {
    await authModel.revokeRefreshToken(storedToken.id);
    throw new AppError(401, 'Refresh token expired');
  }

  // Revoke old token
  await authModel.revokeRefreshToken(storedToken.id);

  // Issue new token pair
  const userId = payload.sub;
  const newAccessToken = generateAccessToken(userId);
  const newRefreshToken = generateRefreshToken(userId);

  // Store new refresh token hash
  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await authModel.createRefreshToken(storedToken.user_id, newTokenHash, expiresAt);

  logger.info('Token refreshed', { uid: userId });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export interface RecoverResult {
  user: { uid: string; username: string };
  accessToken: string;
  refreshToken: string;
  newRecoveryKey: string;
}

export async function recover(username: string, recoveryKey: string): Promise<RecoverResult> {
  // Find user
  const user = await authModel.findUserByUsername(username);
  if (!user) {
    throw new AppError(401, 'Invalid recovery credentials');
  }

  // Get active recovery keys for this user
  const keys = await authModel.getActiveRecoveryKeys(user.id);
  if (keys.length === 0) {
    throw new AppError(401, 'Invalid recovery credentials');
  }

  // Verify recovery key against stored hashes
  let matchedKey: typeof keys[0] | null = null;
  for (const key of keys) {
    const valid = await bcrypt.compare(recoveryKey, key.key_hash);
    if (valid) {
      matchedKey = key;
      break;
    }
  }

  if (!matchedKey) {
    throw new AppError(401, 'Invalid recovery credentials');
  }

  // Mark the used key as consumed
  await authModel.markRecoveryKeyUsed(matchedKey.id);

  // Revoke all existing refresh tokens for security
  await authModel.revokeAllUserRefreshTokens(user.id);

  // Generate a new recovery key
  const newRecoveryKey = generateRecoveryKey();
  await authModel.createRecoveryKey(user.id, newRecoveryKey.hash);

  // Issue new tokens
  const accessToken = generateAccessToken(user.uid);
  const refreshToken = generateRefreshToken(user.uid);

  // Store new refresh token
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await authModel.createRefreshToken(user.id, tokenHash, expiresAt);

  logger.info('Account recovered', { uid: user.uid });

  return {
    user: { uid: user.uid, username: user.username },
    accessToken,
    refreshToken,
    newRecoveryKey: newRecoveryKey.plaintext,
  };
}
