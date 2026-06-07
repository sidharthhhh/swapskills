import prisma from '../../config/prisma';

// ─── Admin User Queries ───────────────────────────────────────────────────────

export async function findAdminByUsername(username: string) {
  return prisma.adminUser.findUnique({
    where: { username },
    select: { id: true, username: true, email: true, password_hash: true, role: true, created_at: true },
  });
}

export async function findAdminById(id: number) {
  return prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, role: true, created_at: true },
  });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [dau, totalUsers, activeMatches, completedExchanges, openReports] = await Promise.all([
    prisma.user.count({
      where: { updated_at: { gte: oneDayAgo }, status: 'active' },
    }),
    prisma.user.count(),
    prisma.match.count({ where: { status: 'active' } }),
    prisma.match.count({ where: { status: 'completed' } }),
    prisma.report.count({ where: { status: 'open' } }),
  ]);

  return {
    dau,
    total_users: totalUsers,
    active_matches: activeMatches,
    completed_exchanges: completedExchanges,
    open_reports: openReports,
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
  const where: any = {};

  if (filters.status) where.status = filters.status;
  if (filters.trust_min !== undefined || filters.trust_max !== undefined) {
    where.trust_score = {};
    if (filters.trust_min !== undefined) where.trust_score.gte = filters.trust_min;
    if (filters.trust_max !== undefined) where.trust_score.lte = filters.trust_max;
  }
  if (filters.date_from || filters.date_to) {
    where.created_at = {};
    if (filters.date_from) where.created_at.gte = new Date(filters.date_from);
    if (filters.date_to) where.created_at.lte = new Date(filters.date_to);
  }
  if (filters.search) {
    where.OR = [
      { username: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        uid: true,
        username: true,
        status: true,
        trust_score: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  return { users, total, page, limit };
}

export async function getUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      uid: true,
      username: true,
      bio: true,
      trust_score: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
}

export async function getUserReputationHistory(userId: number) {
  return prisma.reputationEvent.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
}

export async function updateUserStatus(userId: number, status: string, reason: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  return { userId, status, reason };
}

// ─── Match Management ─────────────────────────────────────────────────────────

export interface MatchListFilters {
  status?: string;
  page: number;
  limit: number;
}

export async function getMatches(filters: MatchListFilters) {
  const where: any = {};
  if (filters.status) where.status = filters.status;

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const [total, matches] = await Promise.all([
    prisma.match.count({ where }),
    prisma.match.findMany({
      where,
      include: {
        userA: { select: { username: true } },
        userB: { select: { username: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { matches, total, page, limit };
}

export async function getMatchById(matchId: number) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      userA: { select: { username: true } },
      userB: { select: { username: true } },
    },
  });
}

export async function getMatchChatSummary(matchId: number) {
  const room = await prisma.chatRoom.findUnique({
    where: { match_id: matchId },
    include: {
      _count: { select: { messages: true } },
      messages: { orderBy: { created_at: 'desc' }, take: 1, select: { created_at: true } },
    },
  });

  if (!room) return null;

  return {
    room_id: room.id,
    message_count: room._count.messages,
    last_activity: room.messages.length > 0 ? room.messages[0].created_at : null,
  };
}

// ─── Report Management ────────────────────────────────────────────────────────

export interface ReportListFilters {
  status?: string;
  page: number;
  limit: number;
}

export async function getReports(filters: ReportListFilters) {
  const where: any = {};
  if (filters.status) where.status = filters.status;

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const [total, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      include: { reporter: { select: { username: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { reports, total, page, limit };
}

export async function getReportById(reportId: number) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: { reporter: { select: { username: true } } },
  });
}

export async function resolveReport(
  reportId: number,
  resolution: string,
  resolvedBy: number,
  notes?: string
) {
  const status = resolution === 'dismiss' ? 'dismissed' : 'resolved';
  await prisma.report.update({
    where: { id: reportId },
    data: { status, resolved_by: resolvedBy, resolution: notes || resolution },
  });
}

// ─── Post Management ──────────────────────────────────────────────────────────

export interface PostListFilters {
  status?: string;
  page: number;
  limit: number;
}

export async function getPosts(filters: PostListFilters) {
  const where: any = {};
  if (filters.status) where.status = filters.status;

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      include: { author: { select: { username: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { posts, total, page, limit };
}

export async function removePost(postId: number) {
  await prisma.post.update({
    where: { id: postId },
    data: { status: 'removed' },
  });
}

// ─── Skills Analytics ─────────────────────────────────────────────────────────

export async function getSkillsAnalytics() {
  const skills = await prisma.skill.findMany({
    include: {
      _count: { select: { teachSkills: true, learnSkills: true } },
    },
  });

  return skills.map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    supply: s._count.teachSkills,
    demand: s._count.learnSkills,
  })).sort((a: any, b: any) => b.demand - a.demand);
}

export async function getTrendingSkills() {
  const skills = await getSkillsAnalytics();
  return skills
    .map((s: any) => ({ ...s, activity_count: s.supply + s.demand }))
    .filter((s: any) => s.activity_count > 0)
    .sort((a: any, b: any) => b.activity_count - a.activity_count)
    .slice(0, 20);
}

// ─── Reputation Outliers ──────────────────────────────────────────────────────

export async function getReputationOutliers() {
  // Using a simpler Prisma query since complex subqueries are harder. We fetch users with low scores.
  return prisma.user.findMany({
    where: { trust_score: { lt: 50 } },
    orderBy: { trust_score: 'asc' },
  });
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
  const where: any = {};
  if (filters.admin_id) where.admin_id = filters.admin_id;
  if (filters.action) where.action = filters.action;
  if (filters.date_from || filters.date_to) {
    where.created_at = {};
    if (filters.date_from) where.created_at.gte = new Date(filters.date_from);
    if (filters.date_to) where.created_at.lte = new Date(filters.date_to);
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const [total, entries] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { admin: { select: { username: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { entries: entries.map(e => ({ ...e, id: Number(e.id) })), total, page, limit };
}

export async function recordAuditLog(
  adminId: number,
  action: string,
  targetType: string,
  targetId: number,
  metadata?: any
) {
  await prisma.auditLog.create({
    data: {
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata || {},
    },
  });
}
