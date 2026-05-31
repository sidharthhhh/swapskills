import { Request, Response, NextFunction } from 'express';
import * as skillsService from './skills.service';

/**
 * Skills controller — handles request/response formatting.
 * All responses use the { success, data } envelope.
 */

/**
 * GET /api/skills — list all skills with categories.
 */
export async function listSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const skills = await skillsService.getAllSkills();

    res.status(200).json({
      success: true,
      data: skills,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/skills/categories — skills grouped by category.
 */
export async function listByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await skillsService.getSkillsByCategory();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/skills/gap — skill gap analysis (demand vs supply).
 */
export async function getSkillGap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gap = await skillsService.getSkillGap();

    res.status(200).json({
      success: true,
      data: gap,
    });
  } catch (err) {
    next(err);
  }
}
