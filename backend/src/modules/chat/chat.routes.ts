import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { upload } from '../../middlewares/upload';
import * as chatController from './chat.controller';

const router = Router();

// All chat routes require authentication

// POST /upload — upload a file for chat
router.post('/upload', authenticate, upload.single('file'), chatController.uploadFile);

// GET /rooms — list chat rooms for authenticated user
router.get('/rooms', authenticate, chatController.getRooms);

// GET /rooms/:roomId/messages — paginated message history
router.get('/rooms/:roomId/messages', authenticate, chatController.getMessages);

// POST /rooms/:roomId/messages — send a message via REST
router.post('/rooms/:roomId/messages', authenticate, chatController.sendMessage);

// POST /rooms/:roomId/messages/:messageId/reactions — add reaction
router.post('/rooms/:roomId/messages/:messageId/reactions', authenticate, chatController.addReaction);

// DELETE /rooms/:roomId/messages/:messageId/reactions/:emoji — remove reaction
router.delete('/rooms/:roomId/messages/:messageId/reactions/:emoji', authenticate, chatController.removeReaction);

// GET /rooms/:roomId/messages/:messageId/reactions — get reactions for a message
router.get('/rooms/:roomId/messages/:messageId/reactions', authenticate, chatController.getReactions);

export default router;
