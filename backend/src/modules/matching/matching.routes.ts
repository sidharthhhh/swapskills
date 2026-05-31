import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { matchRequestSchema, matchRequestActionSchema, endorseSchema } from './matching.schema';
import * as matchingController from './matching.controller';

const router = Router();

// All matching routes require authentication

// GET /suggestions — get match suggestions
router.get('/suggestions', authenticate, matchingController.getSuggestions);

// POST /request — send a match request
router.post('/request', authenticate, validate(matchRequestSchema), matchingController.sendMatchRequest);

// GET /request — get pending match requests (received)
router.get('/request', authenticate, matchingController.getPendingRequests);

// PUT /request/:id — accept or reject a match request
router.put('/request/:id', authenticate, validate(matchRequestActionSchema), matchingController.handleMatchRequestAction);

// GET / — list active matches
router.get('/', authenticate, matchingController.getActiveMatches);

// GET /:id — match detail
router.get('/:id', authenticate, matchingController.getMatchDetail);

// PUT /:id/complete — mark match as completed
router.put('/:id/complete', authenticate, matchingController.completeMatch);

// POST /:id/endorse — endorse partner after completion
router.post('/:id/endorse', authenticate, validate(endorseSchema), matchingController.endorsePartner);

export default router;
