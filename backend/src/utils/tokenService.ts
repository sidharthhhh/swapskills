import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const privateKeyPath = process.env.JWT_PRIVATE_KEY || './keys/private.pem';
const publicKeyPath = process.env.JWT_PUBLIC_KEY || './keys/public.pem';

let privateKey: string;
let publicKey: string;

/**
 * Lazily load the private key from the file system.
 */
function getPrivateKey(): string {
  if (!privateKey) {
    privateKey = fs.readFileSync(path.resolve(privateKeyPath), 'utf8');
  }
  return privateKey;
}

/**
 * Lazily load the public key from the file system.
 */
function getPublicKey(): string {
  if (!publicKey) {
    publicKey = fs.readFileSync(path.resolve(publicKeyPath), 'utf8');
  }
  return publicKey;
}

export interface TokenPayload extends JwtPayload {
  sub: string;
  jti: string;
  deviceId?: string;
}

/**
 * In-memory set of revoked JTIs.
 * Used instead of Redis for token revocation tracking.
 */
const revokedTokens: Set<string> = new Set();

/**
 * Generate a unique JTI (JWT ID) for token identification.
 */
function generateJti(): string {
  return crypto.randomUUID();
}

/**
 * Generate an RS256-signed access token (15 minute expiry).
 */
export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, jti: generateJti() }, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: '15m',
  });
}

/**
 * Generate an RS256-signed refresh token (7 day expiry).
 */
export function generateRefreshToken(userId: string, deviceId?: string): string {
  const payload: Record<string, string> = { sub: userId, jti: generateJti() };
  if (deviceId) {
    payload.deviceId = deviceId;
  }
  return jwt.sign(payload, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: '7d',
  });
}

/**
 * Verify an RS256-signed JWT and return the decoded payload.
 * Throws if the token is invalid, expired, or revoked.
 */
export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, getPublicKey(), {
    algorithms: ['RS256'],
  }) as TokenPayload;

  // Check if the token has been revoked
  if (payload.jti && isRevoked(payload.jti)) {
    throw new Error('Token has been revoked');
  }

  return payload;
}

/**
 * Revoke a token by adding its JTI to the in-memory revocation set.
 */
export function revokeToken(jti: string): void {
  revokedTokens.add(jti);
}

/**
 * Check if a token JTI has been revoked.
 */
export function isRevoked(jti: string): boolean {
  return revokedTokens.has(jti);
}
