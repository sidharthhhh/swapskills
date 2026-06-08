import prisma from '../../config/prisma';

/**
 * Database access layer for reputation module using Prisma.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ReputationEventRow {
  id: number;
  user_id: number;
  event_type: string;
  delta: number;
  note: string | null;
  created_at: Date;
}

export interface UserTrustRow {
  id: number;
  trust_score: number;
  status: string;
  cooldown_until: Date | null;
}

export interface GhostCountRow {
  ghost_count: number;
}

// ─── Reputation Event Queries ────────────────────────────────────────────────

export async function recordEvent(
  userId: number,
  eventType: string,
  delta: number,
  note?: string
) {
  const ev = await prisma.reputationEvent.create({
    data: {
      user_id: userId,
      event_type: eventType,
      delta,
      note: note || null,
    }
  });
  return { insertId: ev.id };
}

export async function getEventsByUserId(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<ReputationEventRow[]> {
  const events = await prisma.reputationEvent.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    skip: offset,
    take: limit,
  });

  return events.map((e: any) => ({
    id: e.id,
    user_id: e.user_id,
    event_type: e.event_type,
    delta: Number(e.delta),
    note: e.note,
    created_at: e.created_at,
  }));
}

// ─── Trust Score Queries ─────────────────────────────────────────────────────

export async function getUserTrust(userId: number): Promise<UserTrustRow | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, trust_score: true, status: true, cooldown_until: true }
  });

  if (!u) return null;

  return {
    id: u.id,
    trust_score: Number(u.trust_score),
    status: u.status,
    cooldown_until: u.cooldown_until,
  };
}

export async function applyDelta(userId: number, delta: number): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User not found: ${userId}`);

  let newScore = Number(user.trust_score) + delta;
  if (newScore > 100) newScore = 100;
  if (newScore < 0) newScore = 0;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { trust_score: newScore }
  });

  return Number(updated.trust_score);
}

// ─── Ghost Count Queries ─────────────────────────────────────────────────────

export async function countRecentGhosts(
  userId: number,
  windowDays: number
): Promise<number> {
  const windowDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  return prisma.reputationEvent.count({
    where: {
      user_id: userId,
      event_type: 'ghosting_penalty',
      created_at: { gte: windowDate }
    }
  });
}

// ─── User Status Queries ─────────────────────────────────────────────────────

export async function banUser(userId: number) {
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'banned' }
  });
  return { affectedRows: 1 };
}

export async function applyCooldown(
  userId: number,
  durationDays: number
) {
  const cooldownUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'cooldown',
      cooldown_until: cooldownUntil
    }
  });
  return { affectedRows: 1 };
}
