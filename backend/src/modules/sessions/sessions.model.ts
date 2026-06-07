import prisma from '../../config/prisma';

/**
 * Database access layer for sessions module using Prisma.
 * IDOR prevention: verify match participant before allowing operations.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface SessionRow {
  id: number;
  match_id: number;
  teacher_id: number;
  learner_id: number;
  skill_id: number;
  scheduled_at: Date;
  duration_min: number;
  status: string;
  created_at: Date;
}

export interface SessionNoteRow {
  id: number;
  session_id: number;
  user_id: number;
  content: string;
  created_at: Date;
  username: string;
}

export interface MatchParticipantRow {
  id: number;
  user_a_id: number;
  user_b_id: number;
}

// ─── Match Verification (IDOR Prevention) ────────────────────────────────────

export async function verifyMatchParticipant(
  matchId: number,
  userId: number
): Promise<MatchParticipantRow | null> {
  const m = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ user_a_id: userId }, { user_b_id: userId }]
    },
    select: { id: true, user_a_id: true, user_b_id: true }
  });

  return m ? { id: m.id, user_a_id: m.user_a_id, user_b_id: m.user_b_id } : null;
}

// ─── Session Queries ─────────────────────────────────────────────────────────

export async function createSession(
  matchId: number,
  teacherId: number,
  learnerId: number,
  skillId: number,
  scheduledAt: string,
  durationMin: number
) {
  const session = await prisma.session.create({
    data: {
      match_id: matchId,
      teacher_id: teacherId,
      learner_id: learnerId,
      skill_id: skillId,
      scheduled_at: new Date(scheduledAt),
      duration_min: durationMin,
    }
  });
  return { insertId: session.id };
}

export async function getSessionsByMatchId(matchId: number): Promise<SessionRow[]> {
  const sessions = await prisma.session.findMany({
    where: { match_id: matchId },
    orderBy: { scheduled_at: 'desc' }
  });

  return sessions.map(s => ({
    id: s.id,
    match_id: s.match_id,
    teacher_id: s.teacher_id,
    learner_id: s.learner_id,
    skill_id: s.skill_id,
    scheduled_at: s.scheduled_at,
    duration_min: s.duration_min,
    status: s.status,
    created_at: s.created_at,
  }));
}

export async function getSessionById(sessionId: number): Promise<SessionRow | null> {
  const s = await prisma.session.findUnique({
    where: { id: sessionId }
  });

  if (!s) return null;

  return {
    id: s.id,
    match_id: s.match_id,
    teacher_id: s.teacher_id,
    learner_id: s.learner_id,
    skill_id: s.skill_id,
    scheduled_at: s.scheduled_at,
    duration_min: s.duration_min,
    status: s.status,
    created_at: s.created_at,
  };
}

export async function updateSessionStatus(
  sessionId: number,
  status: 'completed' | 'cancelled' | 'no_show'
) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { status }
  });
  return { affectedRows: 1 };
}

// ─── Session Notes Queries ───────────────────────────────────────────────────

export async function createSessionNote(
  sessionId: number,
  userId: number,
  content: string
) {
  const note = await prisma.sessionNote.create({
    data: {
      session_id: sessionId,
      user_id: userId,
      content,
    }
  });
  return { insertId: note.id };
}

export async function getNotesBySessionId(sessionId: number): Promise<SessionNoteRow[]> {
  const notes = await prisma.sessionNote.findMany({
    where: { session_id: sessionId },
    include: { user: { select: { username: true } } },
    orderBy: { created_at: 'asc' }
  });

  return notes.map(n => ({
    id: n.id,
    session_id: n.session_id,
    user_id: n.user_id,
    content: n.content,
    created_at: n.created_at,
    username: n.user.username,
  }));
}
