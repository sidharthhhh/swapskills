import prisma from '../../config/prisma';

/**
 * Database access layer for auth module using Prisma.
 */

// ─── User Queries ────────────────────────────────────────────────────────────

export async function createUser(
  uid: string,
  username: string,
  passwordHash: string
) {
  return prisma.user.create({
    data: {
      uid,
      username,
      password_hash: passwordHash,
      trust_score: 100.00,
      status: 'active',
    },
  });
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: { id: true, uid: true, username: true, password_hash: true, trust_score: true, status: true },
  });
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, uid: true, username: true, password_hash: true, trust_score: true, status: true },
  });
}

export async function findUserByUid(uid: string) {
  return prisma.user.findUnique({
    where: { uid },
    select: { id: true, uid: true, username: true, password_hash: true, trust_score: true, status: true },
  });
}

export async function usernameExists(username: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return user !== null;
}

// ─── Recovery Key Queries ────────────────────────────────────────────────────

export async function createRecoveryKey(
  userId: number,
  keyHash: string
) {
  return prisma.recoveryKey.create({
    data: {
      user_id: userId,
      key_hash: keyHash,
      is_active: true,
    },
  });
}

export async function getActiveRecoveryKeys(userId: number) {
  return prisma.recoveryKey.findMany({
    where: { user_id: userId, is_active: true },
  });
}

export async function markRecoveryKeyUsed(keyId: number) {
  return prisma.recoveryKey.update({
    where: { id: keyId },
    data: { is_active: false },
  });
}

// ─── Refresh Token Queries ───────────────────────────────────────────────────

export async function createRefreshToken(
  userId: number,
  tokenHash: string,
  expiresAt: Date
) {
  return prisma.refreshToken.create({
    data: {
      user_id: userId,
      token: tokenHash,
      expires_at: expiresAt,
    },
  });
}

export async function findRefreshTokenByHash(tokenHash: string) {
  return prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });
}

export async function revokeRefreshToken(tokenId: number) {
  // We don't have a revoked column in Prisma schema, we just delete it.
  // Alternatively, if we need it, we can delete the token.
  return prisma.refreshToken.delete({
    where: { id: tokenId },
  });
}

export async function revokeAllUserRefreshTokens(userId: number) {
  return prisma.refreshToken.deleteMany({
    where: { user_id: userId },
  });
}
