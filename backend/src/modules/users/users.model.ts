import prisma from '../../config/prisma';

/**
 * Database access layer for users module using Prisma.
 * IDOR prevention: every query that accesses user-specific data includes the authenticated user's ID in the WHERE clause.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface UserProfileRow {
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

export interface UserSkillRow {
  skill_id: number;
  skill_name: string;
  category: string;
}

export interface BlockRow {
  blocker_id: number;
  blocked_id: number;
  created_at: Date;
}

export interface ReportRow {
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
  const u = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!u) return null;

  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    bio: u.bio,
    experience_level: u.experience_level,
    availability: u.availability,
    trust_score: Number(u.trust_score),
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

export async function getPublicProfileByUid(uid: string): Promise<UserProfileRow | null> {
  const u = await prisma.user.findFirst({
    where: { uid, status: 'active' }
  });

  if (!u) return null;

  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    bio: u.bio,
    experience_level: u.experience_level,
    availability: u.availability,
    trust_score: Number(u.trust_score),
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

export async function updateProfile(
  userId: number,
  data: { bio?: string; availability?: string; experience_level?: string }
) {
  if (Object.keys(data).length === 0) return { affectedRows: 0 };

  await prisma.user.update({
    where: { id: userId },
    data
  });

  return { affectedRows: 1 };
}

// ─── Skill Queries ───────────────────────────────────────────────────────────

export async function getTeachSkills(userId: number): Promise<UserSkillRow[]> {
  const skills = await prisma.userTeachSkill.findMany({
    where: { user_id: userId },
    include: { skill: true }
  });
  return skills.map((s: any) => ({
    skill_id: s.skill_id,
    skill_name: s.skill.name,
    category: s.skill.category
  }));
}

export async function getLearnSkills(userId: number): Promise<UserSkillRow[]> {
  const skills = await prisma.userLearnSkill.findMany({
    where: { user_id: userId },
    include: { skill: true }
  });
  return skills.map((s: any) => ({
    skill_id: s.skill_id,
    skill_name: s.skill.name,
    category: s.skill.category
  }));
}

export async function addTeachSkill(userId: number, skillId: number) {
  try {
    await prisma.userTeachSkill.create({
      data: { user_id: userId, skill_id: skillId }
    });
    return { affectedRows: 1 };
  } catch (e: any) {
    if (e.code === 'P2002') return { affectedRows: 0 };
    throw e;
  }
}

export async function addLearnSkill(userId: number, skillId: number) {
  try {
    await prisma.userLearnSkill.create({
      data: { user_id: userId, skill_id: skillId }
    });
    return { affectedRows: 1 };
  } catch (e: any) {
    if (e.code === 'P2002') return { affectedRows: 0 };
    throw e;
  }
}

export async function removeTeachSkill(userId: number, skillId: number) {
  await prisma.userTeachSkill.deleteMany({
    where: { user_id: userId, skill_id: skillId }
  });
  return { affectedRows: 1 };
}

export async function removeLearnSkill(userId: number, skillId: number) {
  await prisma.userLearnSkill.deleteMany({
    where: { user_id: userId, skill_id: skillId }
  });
  return { affectedRows: 1 };
}

export async function skillExists(skillId: number): Promise<boolean> {
  const s = await prisma.skill.findUnique({ where: { id: skillId } });
  return s !== null;
}

export async function getSkillGap(userId: number): Promise<UserSkillRow[]> {
  const learnSkills = await prisma.userLearnSkill.findMany({
    where: { user_id: userId },
    include: { skill: true }
  });

  const missingSkills: UserSkillRow[] = [];

  for (const ls of learnSkills) {
    const isTaught = await prisma.userTeachSkill.findFirst({
      where: {
        skill_id: ls.skill_id,
        user_id: { not: userId }
      }
    });

    if (!isTaught) {
      missingSkills.push({
        skill_id: ls.skill_id,
        skill_name: ls.skill.name,
        category: ls.skill.category
      });
    }
  }

  return missingSkills;
}

// ─── Block Queries ───────────────────────────────────────────────────────────

export async function blockUser(blockerId: number, blockedId: number) {
  try {
    await prisma.block.create({
      data: { blocker_id: blockerId, blocked_id: blockedId }
    });
    return { affectedRows: 1 };
  } catch (e: any) {
    if (e.code === 'P2002') return { affectedRows: 0 };
    throw e;
  }
}

export async function unblockUser(blockerId: number, blockedId: number) {
  await prisma.block.deleteMany({
    where: { blocker_id: blockerId, blocked_id: blockedId }
  });
  return { affectedRows: 1 };
}

export async function isBlocked(blockerId: number, blockedId: number): Promise<boolean> {
  const b = await prisma.block.findFirst({
    where: { blocker_id: blockerId, blocked_id: blockedId }
  });
  return b !== null;
}

export async function findUserByUid(uid: string): Promise<UserProfileRow | null> {
  const u = await prisma.user.findUnique({ where: { uid } });
  if (!u) return null;

  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    bio: u.bio,
    experience_level: u.experience_level,
    availability: u.availability,
    trust_score: Number(u.trust_score),
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

// ─── Search Queries ──────────────────────────────────────────────────────────

export interface SearchUserRow {
  uid: string;
  username: string;
  trust_score: number;
  experience_level: string;
}

export async function searchUsers(searchTerm: string): Promise<SearchUserRow[]> {
  const users = await prisma.user.findMany({
    where: {
      username: { contains: searchTerm, mode: 'insensitive' },
      status: 'active'
    },
    take: 20
  });

  return users.map((u: any) => ({
    uid: u.uid,
    username: u.username,
    trust_score: Number(u.trust_score),
    experience_level: u.experience_level,
  }));
}

// ─── Report Queries ──────────────────────────────────────────────────────────

export async function createReport(
  reporterId: number,
  targetType: string,
  targetId: number,
  reason: string,
  detail?: string
) {
  const rep = await prisma.report.create({
    data: {
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
      detail: detail || null,
    }
  });
  return { insertId: rep.id };
}

// ─── GDPR Cascade Delete ─────────────────────────────────────────────────────

export async function cascadeDeleteUser(userId: number): Promise<void> {
  // Prisma handles cascade deletes via relation rules specified in schema.prisma.
  await prisma.user.delete({ where: { id: userId } });
}
