import prisma from '../../config/prisma';

/**
 * Database access layer for matching module using Prisma.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface SuggestionRow {
  id: number;
  uid: string;
  username: string;
  trust_score: number;
  teach_skill_id: number;
  teach_skill_name: string;
  learn_skill_id: number;
  learn_skill_name: string;
}

export interface MatchRequestRow {
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

export interface MatchRow {
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
  chat_room_id: number;
}

// ─── Suggestion Queries ──────────────────────────────────────────────────────

export async function findComplementaryUsers(
  userId: number,
  userTeachSkillIds: number[],
  userLearnSkillIds: number[]
): Promise<SuggestionRow[]> {
  if (userTeachSkillIds.length === 0 || userLearnSkillIds.length === 0) {
    return [];
  }

  // Get blocked and blocking users
  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { blocker_id: userId },
        { blocked_id: userId }
      ]
    }
  });

  const excludedUserIds = new Set<number>();
  blocks.forEach((b: any) => {
    if (b.blocker_id === userId) excludedUserIds.add(b.blocked_id);
    if (b.blocked_id === userId) excludedUserIds.add(b.blocker_id);
  });
  excludedUserIds.add(userId);

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(excludedUserIds) },
      status: 'active',
      trust_score: { gte: 10 },
      OR: [
        { cooldown_until: null },
        { cooldown_until: { lt: new Date() } }
      ],
      teachSkills: { some: { skill_id: { in: userLearnSkillIds } } },
      learnSkills: { some: { skill_id: { in: userTeachSkillIds } } },
    },
    include: {
      teachSkills: {
        where: { skill_id: { in: userLearnSkillIds } },
        include: { skill: true }
      },
      learnSkills: {
        where: { skill_id: { in: userTeachSkillIds } },
        include: { skill: true }
      }
    },
    orderBy: { trust_score: 'desc' },
    take: 20
  });

  const suggestions: SuggestionRow[] = [];
  
  for (const u of users) {
    // Generate pairs for all matching skills
    for (const ts of u.teachSkills) {
      for (const ls of u.learnSkills) {
        suggestions.push({
          id: u.id,
          uid: u.uid,
          username: u.username,
          trust_score: Number(u.trust_score),
          teach_skill_id: ts.skill_id,
          teach_skill_name: ts.skill.name,
          learn_skill_id: ls.skill_id,
          learn_skill_name: ls.skill.name,
        });
      }
    }
  }

  // Since the original returned distinct rows based on first match, we just return the flattened array
  // In a real app we might just return 1 pair per user, let's just group by user id and pick first
  const uniqueUsersMap = new Map<number, SuggestionRow>();
  for (const s of suggestions) {
    if (!uniqueUsersMap.has(s.id)) {
      uniqueUsersMap.set(s.id, s);
    }
  }

  return Array.from(uniqueUsersMap.values());
}

// ─── Match Request Queries ───────────────────────────────────────────────────

export async function createMatchRequest(
  senderId: number,
  receiverId: number,
  teachSkillId: number,
  learnSkillId: number
) {
  const req = await prisma.matchRequest.create({
    data: {
      sender_id: senderId,
      receiver_id: receiverId,
      teach_skill_id: teachSkillId,
      learn_skill_id: learnSkillId,
    }
  });
  return { insertId: req.id };
}

export async function getMatchRequestById(requestId: number): Promise<MatchRequestRow | null> {
  const req = await prisma.matchRequest.findUnique({
    where: { id: requestId },
    include: {
      sender: { select: { username: true } },
      receiver: { select: { username: true } },
    }
  });

  if (!req) return null;

  // We need the skill names, so we have to fetch them
  const teachSkill = await prisma.skill.findUnique({ where: { id: req.teach_skill_id } });
  const learnSkill = await prisma.skill.findUnique({ where: { id: req.learn_skill_id } });

  return {
    id: req.id,
    sender_id: req.sender_id,
    receiver_id: req.receiver_id,
    teach_skill_id: req.teach_skill_id,
    learn_skill_id: req.learn_skill_id,
    status: req.status,
    created_at: req.created_at,
    sender_username: req.sender.username,
    receiver_username: req.receiver.username,
    teach_skill_name: teachSkill?.name || '',
    learn_skill_name: learnSkill?.name || '',
  };
}

export async function getPendingRequestsForUser(userId: number): Promise<MatchRequestRow[]> {
  const reqs = await prisma.matchRequest.findMany({
    where: { receiver_id: userId, status: 'pending' },
    include: {
      sender: { select: { username: true } },
      receiver: { select: { username: true } },
    },
    orderBy: { created_at: 'desc' }
  });

  // To optimize, we could fetch all unique skill ids, but let's just do it sequentially or use queryRaw
  const results: MatchRequestRow[] = [];
  for (const req of reqs) {
    const teachSkill = await prisma.skill.findUnique({ where: { id: req.teach_skill_id } });
    const learnSkill = await prisma.skill.findUnique({ where: { id: req.learn_skill_id } });
    results.push({
      id: req.id,
      sender_id: req.sender_id,
      receiver_id: req.receiver_id,
      teach_skill_id: req.teach_skill_id,
      learn_skill_id: req.learn_skill_id,
      status: req.status,
      created_at: req.created_at,
      sender_username: req.sender.username,
      receiver_username: req.receiver.username,
      teach_skill_name: teachSkill?.name || '',
      learn_skill_name: learnSkill?.name || '',
    });
  }

  return results;
}

export async function updateMatchRequestStatus(
  requestId: number,
  status: 'accepted' | 'rejected'
) {
  await prisma.matchRequest.update({
    where: { id: requestId },
    data: { status }
  });
  return { affectedRows: 1 };
}

export async function hasPendingRequest(
  senderId: number,
  receiverId: number
): Promise<boolean> {
  const req = await prisma.matchRequest.findFirst({
    where: { sender_id: senderId, receiver_id: receiverId, status: 'pending' }
  });
  return req !== null;
}

// ─── Match Queries ───────────────────────────────────────────────────────────

export async function createMatchWithChatRoom(
  userAId: number,
  userBId: number,
  skillATeachesB: number,
  skillBTeachesA: number
): Promise<number> {
  const match = await prisma.$transaction(async (tx: any) => {
    const newMatch = await tx.match.create({
      data: {
        user_a_id: userAId,
        user_b_id: userBId,
        skill_a_teaches_b: skillATeachesB,
        skill_b_teaches_a: skillBTeachesA,
      }
    });

    await tx.chatRoom.create({
      data: { match_id: newMatch.id }
    });

    return newMatch;
  });

  return match.id;
}

export async function getActiveMatchesForUser(userId: number): Promise<MatchRow[]> {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ user_a_id: userId }, { user_b_id: userId }],
      status: 'active'
    },
    include: {
      userA: { select: { username: true } },
      userB: { select: { username: true } },
      chatRoom: { select: { id: true } }
    },
    orderBy: { created_at: 'desc' }
  });

  const results: MatchRow[] = [];
  for (const m of matches) {
    const s1 = await prisma.skill.findUnique({ where: { id: m.skill_a_teaches_b } });
    const s2 = await prisma.skill.findUnique({ where: { id: m.skill_b_teaches_a } });

    results.push({
      id: m.id,
      user_a_id: m.user_a_id,
      user_b_id: m.user_b_id,
      skill_a_teaches_b: m.skill_a_teaches_b,
      skill_b_teaches_a: m.skill_b_teaches_a,
      status: m.status,
      sessions_a: m.sessions_a,
      sessions_b: m.sessions_b,
      created_at: m.created_at,
      user_a_username: m.userA.username,
      user_b_username: m.userB.username,
      skill_a_name: s1?.name || '',
      skill_b_name: s2?.name || '',
      chat_room_id: m.chatRoom ? m.chatRoom.id : 0,
    });
  }

  return results;
}

export async function getMatchById(matchId: number): Promise<MatchRow | null> {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      userA: { select: { username: true } },
      userB: { select: { username: true } },
      chatRoom: { select: { id: true } }
    }
  });

  if (!m) return null;

  const s1 = await prisma.skill.findUnique({ where: { id: m.skill_a_teaches_b } });
  const s2 = await prisma.skill.findUnique({ where: { id: m.skill_b_teaches_a } });

  return {
    id: m.id,
    user_a_id: m.user_a_id,
    user_b_id: m.user_b_id,
    skill_a_teaches_b: m.skill_a_teaches_b,
    skill_b_teaches_a: m.skill_b_teaches_a,
    status: m.status,
    sessions_a: m.sessions_a,
    sessions_b: m.sessions_b,
    created_at: m.created_at,
    user_a_username: m.userA.username,
    user_b_username: m.userB.username,
    skill_a_name: s1?.name || '',
    skill_b_name: s2?.name || '',
    chat_room_id: m.chatRoom ? m.chatRoom.id : 0,
  };
}

export async function updateMatchStatus(
  matchId: number,
  status: 'completed' | 'stalled' | 'ghosted'
) {
  await prisma.match.update({
    where: { id: matchId },
    data: { status }
  });
  return { affectedRows: 1 };
}

// ─── Endorsement Queries ─────────────────────────────────────────────────────

export async function createEndorsement(
  endorserId: number,
  endorsedId: number,
  skillId: number,
  matchId: number,
  rating: number
) {
  const end = await prisma.skillEndorsement.create({
    data: {
      endorser_id: endorserId,
      endorsed_id: endorsedId,
      skill_id: skillId,
      match_id: matchId,
      rating,
    }
  });
  return { insertId: end.id };
}

export async function hasEndorsed(
  endorserId: number,
  endorsedId: number,
  matchId: number
): Promise<boolean> {
  const end = await prisma.skillEndorsement.findFirst({
    where: { endorser_id: endorserId, endorsed_id: endorsedId, match_id: matchId }
  });
  return end !== null;
}

// ─── Helper Queries ──────────────────────────────────────────────────────────

export async function getUserTeachSkillIds(userId: number): Promise<number[]> {
  const rows = await prisma.userTeachSkill.findMany({
    where: { user_id: userId },
    select: { skill_id: true }
  });
  return rows.map((r: any) => r.skill_id);
}

export async function getUserLearnSkillIds(userId: number): Promise<number[]> {
  const rows = await prisma.userLearnSkill.findMany({
    where: { user_id: userId },
    select: { skill_id: true }
  });
  return rows.map((r: any) => r.skill_id);
}
