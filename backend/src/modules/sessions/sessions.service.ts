import * as sessionsModel from './sessions.model';
import { applyReputationEvent } from '../reputation/reputation.service';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';

/**
 * Sessions service — business logic for scheduling, status updates, notes,
 * and reputation event triggers on completion/no-show.
 */

// ─── Schedule Session ────────────────────────────────────────────────────────

/**
 * Schedule a new session for a match.
 * IDOR prevention: verifies the user is a participant of the match.
 * The authenticated user is the learner; the other participant is the teacher.
 */
export async function scheduleSession(
  userId: number,
  matchId: number,
  skillId: number,
  scheduledAt: string,
  durationMin: number
) {
  // Verify user is a participant of the match
  const match = await sessionsModel.verifyMatchParticipant(matchId, userId);
  if (!match) {
    throw new AppError(403, 'Access denied');
  }

  // Determine teacher and learner based on who is scheduling
  // The scheduler is the learner; the other participant is the teacher
  const teacherId = match.user_a_id === userId ? match.user_b_id : match.user_a_id;
  const learnerId = userId;

  const result = await sessionsModel.createSession(
    matchId,
    teacherId,
    learnerId,
    skillId,
    scheduledAt,
    durationMin
  );

  logger.info('Session scheduled', {
    sessionId: result.insertId,
    matchId,
    teacherId,
    learnerId,
    skillId,
    scheduledAt,
  });

  return {
    id: result.insertId,
    matchId,
    teacherId,
    learnerId,
    skillId,
    scheduledAt,
    durationMin,
    status: 'scheduled',
  };
}

// ─── Get Sessions by Match ───────────────────────────────────────────────────

/**
 * Get all sessions for a match.
 * IDOR prevention: verifies the user is a participant of the match.
 */
export async function getSessionsByMatch(userId: number, matchId: number) {
  // Verify user is a participant of the match
  const match = await sessionsModel.verifyMatchParticipant(matchId, userId);
  if (!match) {
    throw new AppError(403, 'Access denied');
  }

  const sessions = await sessionsModel.getSessionsByMatchId(matchId);

  return sessions.map((s) => ({
    id: s.id,
    matchId: s.match_id,
    teacherId: s.teacher_id,
    learnerId: s.learner_id,
    skillId: s.skill_id,
    scheduledAt: s.scheduled_at,
    durationMin: s.duration_min,
    status: s.status,
    createdAt: s.created_at,
  }));
}

// ─── Update Session Status ───────────────────────────────────────────────────

/**
 * Update session status. Triggers reputation events on completion or no-show.
 * IDOR prevention: verifies the user is a participant of the session's match.
 *
 * On 'completed': triggers 'session_complete' for both teacher and learner.
 * On 'no_show': triggers 'no_show_penalty' for the no-show user (the other participant).
 */
export async function updateSessionStatus(
  userId: number,
  sessionId: number,
  status: 'completed' | 'cancelled' | 'no_show'
) {
  const session = await sessionsModel.getSessionById(sessionId);
  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  // Verify user is a participant of the session's match
  const match = await sessionsModel.verifyMatchParticipant(session.match_id, userId);
  if (!match) {
    throw new AppError(403, 'Access denied');
  }

  // Only allow status change from 'scheduled'
  if (session.status !== 'scheduled') {
    throw new AppError(400, `Session status is already '${session.status}'`);
  }

  await sessionsModel.updateSessionStatus(sessionId, status);

  logger.info('Session status updated', { sessionId, status, userId });

  // Trigger reputation events
  if (status === 'completed') {
    // Both participants get session_complete reputation event
    await applyReputationEvent(
      session.teacher_id,
      'session_complete',
      `Session ${sessionId} completed`
    );
    await applyReputationEvent(
      session.learner_id,
      'session_complete',
      `Session ${sessionId} completed`
    );
    logger.info('Reputation events triggered for session completion', {
      sessionId,
      teacherId: session.teacher_id,
      learnerId: session.learner_id,
    });
  } else if (status === 'no_show') {
    // The user reporting the no-show is present; the other participant is the no-show
    const noShowUserId = session.teacher_id === userId
      ? session.learner_id
      : session.teacher_id;

    await applyReputationEvent(
      noShowUserId,
      'no_show_penalty',
      `No-show for session ${sessionId}`
    );
    logger.info('Reputation event triggered for no-show', {
      sessionId,
      noShowUserId,
      reportedBy: userId,
    });
  }

  return { id: sessionId, status };
}

// ─── Session Notes ───────────────────────────────────────────────────────────

/**
 * Add a note to a session.
 * IDOR prevention: verifies the user is a participant of the session's match.
 */
export async function addSessionNote(
  userId: number,
  sessionId: number,
  content: string
) {
  const session = await sessionsModel.getSessionById(sessionId);
  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  // Verify user is a participant of the session's match
  const match = await sessionsModel.verifyMatchParticipant(session.match_id, userId);
  if (!match) {
    throw new AppError(403, 'Access denied');
  }

  const result = await sessionsModel.createSessionNote(sessionId, userId, content);

  logger.info('Session note added', { noteId: result.insertId, sessionId, userId });

  return {
    id: result.insertId,
    sessionId,
    userId,
    content,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get all notes for a session.
 * IDOR prevention: verifies the user is a participant of the session's match.
 */
export async function getSessionNotes(userId: number, sessionId: number) {
  const session = await sessionsModel.getSessionById(sessionId);
  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  // Verify user is a participant of the session's match
  const match = await sessionsModel.verifyMatchParticipant(session.match_id, userId);
  if (!match) {
    throw new AppError(403, 'Access denied');
  }

  const notes = await sessionsModel.getNotesBySessionId(sessionId);

  return notes.map((n) => ({
    id: n.id,
    sessionId: n.session_id,
    userId: n.user_id,
    username: n.username,
    content: n.content,
    createdAt: n.created_at,
  }));
}
