import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { createSessionSchema, updateSessionStatusSchema, createSessionNoteSchema } from './sessions.schema';
import * as sessionsController from './sessions.controller';

const router = Router();

// All session routes require authentication

// POST / — schedule a session
router.post('/', authenticate, validate(createSessionSchema), sessionsController.scheduleSession);

// GET /match/:matchId — list sessions for a match
router.get('/match/:matchId', authenticate, sessionsController.getSessionsByMatch);

// PUT /:id/status — update session status
router.put('/:id/status', authenticate, validate(updateSessionStatusSchema), sessionsController.updateSessionStatus);

// POST /:id/notes — add session notes
router.post('/:id/notes', authenticate, validate(createSessionNoteSchema), sessionsController.addSessionNote);

// GET /:id/notes — get session notes
router.get('/:id/notes', authenticate, sessionsController.getSessionNotes);

export default router;
