import { query } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Database access layer for auth module.
 * All queries use parameterized SQL to prevent injection.
 */

// ─── User Queries ────────────────────────────────────────────────────────────

export interface UserRow extends RowDataPacket {
  id: number;
  uid: string;
  username: string;
  password_hash: string;
  trust_score: number;
  status: string;
}

export async function createUser(
  uid: string,
  username: string,
  passwordHash: string
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO users (uid, username, password_hash, trust_score, status)
     VALUES (?, ?, ?, 100.00, 'active')`,
    [uid, username, passwordHash]
  );
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>(
    'SELECT id, uid, username, password_hash, trust_score, status FROM users WHERE username = ?',
    [username]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const rows = await query<UserRow[]>(
    'SELECT id, uid, username, password_hash, trust_score, status FROM users WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function findUserByUid(uid: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>(
    'SELECT id, uid, username, password_hash, trust_score, status FROM users WHERE uid = ?',
    [uid]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function usernameExists(username: string): Promise<boolean> {
  const rows = await query<RowDataPacket[]>(
    'SELECT 1 FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  return rows.length > 0;
}

// ─── Recovery Key Queries ────────────────────────────────────────────────────

export interface RecoveryKeyRow extends RowDataPacket {
  id: number;
  user_id: number;
  key_hash: string;
  used: boolean;
}

export async function createRecoveryKey(
  userId: number,
  keyHash: string
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'INSERT INTO recovery_keys (user_id, key_hash, used) VALUES (?, ?, FALSE)',
    [userId, keyHash]
  );
}

export async function getActiveRecoveryKeys(userId: number): Promise<RecoveryKeyRow[]> {
  return query<RecoveryKeyRow[]>(
    'SELECT id, user_id, key_hash, used FROM recovery_keys WHERE user_id = ? AND used = FALSE',
    [userId]
  );
}

export async function markRecoveryKeyUsed(keyId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'UPDATE recovery_keys SET used = TRUE WHERE id = ?',
    [keyId]
  );
}

// ─── Refresh Token Queries ───────────────────────────────────────────────────

export interface RefreshTokenRow extends RowDataPacket {
  id: number;
  user_id: number;
  token_hash: string;
  revoked: boolean;
  expires_at: Date;
}

export async function createRefreshToken(
  userId: number,
  tokenHash: string,
  expiresAt: Date
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'INSERT INTO refresh_tokens (user_id, token_hash, revoked, expires_at) VALUES (?, ?, FALSE, ?)',
    [userId, tokenHash, expiresAt]
  );
}

export async function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
  const rows = await query<RefreshTokenRow[]>(
    'SELECT id, user_id, token_hash, revoked, expires_at FROM refresh_tokens WHERE token_hash = ?',
    [tokenHash]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function revokeRefreshToken(tokenId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?',
    [tokenId]
  );
}

export async function revokeAllUserRefreshTokens(userId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?',
    [userId]
  );
}
