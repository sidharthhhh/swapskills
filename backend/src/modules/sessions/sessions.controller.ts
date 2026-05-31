import { Request, Response, NextFunction } from 'express';
import * as sessionsService from './sessions.service';
import type { CreateSessionInput, UpdateSessionStatusInput, CreateSessionNoteInput } from './sessions.schema';

/**
 * Sessions controller — request handling with { success, data } envelope.
 */

// POST / — schedule a session
export async function scheduleSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const { matchId, skillId, scheduledAt, durationMin } = req.body as CreateSessionInput;

    const result = await sessionsService.scheduleSession(
      userId,
      matchId,
      skillId,
      scheduledAt,
      durationMin
    );

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /match/:matchId — list sessions for a match
export async function getSessionsByMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const matchId = parseInt(req.params.matchId as string, 10);

    if (isNaN(matchId) || matchId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid match ID' } });
      return;
    }

    const sessions = await sessionsService.getSessionsByMatch(userId, matchId);

    res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
}

// PUT /:id/status — update session status
export async function updateSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const sessionId = parseInt(req.params.id as string, 10);

    if (isNaN(sessionId) || sessionId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid session ID' } });
      return;
    }

    const { status } = req.body as UpdateSessionStatusInput;
    const result = await sessionsService.updateSessionStatus(userId, sessionId, status);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /:id/notes — add session notes
export async function addSessionNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const sessionId = parseInt(req.params.id as string, 10);

    if (isNaN(sessionId) || sessionId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid session ID' } });
      return;
    }

    const { content } = req.body as CreateSessionNoteInput;
    const result = await sessionsService.addSessionNote(userId, sessionId, content);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /:id/notes — get session notes
export async function getSessionNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const sessionId = parseInt(req.params.id as string, 10);

    if (isNaN(sessionId) || sessionId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid session ID' } });
      return;
    }

    const notes = await sessionsService.getSessionNotes(userId, sessionId);

    res.status(200).json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
}
