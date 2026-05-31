import { query, QueryParam } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ─── Admin User Queries ───────────────────────────────────────────────────────

export async function findAdminByUsername(username: string) {
  const rows = await query<RowDataPacket[]>(
    'SELECT id, username, email, password_hash, role, created_at FROM admin_users WHERE username = ?',
    [username]
  );
  return rows[0] || null;
}

export async function findAdminById(id: number) {
  const rows = await query<RowDataPacket[]>(
    'SELECT id, username, email, role, created_at FROM admin_users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const dauRows = await query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT id) AS dau FROM users WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) AND status = 'active'`,
    []
  );
  const totalUsersRows = await query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM users',
    []
  );
  const activeMatchesRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM matches WHERE status = 'active'`,
    []
  );
  const completedExchangesRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM matches WHERE status = 'completed'`,
    []
  );
  const openReportsRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM reports WHERE status = 'open'`,
    []
  );

  return {
    dau: dauRows[0]?.dau || 0,
    total_users: totalUsersRows[0]?.total || 0,
    active_matches: activeMatchesRows[0]?.total || 0,
    completed_exchanges: completedExchangesRows[0]?.total || 0,
    open_reports: openReportsRows[0]?.total || 0,
  };
}

// ─── User Management ──────────────────────────────────────────────────────────

export interface UserListFilters {
  status?: string;
  trust_min?: number;
  trust_max?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page: number;
  limit: number;
}

export async function getUsers(filters: UserListFilters) {
  const conditions: string[] = [];
  const params: QueryParam[] = [];

  if (filters.status) {
    conditions.push('u.status = ?');
    params.push(filters.status);
  }
  if (filters.trust_min !== undefined) {
    conditions.push('u.trust_score >= ?');
    params.push(filters.trust_min);
  }
  if (filters.trust_max !== undefined) {
    conditions.push('u.trust_score <= ?');
    params.push(filters.trust_max);
  }
  if (filters.date_from) {
    conditions.push('u.created_at >= ?');
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push('u.created_at <= ?');
    params.push(filters.date_to);
  }
  if (filters.search) {
    conditions.push('(u.username LIKE ? OR u.uid LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const countParams = [...params];
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
    countParams
  );
  const total = countRows[0]?.total || 0;

  const rows = await query<RowDataPacket[]>(
    `SELECT u.id, u.uid, u.username, u.status, u.trust_score, u.experience_level, u.availability, u.created_at, u.updated_at
     FROM users u ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { users: rows, total, page, limit };
}

export async function getUserById(userId: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, uid, username, bio, experience_level, availability, trust_score, status, cooldown_until, created_at, updated_at
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0] || null;
}

export async function getUserReputationHistory(userId: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, event_type, delta, created_at FROM reputation_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

export async function updateUserStatus(userId: number, status: string, reason: string) {
  let cooldownUntil: string | null = null;
  if (status === 'cooldown') {
    // Set cooldown for 7 days
    cooldownUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  }

  await query<ResultSetHeader>(
    `UPDATE users SET status = ?, cooldown_until = ? WHERE id = ?`,
    [status, cooldownUntil, userId]
  );

  return { userId, status, reason, cooldown_until: cooldownUntil };
}

// ─── Match Management ─────────────────────────────────────────────────────────

export interface MatchListFilters {
  status?: string;
  page: number;
  limit: number;
}

export async function getMatches(filters: MatchListFilters) {
  const conditions: string[] = [];
  const params: QueryParam[] = [];

  if (filters.status) {
    conditions.push('m.status = ?');
    params.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM matches m ${whereClause}`,
    [...params]
  );
  const total = countRows[0]?.total || 0;

  const rows = await query<RowDataPacket[]>(
    `SELECT m.id, m.user_a_id, m.user_b_id, m.status, m.created_at,
            u1.username AS user_a_username, u2.username AS user_b_username
     FROM matches m
     LEFT JOIN users u1 ON m.user_a_id = u1.id
     LEFT JOIN users u2 ON m.user_b_id = u2.id
     ${whereClause}
     ORDER BY m.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { matches: rows, total, page, limit };
}

export async function getMatchById(matchId: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT m.id, m.user_a_id, m.user_b_id, m.status, m.created_at,
            u1.username AS user_a_username, u2.username AS user_b_username
     FROM matches m
     LEFT JOIN users u1 ON m.user_a_id = u1.id
     LEFT JOIN users u2 ON m.user_b_id = u2.id
     WHERE m.id = ?`,
    [matchId]
  );
  return rows[0] || null;
}

export async function getMatchChatSummary(matchId: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT cr.id AS room_id,
            (SELECT COUNT(*) FROM messages WHERE room_id = cr.id) AS message_count,
            (SELECT MAX(created_at) FROM messages WHERE room_id = cr.id) AS last_activity
     FROM chat_rooms cr
     WHERE cr.match_id = ?`,
    [matchId]
  );
  return rows[0] || null;
}

// ─── Report Management ────────────────────────────────────────────────────────

export interface ReportListFilters {
  status?: string;
  page: number;
  limit: number;
}

export async function getReports(filters: ReportListFilters) {
  const conditions: string[] = [];
  const params: QueryParam[] = [];

  if (filters.status) {
    conditions.push('r.status = ?');
    params.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM reports r ${whereClause}`,
    [...params]
  );
  const total = countRows[0]?.total || 0;

  const rows = await query<RowDataPacket[]>(
    `SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.detail, r.status, r.created_at,
            u.username AS reporter_username
     FROM reports r
     LEFT JOIN users u ON r.reporter_id = u.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { reports: rows, total, page, limit };
}

export async function getReportById(reportId: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.detail, r.status, r.resolved_by, r.resolution, r.created_at,
            u.username AS reporter_username
     FROM reports r
     LEFT JOIN users u ON r.reporter_id = u.id
     WHERE r.id = ?`,
    [reportId]
  );
  return rows[0] || null;
}

export async function resolveReport(
  reportId: number,
  resolution: string,
  resolvedBy: number,
  notes?: string
) {
  const status = resolution === 'dismiss' ? 'dismissed' : 'resolved';
  await query<ResultSetHeader>(
    `UPDATE reports SET status = ?, resolved_by = ?, resolution = ? WHERE id = ?`,
    [status, resolvedBy, notes || resolution, reportId]
  );
}

// ─── Post Management ──────────────────────────────────────────────────────────

export interface PostListFilters {
  status?: string;
  page: number;
  limit: number;
}

export async function getPosts(filters: PostListFilters) {
  const conditions: string[] = [];
  const params: QueryParam[] = [];

  if (filters.status) {
    conditions.push('p.status = ?');
    params.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM posts p ${whereClause}`,
    [...params]
  );
  const total = countRows[0]?.total || 0;

  const rows = await query<RowDataPacket[]>(
    `SELECT p.id, p.community_id, p.author_id, p.content, p.upvotes, p.status, p.created_at,
            u.username AS author_username
     FROM posts p
     LEFT JOIN users u ON p.author_id = u.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { posts: rows, total, page, limit };
}

export async function removePost(postId: number) {
  await query<ResultSetHeader>(
    `UPDATE posts SET status = 'removed' WHERE id = ?`,
    [postId]
  );
}

// ─── Skills Analytics ─────────────────────────────────────────────────────────

export async function getSkillsAnalytics() {
  const rows = await query<RowDataPacket[]>(
    `SELECT s.id, s.name, s.category,
            (SELECT COUNT(*) FROM user_teach_skills WHERE skill_id = s.id) AS supply,
            (SELECT COUNT(*) FROM user_learn_skills WHERE skill_id = s.id) AS demand
     FROM skills s
     ORDER BY demand DESC`,
    []
  );
  return rows;
}

export async function getTrendingSkills() {
  // Top skills by total demand (learn) + supply (teach) activity.
  // Since user_teach_skills and user_learn_skills don't have created_at,
  // we approximate trending by looking at skills involved in recent matches (last 7 days).
  const rows = await query<RowDataPacket[]>(
    `SELECT s.id, s.name, s.category,
            (SELECT COUNT(*) FROM user_teach_skills WHERE skill_id = s.id) AS supply,
            (SELECT COUNT(*) FROM user_learn_skills WHERE skill_id = s.id) AS demand,
            (SELECT COUNT(*) FROM user_teach_skills WHERE skill_id = s.id) +
            (SELECT COUNT(*) FROM user_learn_skills WHERE skill_id = s.id) AS activity_count
     FROM skills s
     HAVING activity_count > 0
     ORDER BY activity_count DESC
     LIMIT 20`,
    []
  );
  return rows;
}

// ─── Reputation Outliers ──────────────────────────────────────────────────────

export async function getReputationOutliers() {
  const rows = await query<RowDataPacket[]>(
    `SELECT u.id, u.uid, u.username, u.trust_score, u.status, u.created_at,
            (SELECT COUNT(*) FROM reputation_events WHERE user_id = u.id AND event_type = 'ghosting_penalty' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS ghost_count
     FROM users u
     WHERE u.trust_score < 50
        OR (SELECT COUNT(*) FROM reputation_events WHERE user_id = u.id AND event_type = 'ghosting_penalty' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) > 2
     ORDER BY u.trust_score ASC`,
    []
  );
  return rows;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogFilters {
  admin_id?: number;
  action?: string;
  date_from?: string;
  date_to?: string;
  page: number;
  limit: number;
}

export async function getAuditLog(filters: AuditLogFilters) {
  const conditions: string[] = [];
  const params: QueryParam[] = [];

  if (filters.admin_id) {
    conditions.push('al.admin_id = ?');
    params.push(filters.admin_id);
  }
  if (filters.action) {
    conditions.push('al.action = ?');
    params.push(filters.action);
  }
  if (filters.date_from) {
    conditions.push('al.created_at >= ?');
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push('al.created_at <= ?');
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM audit_log al ${whereClause}`,
    [...params]
  );
  const total = countRows[0]?.total || 0;

  const rows = await query<RowDataPacket[]>(
    `SELECT al.id, al.admin_id, al.action, al.target_type, al.target_id, al.metadata, al.created_at,
            au.username AS admin_username
     FROM audit_log al
     LEFT JOIN admin_users au ON al.admin_id = au.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { entries: rows, total, page, limit };
}

export async function recordAuditLog(
  adminId: number,
  action: string,
  targetType: string,
  targetId: number,
  metadata?: Record<string, unknown>
) {
  await query<ResultSetHeader>(
    `INSERT INTO audit_log (admin_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?)`,
    [adminId, action, targetType, targetId, metadata ? JSON.stringify(metadata) : null]
  );
}
