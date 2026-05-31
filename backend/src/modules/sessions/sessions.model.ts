import { query } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Database access layer for sessions module.
 * All queries use parameterized SQL to prevent injection.
 * IDOR prevention: verify match participant before allowing operations.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface SessionRow extends RowDataPacket {
  id: number;
  match_id: number;
  teacher_id: number;
  learner_id: number;
  skill_id: number;
  scheduled_at: Date;
  duration_min: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  created_at: Date;
}

export interface SessionNoteRow extends RowDataPacket {
  id: number;
  session_id: number;
  user_id: number;
  content: string;
  created_at: Date;
  username: string;
}

export interface MatchParticipantRow extends RowDataPacket {
  id: number;
  user_a_id: number;
  user_b_id: number;
}

// ─── Match Verification (IDOR Prevention) ────────────────────────────────────

/**
 * Verify that a user is a participant of the given match.
 * Returns the match row if the user is a participant, null otherwise.
 */
export async function verifyMatchParticipant(
  matchId: number,
  userId: number
): Promise<MatchParticipantRow | null> {
  const rows = await query<MatchParticipantRow[]>(
    `SELECT id, user_a_id, user_b_id FROM matches
     WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)`,
    [matchId, userId, userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ─── Session Queries ─────────────────────────────────────────────────────────

/**
 * Create a new session.
 */
export async function createSession(
  matchId: number,
  teacherId: number,
  learnerId: number,
  skillId: number,
  scheduledAt: string,
  durationMin: number
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO sessions (match_id, teacher_id, learner_id, skill_id, scheduled_at, duration_min)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [matchId, teacherId, learnerId, skillId, scheduledAt, durationMin]
  );
}

/**
 * Get all sessions for a specific match.
 * IDOR prevention is handled at the service layer by verifying match participation first.
 */
export async function getSessionsByMatchId(matchId: number): Promise<SessionRow[]> {
  return query<SessionRow[]>(
    `SELECT id, match_id, teacher_id, learner_id, skill_id, scheduled_at, duration_min, status, created_at
     FROM sessions
     WHERE match_id = ?
     ORDER BY scheduled_at DESC`,
    [matchId]
  );
}

/**
 * Get a session by ID.
 */
export async function getSessionById(sessionId: number): Promise<SessionRow | null> {
  const rows = await query<SessionRow[]>(
    `SELECT id, match_id, teacher_id, learner_id, skill_id, scheduled_at, duration_min, status, created_at
     FROM sessions
     WHERE id = ?`,
    [sessionId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Update session status.
 */
export async function updateSessionStatus(
  sessionId: number,
  status: 'completed' | 'cancelled' | 'no_show'
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `UPDATE sessions SET status = ? WHERE id = ?`,
    [status, sessionId]
  );
}

// ─── Session Notes Queries ───────────────────────────────────────────────────

/**
 * Add a note to a session.
 */
export async function createSessionNote(
  sessionId: number,
  userId: number,
  content: string
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO session_notes (session_id, user_id, content)
     VALUES (?, ?, ?)`,
    [sessionId, userId, content]
  );
}

/**
 * Get all notes for a session, with the author's username.
 */
export async function getNotesBySessionId(sessionId: number): Promise<SessionNoteRow[]> {
  return query<SessionNoteRow[]>(
    `SELECT sn.id, sn.session_id, sn.user_id, sn.content, sn.created_at,
       u.username
     FROM session_notes sn
     JOIN users u ON u.id = sn.user_id
     WHERE sn.session_id = ?
     ORDER BY sn.created_at ASC`,
    [sessionId]
  );
}
