import { Server, Namespace, Socket } from 'socket.io';
import { verifyToken } from '../utils/tokenService';
import { logger } from '../config/logger';
import { checkSocketRateLimit } from './rateLimiter';
import * as chatService from '../modules/chat/chat.service';

/**
 * Authenticated socket interface with user data attached.
 */
interface AuthenticatedSocket extends Socket {
  data: {
    userId: number;
    uid: string;
    username: string;
  };
}

/**
 * Register the /chat namespace on the Socket.IO server.
 * Handles: JWT auth, join_room, send_message, typing, read events.
 */
export function registerChatHandler(io: Server): void {
  const chatNamespace: Namespace = io.of('/chat');

  // ─── JWT Auth Middleware ──────────────────────────────────────────────────

  chatNamespace.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn('Socket auth failed: no token provided', {
          socketId: socket.id,
        });
        return next(new Error('Authentication required'));
      }

      const payload = verifyToken(token);

      if (!payload.sub) {
        return next(new Error('Invalid token payload'));
      }

      // Look up user to get numeric ID and username
      const { findUserByUid } = await import('../modules/auth/auth.model');
      const user = await findUserByUid(payload.sub);

      if (!user) {
        return next(new Error('User not found'));
      }

      if (user.status === 'banned' || user.status === 'suspended') {
        return next(new Error('Account is not active'));
      }

      // Attach user data to socket
      socket.data.userId = user.id;
      socket.data.uid = user.uid;
      socket.data.username = user.username;

      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      logger.warn('Socket auth failed', { socketId: socket.id, reason: message });
      next(new Error('Authentication failed'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────────────────

  chatNamespace.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, username } = authSocket.data;

    logger.info('Socket connected', {
      socketId: socket.id,
      userId,
      username,
      namespace: '/chat',
    });

    // ─── join_room ────────────────────────────────────────────────────────

    socket.on('join_room', async (data: { roomId: number }) => {
      try {
        // Rate limit check
        const allowed = await checkSocketRateLimit(userId);
        if (!allowed) {
          socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many events. Please slow down.' });
          return;
        }

        const { roomId } = data;

        if (!roomId || typeof roomId !== 'number') {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid room ID' });
          return;
        }

        // Verify user is a participant of the match/room
        await chatService.verifyRoomParticipant(roomId, userId);

        // Join the Socket.IO room
        const roomName = `room:${roomId}`;
        socket.join(roomName);

        logger.info('User joined chat room', { userId, username, roomId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to join room';
        socket.emit('error', { code: 'JOIN_FAILED', message });
      }
    });

    // ─── send_message ─────────────────────────────────────────────────────

    socket.on(
      'send_message',
      async (data: { roomId: number; content: string; contentType?: 'text' | 'code'; language?: string }) => {
        try {
          // Rate limit check
          const allowed = await checkSocketRateLimit(userId);
          if (!allowed) {
            socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many events. Please slow down.' });
            return;
          }

          const { roomId, content, contentType, language } = data;

          if (!roomId || typeof roomId !== 'number') {
            socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid room ID' });
            return;
          }

          if (!content || typeof content !== 'string') {
            socket.emit('error', { code: 'INVALID_INPUT', message: 'Message content is required' });
            return;
          }

          // Verify user is a participant
          await chatService.verifyRoomParticipant(roomId, userId);

          // Sanitize, persist, and get the message object
          const message = await chatService.sendMessage(
            roomId,
            userId,
            content,
            contentType || 'text',
            language || null
          );

          // Broadcast to all users in the room (including sender)
          const roomName = `room:${roomId}`;
          chatNamespace.to(roomName).emit('new_message', message);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to send message';
          socket.emit('error', { code: 'SEND_FAILED', message });
        }
      }
    );

    // ─── typing ───────────────────────────────────────────────────────────

    socket.on('typing', async (data: { roomId: number }) => {
      try {
        // Rate limit check
        const allowed = await checkSocketRateLimit(userId);
        if (!allowed) {
          return; // Silently drop typing events when rate limited
        }

        const { roomId } = data;

        if (!roomId || typeof roomId !== 'number') {
          return;
        }

        // Broadcast typing indicator to other participants in the room
        const roomName = `room:${roomId}`;
        socket.to(roomName).emit('typing', { username });
      } catch {
        // Silently ignore typing errors
      }
    });

    // ─── read ─────────────────────────────────────────────────────────────

    socket.on('read', async (data: { roomId: number }) => {
      try {
        // Rate limit check
        const allowed = await checkSocketRateLimit(userId);
        if (!allowed) {
          socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many events. Please slow down.' });
          return;
        }

        const { roomId } = data;

        if (!roomId || typeof roomId !== 'number') {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid room ID' });
          return;
        }

        // Verify user is a participant
        await chatService.verifyRoomParticipant(roomId, userId);

        // Mark messages as read
        const readAt = await chatService.markAsRead(roomId, userId);

        // Emit read receipt to all in the room
        const roomName = `room:${roomId}`;
        chatNamespace.to(roomName).emit('read_receipt', { readAt, readerId: userId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to mark as read';
        socket.emit('error', { code: 'READ_FAILED', message });
      }
    });

    // ─── disconnect ───────────────────────────────────────────────────────

    socket.on('disconnect', (reason: string) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId,
        username,
        reason,
        namespace: '/chat',
      });
    });
  });
}
