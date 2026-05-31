import * as chatModel from './chat.model';
import { AppError } from '../../utils/AppError';
import { sanitizeChatMessage } from '../../utils/sanitize';
import { logger } from '../../config/logger';

/**
 * Chat service — business logic for chat rooms and messages.
 */

// ─── Rooms ───────────────────────────────────────────────────────────────────

/**
 * Get all chat rooms for the authenticated user.
 */
export async function getRoomsForUser(userId: number) {
  const rooms = await chatModel.getRoomsForUser(userId);

  return rooms.map((r) => ({
    id: r.id,
    matchId: r.match_id,
    partnerUsername: r.partner_username,
    partnerId: r.partner_id,
    lastMessageContent: r.last_message_content,
    lastMessageAt: r.last_message_at,
    unreadCount: r.unread_count,
    createdAt: r.created_at,
  }));
}

/**
 * Verify that a user is a participant of a chat room.
 * Returns the room info if valid, throws if not.
 */
export async function verifyRoomParticipant(roomId: number, userId: number) {
  const room = await chatModel.getRoomWithParticipants(roomId);

  if (!room) {
    throw new AppError(404, 'Chat room not found');
  }

  if (room.user_a_id !== userId && room.user_b_id !== userId) {
    throw new AppError(403, 'Access denied: you are not a participant of this chat room');
  }

  return room;
}

// ─── Messages ────────────────────────────────────────────────────────────────

/**
 * Get paginated messages for a chat room.
 * Verifies the user is a participant before returning messages.
 */
export async function getMessages(userId: number, roomId: number, page: number, limit: number) {
  // Verify participant access
  await verifyRoomParticipant(roomId, userId);

  const [messages, total] = await Promise.all([
    chatModel.getMessagesForRoom(roomId, page, limit),
    chatModel.getMessageCountForRoom(roomId),
  ]);

  // Batch load reactions for all messages
  const messageIds = messages.map((m) => m.id);
  const allReactions = await chatModel.getReactionsForMessages(messageIds);

  // Group reactions by message_id
  const reactionsMap: Record<number, Array<{ emoji: string; count: number; users: string[] }>> = {};
  for (const r of allReactions) {
    if (!reactionsMap[r.message_id]) {
      reactionsMap[r.message_id] = [];
    }
    reactionsMap[r.message_id].push({
      emoji: r.emoji,
      count: Number(r.count),
      users: r.users ? r.users.split(',') : [],
    });
  }

  const totalPages = Math.ceil(total / limit);

  return {
    messages: messages.map((m) => ({
      id: m.id,
      roomId: m.room_id,
      senderId: m.sender_id,
      senderUsername: m.sender_username,
      content: m.content,
      contentType: m.content_type,
      language: m.language,
      readAt: m.read_at,
      createdAt: m.created_at,
      replyToId: m.reply_to_id,
      replyContent: m.reply_content,
      replyUsername: m.reply_username,
      fileUrl: m.file_url,
      fileName: m.file_name,
      fileSize: m.file_size,
      reactions: reactionsMap[m.id] || [],
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Send a message in a chat room.
 * Sanitizes content, persists to DB, returns the created message.
 */
export async function sendMessage(
  roomId: number,
  senderId: number,
  content: string,
  contentType: 'text' | 'code' | 'image' | 'file' = 'text',
  language: string | null = null,
  replyToId: number | null = null,
  fileUrl: string | null = null,
  fileName: string | null = null,
  fileSize: number | null = null
) {
  // Sanitize message content
  const sanitizedContent = sanitizeChatMessage(content);

  if (!sanitizedContent || sanitizedContent.length === 0) {
    throw new AppError(400, 'Message content cannot be empty');
  }

  // Persist message
  const result = await chatModel.createMessage(
    roomId,
    senderId,
    sanitizedContent,
    contentType,
    language,
    replyToId,
    fileUrl,
    fileName,
    fileSize
  );

  // Fetch the created message with sender info
  const message = await chatModel.getMessageById(result.insertId);

  if (!message) {
    throw new AppError(500, 'Failed to create message');
  }

  logger.info('Message sent', { roomId, senderId, messageId: result.insertId });

  return {
    id: message.id,
    roomId: message.room_id,
    senderId: message.sender_id,
    senderUsername: message.sender_username,
    content: message.content,
    contentType: message.content_type,
    language: message.language,
    readAt: message.read_at,
    createdAt: message.created_at,
    replyToId: message.reply_to_id,
    replyContent: message.reply_content,
    replyUsername: message.reply_username,
    fileUrl: message.file_url,
    fileName: message.file_name,
    fileSize: message.file_size,
  };
}

/**
 * Mark all messages in a room as read for the given user.
 * Returns the read_at timestamp.
 */
export async function markAsRead(roomId: number, readerId: number): Promise<Date> {
  const readAt = await chatModel.markMessagesAsRead(roomId, readerId);
  logger.info('Messages marked as read', { roomId, readerId });
  return readAt;
}

/**
 * Get username by user ID.
 */
export async function getUsernameById(userId: number): Promise<string | null> {
  return chatModel.getUsernameById(userId);
}

// ─── Reactions ───────────────────────────────────────────────────────────────

/**
 * Add a reaction to a message.
 */
export async function addReaction(messageId: number, userId: number, emoji: string) {
  await chatModel.addReaction(messageId, userId, emoji);
}

/**
 * Remove a reaction from a message.
 */
export async function removeReaction(messageId: number, userId: number, emoji: string) {
  await chatModel.removeReaction(messageId, userId, emoji);
}

/**
 * Get all reactions for a message.
 */
export async function getReactions(messageId: number) {
  return chatModel.getReactions(messageId);
}
