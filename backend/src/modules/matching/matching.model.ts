import { query, pool } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Database access layer for matching module.
 * All queries use parameterized SQL to prevent injection.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface SuggestionRow extends RowDataPacket {
  id: number;
  uid: string;
  username: string;
  trust_score: number;
  teach_skill_id: number;
  teach_skill_name: string;
  learn_skill_id: number;
  learn_skill_name: string;
}

export interface MatchRequestRow extends RowDataPacket {
  id: number;
  sender_id: number;
  receiver_id: number;
  teach_skill_id: number;
  learn_skill_id: number;
  status: string;
  created_at: Date;
  sender_username: string;
  receiver_username: string;
  teach_skill_name: string;
  learn_skill_name: string;
}

export interface MatchRow extends RowDataPacket {
  id: number;
  user_a_id: number;
  user_b_id: number;
  skill_a_teaches_b: number;
  skill_b_teaches_a: number;
  status: string;
  sessions_a: number;
  sessions_b: number;
  created_at: Date;
  user_a_username: string;
  user_b_username: string;
  skill_a_name: string;
  skill_b_name: string;
}

export interface EndorsementRow extends RowDataPacket {
  id: number;
  endorser_id: number;
  endorsed_id: number;
  skill_id: number;
  match_id: number;
  rating: number;
  created_at: Date;
}

// ─── Suggestion Queries ──────────────────────────────────────────────────────

/**
 * Find users with complementary skills (bidirectional overlap):
 * - Their teach skills overlap with the requesting user's learn skills
 * - Their learn skills overlap with the requesting user's teach skills
 * Excludes: blocked users, users in cooldown, trust_score < 10, non-active users
 */
export async function findComplementaryUsers(
  userId: number,
  userTeachSkillIds: number[],
  userLearnSkillIds: number[]
): Promise<SuggestionRow[]> {
  if (userTeachSkillIds.length === 0 || userLearnSkillIds.length === 0) {
    return [];
  }

  const teachPlaceholders = userTeachSkillIds.map(() => '?').join(',');
  const learnPlaceholders = userLearnSkillIds.map(() => '?').join(',');

  const sql = `
    SELECT DISTINCT
      u.id, u.uid, u.username, u.trust_score,
      uts.skill_id AS teach_skill_id,
      s1.name AS teach_skill_name,
      uls.skill_id AS learn_skill_id,
      s2.name AS learn_skill_name
    FROM users u
    INNER JOIN user_teach_skills uts ON u.id = uts.user_id
    INNER JOIN user_learn_skills uls ON u.id = uls.user_id
    INNER JOIN skills s1 ON s1.id = uts.skill_id
    INNER JOIN skills s2 ON s2.id = uls.skill_id
    WHERE uts.skill_id IN (${learnPlaceholders})
      AND uls.skill_id IN (${teachPlaceholders})
      AND u.id != ?
      AND u.status = 'active'
      AND u.trust_score >= 10
      AND (u.cooldown_until IS NULL OR u.cooldown_until < NOW())
      AND u.id NOT IN (
        SELECT blocked_id FROM blocks WHERE blocker_id = ?
      )
      AND u.id NOT IN (
        SELECT blocker_id FROM blocks WHERE blocked_id = ?
      )
    ORDER BY u.trust_score DESC
    LIMIT 20
  `;

  const params = [
    ...userLearnSkillIds,
    ...userTeachSkillIds,
    userId,
    userId,
    userId,
  ];

  return query<SuggestionRow[]>(sql, params);
}

// ─── Match Request Queries ───────────────────────────────────────────────────

export async function createMatchRequest(
  senderId: number,
  receiverId: number,
  teachSkillId: number,
  learnSkillId: number
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO match_requests (sender_id, receiver_id, teach_skill_id, learn_skill_id)
     VALUES (?, ?, ?, ?)`,
    [senderId, receiverId, teachSkillId, learnSkillId]
  );
}

export async function getMatchRequestById(requestId: number): Promise<MatchRequestRow | null> {
  const rows = await query<MatchRequestRow[]>(
    `SELECT mr.*, 
       su.username AS sender_username, 
       ru.username AS receiver_username,
       s1.name AS teach_skill_name,
       s2.name AS learn_skill_name
     FROM match_requests mr
     JOIN users su ON su.id = mr.sender_id
     JOIN users ru ON ru.id = mr.receiver_id
     JOIN skills s1 ON s1.id = mr.teach_skill_id
     JOIN skills s2 ON s2.id = mr.learn_skill_id
     WHERE mr.id = ?`,
    [requestId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getPendingRequestsForUser(userId: number): Promise<MatchRequestRow[]> {
  return query<MatchRequestRow[]>(
    `SELECT mr.*,
       su.username AS sender_username,
       ru.username AS receiver_username,
       s1.name AS teach_skill_name,
       s2.name AS learn_skill_name
     FROM match_requests mr
     JOIN users su ON su.id = mr.sender_id
     JOIN users ru ON ru.id = mr.receiver_id
     JOIN skills s1 ON s1.id = mr.teach_skill_id
     JOIN skills s2 ON s2.id = mr.learn_skill_id
     WHERE mr.receiver_id = ? AND mr.status = 'pending'
     ORDER BY mr.created_at DESC`,
    [userId]
  );
}

export async function updateMatchRequestStatus(
  requestId: number,
  status: 'accepted' | 'rejected'
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `UPDATE match_requests SET status = ? WHERE id = ?`,
    [status, requestId]
  );
}

/**
 * Check if a pending request already exists between two users.
 */
export async function hasPendingRequest(
  senderId: number,
  receiverId: number
): Promise<boolean> {
  const rows = await query<RowDataPacket[]>(
    `SELECT 1 FROM match_requests
     WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
     LIMIT 1`,
    [senderId, receiverId]
  );
  return rows.length > 0;
}

// ─── Match Queries ───────────────────────────────────────────────────────────

/**
 * Create a match and chat_room in a single transaction (on accept).
 */
export async function createMatchWithChatRoom(
  userAId: number,
  userBId: number,
  skillATeachesB: number,
  skillBTeachesA: number
): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [matchResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO matches (user_a_id, user_b_id, skill_a_teaches_b, skill_b_teaches_a)
       VALUES (?, ?, ?, ?)`,
      [userAId, userBId, skillATeachesB, skillBTeachesA]
    );

    const matchId = matchResult.insertId;

    await connection.execute(
      `INSERT INTO chat_rooms (match_id) VALUES (?)`,
      [matchId]
    );

    await connection.commit();
    return matchId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getActiveMatchesForUser(userId: number): Promise<MatchRow[]> {
  return query<MatchRow[]>(
    `SELECT m.*,
       ua.username AS user_a_username,
       ub.username AS user_b_username,
       s1.name AS skill_a_name,
       s2.name AS skill_b_name
     FROM matches m
     JOIN users ua ON ua.id = m.user_a_id
     JOIN users ub ON ub.id = m.user_b_id
     JOIN skills s1 ON s1.id = m.skill_a_teaches_b
     JOIN skills s2 ON s2.id = m.skill_b_teaches_a
     WHERE (m.user_a_id = ? OR m.user_b_id = ?) AND m.status = 'active'
     ORDER BY m.created_at DESC`,
    [userId, userId]
  );
}

export async function getMatchById(matchId: number): Promise<MatchRow | null> {
  const rows = await query<MatchRow[]>(
    `SELECT m.*,
       ua.username AS user_a_username,
       ub.username AS user_b_username,
       s1.name AS skill_a_name,
       s2.name AS skill_b_name
     FROM matches m
     JOIN users ua ON ua.id = m.user_a_id
     JOIN users ub ON ub.id = m.user_b_id
     JOIN skills s1 ON s1.id = m.skill_a_teaches_b
     JOIN skills s2 ON s2.id = m.skill_b_teaches_a
     WHERE m.id = ?`,
    [matchId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function updateMatchStatus(
  matchId: number,
  status: 'completed' | 'stalled' | 'ghosted'
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `UPDATE matches SET status = ? WHERE id = ?`,
    [status, matchId]
  );
}

// ─── Endorsement Queries ─────────────────────────────────────────────────────

export async function createEndorsement(
  endorserId: number,
  endorsedId: number,
  skillId: number,
  matchId: number,
  rating: number
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO skill_endorsements (endorser_id, endorsed_id, skill_id, match_id, rating)
     VALUES (?, ?, ?, ?, ?)`,
    [endorserId, endorsedId, skillId, matchId, rating]
  );
}

export async function hasEndorsed(
  endorserId: number,
  endorsedId: number,
  matchId: number
): Promise<boolean> {
  const rows = await query<RowDataPacket[]>(
    `SELECT 1 FROM skill_endorsements
     WHERE endorser_id = ? AND endorsed_id = ? AND match_id = ?
     LIMIT 1`,
    [endorserId, endorsedId, matchId]
  );
  return rows.length > 0;
}

// ─── Helper Queries ──────────────────────────────────────────────────────────

export async function getUserTeachSkillIds(userId: number): Promise<number[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT skill_id FROM user_teach_skills WHERE user_id = ?`,
    [userId]
  );
  return rows.map((r) => r.skill_id);
}

export async function getUserLearnSkillIds(userId: number): Promise<number[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT skill_id FROM user_learn_skills WHERE user_id = ?`,
    [userId]
  );
  return rows.map((r) => r.skill_id);
}
