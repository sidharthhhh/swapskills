import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ResultSetHeader } from 'mysql2/promise';
import * as adminModel from './admin.model';
import { query } from '../../config/database';
import { redisClient } from '../../config/redis';
import { AppError } from '../../utils/AppError';
import { logger } from '../../config/logger';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_secret_change_me';
const ADMIN_JWT_EXPIRES_IN = '8h';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginAdmin(username: string, password: string) {
  const admin = await adminModel.findAdminByUsername(username);
  if (!admin) {
    throw new AppError(401, 'Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const token = jwt.sign(
    { sub: admin.id, username: admin.username, role: admin.role },
    ADMIN_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: ADMIN_JWT_EXPIRES_IN }
  );

  logger.info('Admin login successful', { adminId: admin.id, username: admin.username });

  return {
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    },
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  return adminModel.getDashboardStats();
}

// ─── User Management ──────────────────────────────────────────────────────────

export async function getUsers(filters: adminModel.UserListFilters) {
  return adminModel.getUsers(filters);
}

export async function getUserDetail(userId: number) {
  const user = await adminModel.getUserById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const reputationHistory = await adminModel.getUserReputationHistory(userId);
  return { ...user, reputation_history: reputationHistory };
}

export async function updateUserStatus(
  userId: number,
  status: string,
  reason: string,
  adminId: number
) {
  const user = await adminModel.getUserById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const result = await adminModel.updateUserStatus(userId, status, reason);

  // Record audit log
  await adminModel.recordAuditLog(adminId, `user_status_${status}`, 'user', userId, {
    previous_status: user.status,
    new_status: status,
    reason,
  });

  logger.info('Admin updated user status', { adminId, userId, status, reason });

  return result;
}

// ─── Match Management ─────────────────────────────────────────────────────────

export async function getMatches(filters: adminModel.MatchListFilters) {
  return adminModel.getMatches(filters);
}

export async function getMatchDetail(matchId: number) {
  const match = await adminModel.getMatchById(matchId);
  if (!match) {
    throw new AppError(404, 'Match not found');
  }

  const chatSummary = await adminModel.getMatchChatSummary(matchId);
  return { ...match, chat_summary: chatSummary };
}

// ─── Report Management ────────────────────────────────────────────────────────

export async function getReports(filters: adminModel.ReportListFilters) {
  return adminModel.getReports(filters);
}

export async function getReportDetail(reportId: number) {
  const report = await adminModel.getReportById(reportId);
  if (!report) {
    throw new AppError(404, 'Report not found');
  }
  return report;
}

export async function resolveReport(
  reportId: number,
  resolution: string,
  adminId: number,
  notes?: string
) {
  const report = await adminModel.getReportById(reportId);
  if (!report) {
    throw new AppError(404, 'Report not found');
  }

  await adminModel.resolveReport(reportId, resolution, adminId, notes);

  // If resolution is suspend_user, suspend the reported target (if target_type is user)
  if (resolution === 'suspend_user' && report.target_type === 'user') {
    await adminModel.updateUserStatus(report.target_id, 'suspended', `Suspended via report #${reportId}`);
  }

  // If resolution is remove_content and target is a post, remove it
  if (resolution === 'remove_content' && report.target_type === 'post') {
    await adminModel.removePost(report.target_id);
  }

  // Record audit log
  await adminModel.recordAuditLog(adminId, `report_${resolution}`, 'report', reportId, {
    target_type: report.target_type,
    target_id: report.target_id,
    notes,
  });

  logger.info('Admin resolved report', { adminId, reportId, resolution });
}

// ─── Post Management ──────────────────────────────────────────────────────────

export async function getPosts(filters: adminModel.PostListFilters) {
  return adminModel.getPosts(filters);
}

export async function removePost(postId: number, adminId: number) {
  await adminModel.removePost(postId);

  // Record audit log
  await adminModel.recordAuditLog(adminId, 'post_removed', 'post', postId, {});

  logger.info('Admin removed post', { adminId, postId });
}

// ─── Skills Analytics ─────────────────────────────────────────────────────────

export async function addSkill(name: string, category: string, adminId: number) {
  // Insert into skills table
  const result = await query<ResultSetHeader>(
    'INSERT INTO skills (name, category) VALUES (?, ?)',
    [name, category]
  );

  // Record audit log
  await adminModel.recordAuditLog(adminId, 'skill_added', 'skill', result.insertId, { name, category });

  // Invalidate skills cache in Redis
  await redisClient.del('skills:all', 'skills:categories', 'skills:gap');

  logger.info('Admin added skill', { adminId, skillId: result.insertId, name, category });

  return { id: result.insertId, name, category };
}

export async function deleteSkill(skillId: number, adminId: number) {
  // Remove skill associations first
  await query<ResultSetHeader>('DELETE FROM user_teach_skills WHERE skill_id = ?', [skillId]);
  await query<ResultSetHeader>('DELETE FROM user_learn_skills WHERE skill_id = ?', [skillId]);

  // Delete the skill
  const result = await query<ResultSetHeader>('DELETE FROM skills WHERE id = ?', [skillId]);

  if (result.affectedRows === 0) {
    throw new AppError(404, 'Skill not found');
  }

  // Record audit log
  await adminModel.recordAuditLog(adminId, 'skill_deleted', 'skill', skillId, {});

  // Invalidate skills cache in Redis
  await redisClient.del('skills:all', 'skills:categories', 'skills:gap');

  logger.info('Admin deleted skill', { adminId, skillId });
}

export async function getSkillsAnalytics() {
  return adminModel.getSkillsAnalytics();
}

export async function getTrendingSkills() {
  return adminModel.getTrendingSkills();
}

// ─── Reputation Outliers ──────────────────────────────────────────────────────

export async function getReputationOutliers() {
  return adminModel.getReputationOutliers();
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function getAuditLog(filters: adminModel.AuditLogFilters) {
  return adminModel.getAuditLog(filters);
}
