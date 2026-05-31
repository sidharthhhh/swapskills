import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service';
import {
  adminLoginSchema,
  updateUserStatusSchema,
  resolveReportSchema,
  userListFilterSchema,
  auditLogFilterSchema,
  matchListFilterSchema,
  reportListFilterSchema,
  postListFilterSchema,
  addSkillSchema,
} from './admin.schema';
import { AppError } from '../../utils/AppError';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid request data');
    }

    const result = await adminService.loginAdmin(parsed.data.username, parsed.data.password);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// ─── User Management ──────────────────────────────────────────────────────────

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = userListFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid query parameters');
    }

    const result = await adminService.getUsers(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getUserDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      throw new AppError(400, 'Invalid user ID');
    }

    const result = await adminService.getUserDetail(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      throw new AppError(400, 'Invalid user ID');
    }

    const parsed = updateUserStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid request data');
    }

    const adminUser = (req as any).adminUser;
    const result = await adminService.updateUserStatus(
      userId,
      parsed.data.status,
      parsed.data.reason,
      adminUser.id
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Match Management ─────────────────────────────────────────────────────────

export async function getMatches(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = matchListFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid query parameters');
    }

    const result = await adminService.getMatches(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMatchDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const matchId = parseInt(req.params.id as string, 10);
    if (isNaN(matchId)) {
      throw new AppError(400, 'Invalid match ID');
    }

    const result = await adminService.getMatchDetail(matchId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Report Management ────────────────────────────────────────────────────────

export async function getReports(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = reportListFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid query parameters');
    }

    const result = await adminService.getReports(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getReportDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const reportId = parseInt(req.params.id as string, 10);
    if (isNaN(reportId)) {
      throw new AppError(400, 'Invalid report ID');
    }

    const result = await adminService.getReportDetail(reportId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function resolveReport(req: Request, res: Response, next: NextFunction) {
  try {
    const reportId = parseInt(req.params.id as string, 10);
    if (isNaN(reportId)) {
      throw new AppError(400, 'Invalid report ID');
    }

    const parsed = resolveReportSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid request data');
    }

    const adminUser = (req as any).adminUser;
    await adminService.resolveReport(
      reportId,
      parsed.data.resolution,
      adminUser.id,
      parsed.data.notes
    );
    res.status(200).json({ success: true, data: { message: 'Report resolved' } });
  } catch (err) {
    next(err);
  }
}

// ─── Post Management ──────────────────────────────────────────────────────────

export async function getPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = postListFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid query parameters');
    }

    const result = await adminService.getPosts(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function removePost(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string, 10);
    if (isNaN(postId)) {
      throw new AppError(400, 'Invalid post ID');
    }

    const adminUser = (req as any).adminUser;
    await adminService.removePost(postId, adminUser.id);
    res.status(200).json({ success: true, data: { message: 'Post removed' } });
  } catch (err) {
    next(err);
  }
}

// ─── Skills Analytics ─────────────────────────────────────────────────────────

export async function addSkill(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = addSkillSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid request data');
    }

    const adminUser = (req as any).adminUser;
    const result = await adminService.addSkill(parsed.data.name, parsed.data.category, adminUser.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteSkill(req: Request, res: Response, next: NextFunction) {
  try {
    const skillId = parseInt(req.params.id as string, 10);
    if (isNaN(skillId)) {
      throw new AppError(400, 'Invalid skill ID');
    }

    const adminUser = (req as any).adminUser;
    await adminService.deleteSkill(skillId, adminUser.id);
    res.status(200).json({ success: true, data: { message: 'Skill deleted' } });
  } catch (err) {
    next(err);
  }
}

export async function getSkillsAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.getSkillsAnalytics();
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getTrendingSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.getTrendingSkills();
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Reputation Outliers ──────────────────────────────────────────────────────

export async function getReputationOutliers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.getReputationOutliers();
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function getAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = auditLogFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid query parameters');
    }

    const result = await adminService.getAuditLog(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
