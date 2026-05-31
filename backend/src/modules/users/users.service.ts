import * as usersModel from './users.model';
import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { sanitize } from '../../utils/sanitize';

/**
 * Users service — business logic for profile, skills, blocks, reports, and account deletion.
 */

// ─── Profile Operations ──────────────────────────────────────────────────────

export async function getOwnProfile(userId: number) {
  const profile = await usersModel.getProfileById(userId);
  if (!profile) {
    throw new AppError(404, 'Profile not found');
  }

  const teachSkills = await usersModel.getTeachSkills(userId);
  const learnSkills = await usersModel.getLearnSkills(userId);

  return {
    uid: profile.uid,
    username: profile.username,
    bio: profile.bio,
    experience_level: profile.experience_level,
    availability: profile.availability,
    trust_score: profile.trust_score,
    status: profile.status,
    created_at: profile.created_at,
    teachSkills,
    learnSkills,
  };
}

export async function getPublicProfile(uid: string) {
  const profile = await usersModel.getPublicProfileByUid(uid);
  if (!profile) {
    throw new AppError(404, 'User not found');
  }

  const user = await usersModel.findUserByUid(uid);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const teachSkills = await usersModel.getTeachSkills(user.id);
  const learnSkills = await usersModel.getLearnSkills(user.id);

  return {
    uid: profile.uid,
    username: profile.username,
    bio: profile.bio,
    experience_level: profile.experience_level,
    availability: profile.availability,
    trust_score: profile.trust_score,
    created_at: profile.created_at,
    teachSkills,
    learnSkills,
  };
}

export async function updateProfile(
  userId: number,
  data: { bio?: string; availability?: string; experience_level?: string }
) {
  // Sanitize bio if provided
  const sanitizedData = { ...data };
  if (sanitizedData.bio !== undefined) {
    sanitizedData.bio = sanitize(sanitizedData.bio);
  }

  await usersModel.updateProfile(userId, sanitizedData);

  // Invalidate profile cache
  const profile = await usersModel.getProfileById(userId);
  if (profile) {
    await redisClient.del(`user:${profile.uid}:profile`);
  }

  logger.info('Profile updated', { userId });
  return await getOwnProfile(userId);
}

// ─── Skill Management ────────────────────────────────────────────────────────

export async function addTeachSkill(userId: number, skillId: number) {
  // Verify skill exists
  const exists = await usersModel.skillExists(skillId);
  if (!exists) {
    throw new AppError(404, 'Skill not found');
  }

  await usersModel.addTeachSkill(userId, skillId);

  // Invalidate caches
  const profile = await usersModel.getProfileById(userId);
  if (profile) {
    await redisClient.del(`user:${profile.uid}:skills`);
  }

  logger.info('Teach skill added', { userId, skillId });
  return await usersModel.getTeachSkills(userId);
}

export async function addLearnSkill(userId: number, skillId: number) {
  // Verify skill exists
  const exists = await usersModel.skillExists(skillId);
  if (!exists) {
    throw new AppError(404, 'Skill not found');
  }

  await usersModel.addLearnSkill(userId, skillId);

  // Invalidate caches
  const profile = await usersModel.getProfileById(userId);
  if (profile) {
    await redisClient.del(`user:${profile.uid}:skills`);
  }

  logger.info('Learn skill added', { userId, skillId });
  return await usersModel.getLearnSkills(userId);
}

export async function removeTeachSkill(userId: number, skillId: number) {
  const result = await usersModel.removeTeachSkill(userId, skillId);
  if (result.affectedRows === 0) {
    throw new AppError(404, 'Skill not found in your teach list');
  }

  // Invalidate caches
  const profile = await usersModel.getProfileById(userId);
  if (profile) {
    await redisClient.del(`user:${profile.uid}:skills`);
  }

  logger.info('Teach skill removed', { userId, skillId });
}

export async function removeLearnSkill(userId: number, skillId: number) {
  const result = await usersModel.removeLearnSkill(userId, skillId);
  if (result.affectedRows === 0) {
    throw new AppError(404, 'Skill not found in your learn list');
  }

  // Invalidate caches
  const profile = await usersModel.getProfileById(userId);
  if (profile) {
    await redisClient.del(`user:${profile.uid}:skills`);
  }

  logger.info('Learn skill removed', { userId, skillId });
}

export async function getSkillGap(userId: number) {
  return await usersModel.getSkillGap(userId);
}

// ─── Block / Unblock ─────────────────────────────────────────────────────────

export async function blockUser(blockerId: number, targetUid: string) {
  const targetUser = await usersModel.findUserByUid(targetUid);
  if (!targetUser) {
    throw new AppError(404, 'User not found');
  }

  if (targetUser.id === blockerId) {
    throw new AppError(400, 'Cannot block yourself');
  }

  await usersModel.blockUser(blockerId, targetUser.id);
  logger.info('User blocked', { blockerId, blockedId: targetUser.id });
}

export async function unblockUser(blockerId: number, targetUid: string) {
  const targetUser = await usersModel.findUserByUid(targetUid);
  if (!targetUser) {
    throw new AppError(404, 'User not found');
  }

  const result = await usersModel.unblockUser(blockerId, targetUser.id);
  if (result.affectedRows === 0) {
    throw new AppError(404, 'Block not found');
  }

  logger.info('User unblocked', { blockerId, blockedId: targetUser.id });
}

// ─── Report ──────────────────────────────────────────────────────────────────

export async function createReport(
  reporterId: number,
  targetType: string,
  targetId: number,
  reason: string,
  detail?: string
) {
  const sanitizedDetail = detail ? sanitize(detail) : undefined;

  await usersModel.createReport(reporterId, targetType, targetId, reason, sanitizedDetail);
  logger.info('Report filed', { reporterId, targetType, targetId, reason });

  // Note: trust score penalty via reputation module will be triggered later
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchUsers(searchTerm: string) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  return usersModel.searchUsers(searchTerm.trim());
}

// ─── GDPR Account Deletion ───────────────────────────────────────────────────

export async function deleteAccount(userId: number, userUid: string) {
  // Cascade delete all user data in a single transaction
  await usersModel.cascadeDeleteUser(userId);

  // Clear Redis caches
  await redisClient.del(`user:${userUid}:profile`);
  await redisClient.del(`user:${userUid}:skills`);
  await redisClient.del(`user:${userUid}:tokens`);

  logger.info('Account deleted (GDPR)', { userId, userUid });
}
