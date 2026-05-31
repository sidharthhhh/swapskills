import { query } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Database access layer for reputation module.
 * All queries use parameterized SQL to prevent injection.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ReputationEventRow extends RowDataPacket {
  id: number;
  user_id: number;
  event_type: string;
  delta: number;
  note: string | null;
  created_at: Date;
}

export interface UserTrustRow extends RowDataPacket {
  id: number;
  trust_score: number;
  status: string;
  cooldown_until: Date | null;
}

export interface GhostCountRow extends RowDataPacket {
  ghost_count: number;
}

// ─── Reputation Event Queries ────────────────────────────────────────────────

/**
 * Record a reputation event for a user.
 */
export async function recordEvent(
  userId: number,
  eventType: string,
  delta: number,
  note?: string
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO reputation_events (user_id, event_type, delta, note)
     VALUES (?, ?, ?, ?)`,
    [userId, eventType, delta, note || null]
  );
}

/**
 * Get reputation event history for a user, ordered by most recent first.
 */
export async function getEventsByUserId(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<ReputationEventRow[]> {
  return query<ReputationEventRow[]>(
    `SELECT id, user_id, event_type, delta, note, created_at
     FROM reputation_events
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    [userId]
  );
}

// ─── Trust Score Queries ─────────────────────────────────────────────────────

/**
 * Get the current trust score and status for a user.
 */
export async function getUserTrust(userId: number): Promise<UserTrustRow | null> {
  const rows = await query<UserTrustRow[]>(
    `SELECT id, trust_score, status, cooldown_until
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Apply a delta to the user's trust score, clamping between 0 and 100.
 * Returns the new trust score.
 */
export async function applyDelta(userId: number, delta: number): Promise<number> {
  // Update trust_score clamped between 0 and 100
  await query<ResultSetHeader>(
    `UPDATE users
     SET trust_score = LEAST(100, GREATEST(0, trust_score + ?))
     WHERE id = ?`,
    [delta, userId]
  );

  // Fetch and return the new score
  const rows = await query<RowDataPacket[]>(
    `SELECT trust_score FROM users WHERE id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }

  return Number(rows[0].trust_score);
}

// ─── Ghost Count Queries ─────────────────────────────────────────────────────

/**
 * Count ghosting_penalty events for a user within the last N days.
 */
export async function countRecentGhosts(
  userId: number,
  windowDays: number
): Promise<number> {
  const rows = await query<GhostCountRow[]>(
    `SELECT COUNT(*) AS ghost_count
     FROM reputation_events
     WHERE user_id = ?
       AND event_type = 'ghosting_penalty'
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [userId, windowDays]
  );
  return rows.length > 0 ? Number(rows[0].ghost_count) : 0;
}

// ─── User Status Queries ─────────────────────────────────────────────────────

/**
 * Ban a user (set status to 'banned').
 */
export async function banUser(userId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `UPDATE users SET status = 'banned' WHERE id = ?`,
    [userId]
  );
}

/**
 * Apply cooldown to a user (set status to 'cooldown' and cooldown_until to NOW() + N days).
 */
export async function applyCooldown(
  userId: number,
  durationDays: number
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `UPDATE users
     SET status = 'cooldown',
         cooldown_until = DATE_ADD(NOW(), INTERVAL ? DAY)
     WHERE id = ?`,
    [durationDays, userId]
  );
}
