import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { updateProfileSchema, addSkillSchema, createReportSchema } from './users.schema';
import * as usersController from './users.controller';

const router = Router();

// ─── Protected routes (require authentication) ───────────────────────────────
// NOTE: /me routes MUST be defined before /:uid to avoid Express treating "me" as a uid param

// GET /me — own profile
router.get('/me', authenticate, usersController.getMe);

// PUT /me — update bio, availability, experience
router.put('/me', authenticate, validate(updateProfileSchema), usersController.updateMe);

// DELETE /me — GDPR cascade delete
router.delete('/me', authenticate, usersController.deleteMe);

// GET /me/skills/gap — skill gap analysis
router.get('/me/skills/gap', authenticate, usersController.getSkillGap);

// POST /me/skills/teach — add teach skill
router.post('/me/skills/teach', authenticate, validate(addSkillSchema), usersController.addTeachSkill);

// POST /me/skills/learn — add learn skill
router.post('/me/skills/learn', authenticate, validate(addSkillSchema), usersController.addLearnSkill);

// DELETE /me/skills/teach/:skillId — remove teach skill
router.delete('/me/skills/teach/:skillId', authenticate, usersController.removeTeachSkill);

// DELETE /me/skills/learn/:skillId — remove learn skill
router.delete('/me/skills/learn/:skillId', authenticate, usersController.removeLearnSkill);

// POST /me/block/:uid — block a user
router.post('/me/block/:uid', authenticate, usersController.blockUser);

// DELETE /me/block/:uid — unblock
router.delete('/me/block/:uid', authenticate, usersController.unblockUser);

// POST /me/report — file a report
router.post('/me/report', authenticate, validate(createReportSchema), usersController.createReport);

// ─── Public routes ───────────────────────────────────────────────────────────

// GET /search — search users by username (auth required)
router.get('/search', authenticate, usersController.searchUsers);

// GET /:uid — public anonymous profile (no auth required)
router.get('/:uid', usersController.getPublicProfile);

export default router;
