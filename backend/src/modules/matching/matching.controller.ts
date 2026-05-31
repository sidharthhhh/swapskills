import { Request, Response, NextFunction } from 'express';
import * as matchingService from './matching.service';
import type { MatchRequestInput, MatchRequestActionInput, EndorseInput } from './matching.schema';

/**
 * Matching controller — request handling with { success, data } envelope.
 */

// GET /suggestions — get match suggestions
export async function getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const suggestions = await matchingService.getSuggestions(userId);

    res.status(200).json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
}

// POST /request — send a match request
export async function sendMatchRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const { receiverId, teachSkillId, learnSkillId } = req.body as MatchRequestInput;
    const result = await matchingService.sendMatchRequest(userId, receiverId, teachSkillId, learnSkillId);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /request — get pending match requests (received)
export async function getPendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const requests = await matchingService.getPendingRequests(userId);

    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

// PUT /request/:id — accept or reject a match request
export async function handleMatchRequestAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const requestId = parseInt(req.params.id as string, 10);

    if (isNaN(requestId) || requestId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid request ID' } });
      return;
    }

    const { action } = req.body as MatchRequestActionInput;
    const result = await matchingService.handleMatchRequestAction(userId, requestId, action);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET / — list active matches
export async function getActiveMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const matches = await matchingService.getActiveMatches(userId);

    res.status(200).json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
}

// GET /:id — match detail
export async function getMatchDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const matchId = parseInt(req.params.id as string, 10);

    if (isNaN(matchId) || matchId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid match ID' } });
      return;
    }

    const match = await matchingService.getMatchDetail(userId, matchId);

    res.status(200).json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
}

// PUT /:id/complete — mark match as completed
export async function completeMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const matchId = parseInt(req.params.id as string, 10);

    if (isNaN(matchId) || matchId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid match ID' } });
      return;
    }

    const result = await matchingService.completeMatch(userId, matchId);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /:id/endorse — endorse partner
export async function endorsePartner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const matchId = parseInt(req.params.id as string, 10);

    if (isNaN(matchId) || matchId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid match ID' } });
      return;
    }

    const { skillId, rating } = req.body as EndorseInput;
    const result = await matchingService.endorsePartner(userId, matchId, skillId, rating);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
