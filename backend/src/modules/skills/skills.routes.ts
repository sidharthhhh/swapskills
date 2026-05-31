import { Router } from 'express';
import * as skillsController from './skills.controller';

const router = Router();

// GET /api/skills — list all skills with categories (public, no auth required)
router.get('/', skillsController.listSkills);

// GET /api/skills/categories — skills grouped by category (public, no auth required)
router.get('/categories', skillsController.listByCategory);

// GET /api/skills/gap — demand vs supply map (public, no auth required)
router.get('/gap', skillsController.getSkillGap);

export default router;
