import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import type { UpdateProfileInput, AddSkillInput, CreateReportInput } from './users.schema';

/**
 * Users controller — request handling with { success, data } envelope.
 */

// GET /me — own profile
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const profile = await usersService.getOwnProfile(userId);

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

// PUT /me — update profile
export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const data = req.body as UpdateProfileInput;
    const profile = await usersService.updateProfile(userId, data);

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

// DELETE /me — GDPR cascade delete
export async function deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const userUid = (req as any).user.uid;
    await usersService.deleteAccount(userId, userUid);

    res.status(200).json({ success: true, data: { message: 'Account deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

// GET /:uid — public anonymous profile
export async function getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = req.params.uid as string;
    const profile = await usersService.getPublicProfile(uid);

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

// POST /me/skills/teach — add teach skill
export async function addTeachSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const { skillId } = req.body as AddSkillInput;
    const skills = await usersService.addTeachSkill(userId, skillId);

    res.status(201).json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
}

// POST /me/skills/learn — add learn skill
export async function addLearnSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const { skillId } = req.body as AddSkillInput;
    const skills = await usersService.addLearnSkill(userId, skillId);

    res.status(201).json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
}

// DELETE /me/skills/teach/:skillId — remove teach skill
export async function removeTeachSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const skillId = parseInt(req.params.skillId as string, 10);

    if (isNaN(skillId) || skillId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid skill ID' } });
      return;
    }

    await usersService.removeTeachSkill(userId, skillId);
    res.status(200).json({ success: true, data: { message: 'Skill removed' } });
  } catch (err) {
    next(err);
  }
}

// DELETE /me/skills/learn/:skillId — remove learn skill
export async function removeLearnSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const skillId = parseInt(req.params.skillId as string, 10);

    if (isNaN(skillId) || skillId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid skill ID' } });
      return;
    }

    await usersService.removeLearnSkill(userId, skillId);
    res.status(200).json({ success: true, data: { message: 'Skill removed' } });
  } catch (err) {
    next(err);
  }
}

// POST /me/block/:uid — block a user
export async function blockUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const blockerId = (req as any).user.id;
    const uid = req.params.uid as string;

    await usersService.blockUser(blockerId, uid);
    res.status(201).json({ success: true, data: { message: 'User blocked' } });
  } catch (err) {
    next(err);
  }
}

// DELETE /me/block/:uid — unblock a user
export async function unblockUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const blockerId = (req as any).user.id;
    const uid = req.params.uid as string;

    await usersService.unblockUser(blockerId, uid);
    res.status(200).json({ success: true, data: { message: 'User unblocked' } });
  } catch (err) {
    next(err);
  }
}

// POST /me/report — file a report
export async function createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reporterId = (req as any).user.id;
    const { targetType, targetId, reason, detail } = req.body as CreateReportInput;

    await usersService.createReport(reporterId, targetType, targetId, reason, detail);
    res.status(201).json({ success: true, data: { message: 'Report submitted' } });
  } catch (err) {
    next(err);
  }
}

// GET /me/skills/gap — skill gap analysis
export async function getSkillGap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const gap = await usersService.getSkillGap(userId);

    res.status(200).json({ success: true, data: gap });
  } catch (err) {
    next(err);
  }
}

// GET /search — search users by username
export async function searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const searchTerm = req.query.q as string || '';
    const results = await usersService.searchUsers(searchTerm);

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}
