import crypto from 'crypto';

/**
 * Generates a unique user ID in the format SKL-XXXXXX
 * where X is an alphanumeric character (0-9, A-Z).
 */
export function generateUserId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    const index = crypto.randomInt(chars.length);
    suffix += chars[index];
  }
  return `SKL-${suffix}`;
}
