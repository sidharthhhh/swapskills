import { Request, Response, NextFunction } from 'express';
import * as chatService from './chat.service';

/**
 * Chat controller — request handling with { success, data } envelope.
 */

// POST /upload — upload a file
export async function uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { message: 'No file provided' } });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    const isImage = req.file.mimetype.startsWith('image/');

    res.status(200).json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        contentType: isImage ? 'image' : 'file',
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /rooms — list chat rooms for authenticated user
export async function getRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const rooms = await chatService.getRoomsForUser(userId);

    res.status(200).json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
}

// GET /rooms/:roomId/messages — paginated message history
export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const roomId = parseInt(req.params.roomId as string, 10);

    if (isNaN(roomId) || roomId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid room ID' } });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await chatService.getMessages(userId, roomId, page, limit);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /rooms/:roomId/messages — send a message via REST
export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const roomId = parseInt(req.params.roomId as string, 10);

    if (isNaN(roomId) || roomId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Invalid room ID' } });
      return;
    }

    const { content, contentType, language, replyToId, fileUrl, fileName, fileSize } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ success: false, error: { message: 'Message content is required' } });
      return;
    }

    // Verify participant access
    await chatService.verifyRoomParticipant(roomId, userId);

    // Send message
    const message = await chatService.sendMessage(
      roomId,
      userId,
      content,
      contentType || 'text',
      language || null,
      replyToId ? parseInt(replyToId, 10) : null,
      fileUrl || null,
      fileName || null,
      fileSize ? parseInt(fileSize, 10) : null
    );

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

// POST /rooms/:roomId/messages/:messageId/reactions — add reaction
export async function addReaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const messageId = parseInt(req.params.messageId as string, 10);
    const roomId = parseInt(req.params.roomId as string, 10);
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      res.status(400).json({ success: false, error: { message: 'Emoji is required' } });
      return;
    }

    await chatService.verifyRoomParticipant(roomId, userId);
    await chatService.addReaction(messageId, userId, emoji);

    res.status(201).json({ success: true, data: { messageId, emoji } });
  } catch (err) {
    next(err);
  }
}

// DELETE /rooms/:roomId/messages/:messageId/reactions/:emoji — remove reaction
export async function removeReaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const messageId = parseInt(req.params.messageId as string, 10);
    const roomId = parseInt(req.params.roomId as string, 10);
    const emoji = decodeURIComponent(req.params.emoji as string);

    await chatService.verifyRoomParticipant(roomId, userId);
    await chatService.removeReaction(messageId, userId, emoji);

    res.status(200).json({ success: true, data: { message: 'Reaction removed' } });
  } catch (err) {
    next(err);
  }
}

// GET /rooms/:roomId/messages/:messageId/reactions — get reactions for a message
export async function getReactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const messageId = parseInt(req.params.messageId as string, 10);
    const roomId = parseInt(req.params.roomId as string, 10);

    await chatService.verifyRoomParticipant(roomId, userId);
    const reactions = await chatService.getReactions(messageId);

    res.status(200).json({ success: true, data: reactions });
  } catch (err) {
    next(err);
  }
}
