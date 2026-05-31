import { query, pool } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Database access layer for users module.
 * All queries use parameterized SQL to prevent injection.
 * IDOR prevention: every query that accesses user-specific data includes the authenticated user's ID in the WHERE clause.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface UserProfileRow extends RowDataPacket {
  id: number;
  uid: string;
  username: string;
  bio: string | null;
  experience_level: string;
  availability: string;
  trust_score: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSkillRow extends RowDataPacket {
  skill_id: number;
  skill_name: string;
  category: string;
}

export interface BlockRow extends RowDataPacket {
  blocker_id: number;
  blocked_id: number;
  created_at: Date;
}

export interface ReportRow extends RowDataPacket {
  id: number;
  reporter_id: number;
  target_type: string;
  target_id: number;
  reason: string;
  detail: string | null;
  status: string;
  created_at: Date;
}

// ─── Profile Queries ─────────────────────────────────────────────────────────

export async function getProfileById(userId: number): Promise<UserProfileRow | null> {
  const rows = await query<UserProfileRow[]>(
    `SELECT id, uid, username, bio, experience_level, availability, trust_score, status, created_at, updated_at
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getPublicProfileByUid(uid: string): Promise<UserProfileRow | null> {
  const rows = await query<UserProfileRow[]>(
    `SELECT uid, username, bio, experience_level, availability, trust_score, status, created_at
     FROM users WHERE uid = ? AND status = 'active'`,
    [uid]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function updateProfile(
  userId: number,
  data: { bio?: string; availability?: string; experience_level?: string }
): Promise<ResultSetHeader> {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.bio !== undefined) {
    fields.push('bio = ?');
    values.push(data.bio);
  }
  if (data.availability !== undefined) {
    fields.push('availability = ?');
    values.push(data.availability);
  }
  if (data.experience_level !== undefined) {
    fields.push('experience_level = ?');
    values.push(data.experience_level);
  }

  if (fields.length === 0) {
    return { affectedRows: 0 } as ResultSetHeader;
  }

  values.push(userId);
  return query<ResultSetHeader>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

// ─── Skill Queries ───────────────────────────────────────────────────────────

export async function getTeachSkills(userId: number): Promise<UserSkillRow[]> {
  return query<UserSkillRow[]>(
    `SELECT uts.skill_id, s.name AS skill_name, s.category
     FROM user_teach_skills uts
     JOIN skills s ON s.id = uts.skill_id
     WHERE uts.user_id = ?`,
    [userId]
  );
}

export async function getLearnSkills(userId: number): Promise<UserSkillRow[]> {
  return query<UserSkillRow[]>(
    `SELECT uls.skill_id, s.name AS skill_name, s.category
     FROM user_learn_skills uls
     JOIN skills s ON s.id = uls.skill_id
     WHERE uls.user_id = ?`,
    [userId]
  );
}

export async function addTeachSkill(userId: number, skillId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT IGNORE INTO user_teach_skills (user_id, skill_id) VALUES (?, ?)`,
    [userId, skillId]
  );
}

export async function addLearnSkill(userId: number, skillId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT IGNORE INTO user_learn_skills (user_id, skill_id) VALUES (?, ?)`,
    [userId, skillId]
  );
}

export async function removeTeachSkill(userId: number, skillId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `DELETE FROM user_teach_skills WHERE user_id = ? AND skill_id = ?`,
    [userId, skillId]
  );
}

export async function removeLearnSkill(userId: number, skillId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `DELETE FROM user_learn_skills WHERE user_id = ? AND skill_id = ?`,
    [userId, skillId]
  );
}

export async function skillExists(skillId: number): Promise<boolean> {
  const rows = await query<RowDataPacket[]>(
    'SELECT 1 FROM skills WHERE id = ? LIMIT 1',
    [skillId]
  );
  return rows.length > 0;
}

/**
 * Skill gap analysis: skills the user wants to learn but no one is teaching.
 */
export async function getSkillGap(userId: number): Promise<UserSkillRow[]> {
  return query<UserSkillRow[]>(
    `SELECT uls.skill_id, s.name AS skill_name, s.category
     FROM user_learn_skills uls
     JOIN skills s ON s.id = uls.skill_id
     WHERE uls.user_id = ?
       AND uls.skill_id NOT IN (
         SELECT uts.skill_id FROM user_teach_skills uts
         WHERE uts.user_id != ?
       )`,
    [userId, userId]
  );
}

// ─── Block Queries ───────────────────────────────────────────────────────────

export async function blockUser(blockerId: number, blockedId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)`,
    [blockerId, blockedId]
  );
}

export async function unblockUser(blockerId: number, blockedId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`,
    [blockerId, blockedId]
  );
}

export async function isBlocked(blockerId: number, blockedId: number): Promise<boolean> {
  const rows = await query<RowDataPacket[]>(
    'SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ? LIMIT 1',
    [blockerId, blockedId]
  );
  return rows.length > 0;
}

export async function findUserByUid(uid: string): Promise<UserProfileRow | null> {
  const rows = await query<UserProfileRow[]>(
    `SELECT id, uid, username, bio, experience_level, availability, trust_score, status, created_at, updated_at
     FROM users WHERE uid = ?`,
    [uid]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ─── Search Queries ──────────────────────────────────────────────────────────

export interface SearchUserRow extends RowDataPacket {
  uid: string;
  username: string;
  trust_score: number;
  experience_level: string;
}

/**
 * Search users by username (partial match).
 */
export async function searchUsers(searchTerm: string): Promise<SearchUserRow[]> {
  return query<SearchUserRow[]>(
    `SELECT uid, username, trust_score, experience_level
     FROM users
     WHERE username LIKE ? AND status = 'active'
     LIMIT 20`,
    [`%${searchTerm}%`]
  );
}

// ─── Report Queries ──────────────────────────────────────────────────────────

export async function createReport(
  reporterId: number,
  targetType: string,
  targetId: number,
  reason: string,
  detail?: string
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, detail)
     VALUES (?, ?, ?, ?, ?)`,
    [reporterId, targetType, targetId, reason, detail || null]
  );
}

// ─── GDPR Cascade Delete ─────────────────────────────────────────────────────

/**
 * Delete all user data in a single transaction (GDPR compliance).
 * Deletes from all related tables in dependency order.
 */
export async function cascadeDeleteUser(userId: number): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete in dependency order (children first)
    await connection.execute('DELETE FROM session_notes WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM messages WHERE sender_id = ?', [userId]);
    await connection.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM comments WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM post_votes WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM posts WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM reports WHERE reporter_id = ?', [userId]);
    await connection.execute('DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?', [userId, userId]);
    await connection.execute('DELETE FROM reputation_events WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM skill_endorsements WHERE endorser_id = ? OR endorsed_user_id = ?', [userId, userId]);
    await connection.execute(
      'DELETE FROM sessions WHERE match_id IN (SELECT id FROM matches WHERE user1_id = ? OR user2_id = ?)',
      [userId, userId]
    );
    await connection.execute(
      'DELETE FROM chat_rooms WHERE match_id IN (SELECT id FROM matches WHERE user1_id = ? OR user2_id = ?)',
      [userId, userId]
    );
    await connection.execute('DELETE FROM matches WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
    await connection.execute('DELETE FROM match_requests WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
    await connection.execute('DELETE FROM user_teach_skills WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_learn_skills WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM recovery_keys WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
