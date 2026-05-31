import { query } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Database access layer for chat module.
 * All queries use parameterized SQL to prevent injection.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ChatRoomRow extends RowDataPacket {
  id: number;
  match_id: number;
  created_at: Date;
  partner_username: string;
  partner_id: number;
  last_message_content: string | null;
  last_message_at: Date | null;
  unread_count: number;
}

export interface MessageRow extends RowDataPacket {
  id: number;
  room_id: number;
  sender_id: number;
  content: string;
  content_type: 'text' | 'code' | 'image' | 'file';
  language: string | null;
  read_at: Date | null;
  created_at: Date;
  sender_username: string;
  reply_to_id: number | null;
  reply_content: string | null;
  reply_username: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
}

export interface ChatRoomParticipantRow extends RowDataPacket {
  id: number;
  match_id: number;
  user_a_id: number;
  user_b_id: number;
}

// ─── Room Queries ────────────────────────────────────────────────────────────

/**
 * Get all chat rooms for a user with partner info and last message preview.
 */
export async function getRoomsForUser(userId: number): Promise<ChatRoomRow[]> {
  return query<ChatRoomRow[]>(
    `SELECT 
       cr.id,
       cr.match_id,
       cr.created_at,
       CASE 
         WHEN m.user_a_id = ? THEN ub.username
         ELSE ua.username
       END AS partner_username,
       CASE 
         WHEN m.user_a_id = ? THEN m.user_b_id
         ELSE m.user_a_id
       END AS partner_id,
       lm.content AS last_message_content,
       lm.created_at AS last_message_at,
       (SELECT COUNT(*) FROM messages msg 
        WHERE msg.room_id = cr.id AND msg.sender_id != ? AND msg.read_at IS NULL
       ) AS unread_count
     FROM chat_rooms cr
     JOIN matches m ON m.id = cr.match_id
     JOIN users ua ON ua.id = m.user_a_id
     JOIN users ub ON ub.id = m.user_b_id
     LEFT JOIN messages lm ON lm.id = (
       SELECT msg2.id FROM messages msg2 
       WHERE msg2.room_id = cr.id 
       ORDER BY msg2.created_at DESC LIMIT 1
     )
     WHERE m.user_a_id = ? OR m.user_b_id = ?
     ORDER BY COALESCE(lm.created_at, cr.created_at) DESC`,
    [userId, userId, userId, userId, userId]
  );
}

/**
 * Get a chat room by ID and verify participant access.
 * Returns room info with match participant IDs.
 */
export async function getRoomWithParticipants(roomId: number): Promise<ChatRoomParticipantRow | null> {
  const rows = await query<ChatRoomParticipantRow[]>(
    `SELECT cr.id, cr.match_id, m.user_a_id, m.user_b_id
     FROM chat_rooms cr
     JOIN matches m ON m.id = cr.match_id
     WHERE cr.id = ?`,
    [roomId]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ─── Message Queries ─────────────────────────────────────────────────────────

/**
 * Get paginated messages for a room, ordered by creation time descending.
 * Includes reply-to info and file fields.
 */
export async function getMessagesForRoom(
  roomId: number,
  page: number,
  limit: number
): Promise<MessageRow[]> {
  const offset = (page - 1) * limit;
  return query<MessageRow[]>(
    `SELECT msg.id, msg.room_id, msg.sender_id, msg.content,
            msg.content_type, msg.language, msg.read_at, msg.created_at,
            msg.reply_to_id, msg.file_url, msg.file_name, msg.file_size,
            u.username AS sender_username,
            reply.content AS reply_content,
            reply_user.username AS reply_username
     FROM messages msg
     JOIN users u ON u.id = msg.sender_id
     LEFT JOIN messages reply ON reply.id = msg.reply_to_id
     LEFT JOIN users reply_user ON reply_user.id = reply.sender_id
     WHERE msg.room_id = ?
     ORDER BY msg.created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    [roomId]
  );
}

/**
 * Get total message count for a room (for pagination metadata).
 */
export async function getMessageCountForRoom(roomId: number): Promise<number> {
  const rows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM messages WHERE room_id = ?`,
    [roomId]
  );
  return rows[0].total;
}

/**
 * Create a new message in a chat room.
 */
export async function createMessage(
  roomId: number,
  senderId: number,
  content: string,
  contentType: 'text' | 'code' | 'image' | 'file' = 'text',
  language: string | null = null,
  replyToId: number | null = null,
  fileUrl: string | null = null,
  fileName: string | null = null,
  fileSize: number | null = null
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO messages (room_id, sender_id, content, content_type, language, reply_to_id, file_url, file_name, file_size)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [roomId, senderId, content, contentType, language, replyToId, fileUrl, fileName, fileSize]
  );
}

/**
 * Get a message by ID.
 */
export async function getMessageById(messageId: number): Promise<MessageRow | null> {
  const rows = await query<MessageRow[]>(
    `SELECT msg.id, msg.room_id, msg.sender_id, msg.content,
            msg.content_type, msg.language, msg.read_at, msg.created_at,
            u.username AS sender_username
     FROM messages msg
     JOIN users u ON u.id = msg.sender_id
     WHERE msg.id = ?`,
    [messageId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Mark all unread messages in a room as read (messages not sent by the reader).
 * Returns the read_at timestamp.
 */
export async function markMessagesAsRead(
  roomId: number,
  readerId: number
): Promise<Date> {
  const readAt = new Date();
  await query<ResultSetHeader>(
    `UPDATE messages 
     SET read_at = ? 
     WHERE room_id = ? AND sender_id != ? AND read_at IS NULL`,
    [readAt, roomId, readerId]
  );
  return readAt;
}

/**
 * Get username by user ID.
 */
export async function getUsernameById(userId: number): Promise<string | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT username FROM users WHERE id = ?`,
    [userId]
  );
  return rows.length > 0 ? rows[0].username : null;
}

// ─── Reaction Queries ────────────────────────────────────────────────────────

/**
 * Add a reaction to a message. Uses INSERT IGNORE to prevent duplicates.
 */
export async function addReaction(messageId: number, userId: number, emoji: string): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'INSERT IGNORE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
    [messageId, userId, emoji]
  );
}

/**
 * Remove a reaction from a message.
 */
export async function removeReaction(messageId: number, userId: number, emoji: string): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
    [messageId, userId, emoji]
  );
}

/**
 * Get all reactions for a message, grouped by emoji.
 */
export async function getReactions(messageId: number): Promise<RowDataPacket[]> {
  return query<RowDataPacket[]>(
    `SELECT emoji, COUNT(*) as count, GROUP_CONCAT(u.username) as users
     FROM message_reactions mr
     JOIN users u ON u.id = mr.user_id
     WHERE mr.message_id = ?
     GROUP BY emoji`,
    [messageId]
  );
}

/**
 * Get reactions for multiple messages (batch load for message list).
 */
export async function getReactionsForMessages(messageIds: number[]): Promise<RowDataPacket[]> {
  if (messageIds.length === 0) return [];
  const placeholders = messageIds.map(() => '?').join(',');
  return query<RowDataPacket[]>(
    `SELECT mr.message_id, emoji, COUNT(*) as count, GROUP_CONCAT(u.username) as users
     FROM message_reactions mr
     JOIN users u ON u.id = mr.user_id
     WHERE mr.message_id IN (${placeholders})
     GROUP BY mr.message_id, emoji`,
    messageIds
  );
}
