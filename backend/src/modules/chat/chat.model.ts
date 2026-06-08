import prisma from '../../config/prisma';

/**
 * Database access layer for chat module using Prisma.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ChatRoomRow {
  id: number;
  match_id: number;
  created_at: Date;
  partner_username: string;
  partner_id: number;
  last_message_content: string | null;
  last_message_at: Date | null;
  unread_count: number;
}

export interface MessageRow {
  id: number;
  room_id: number;
  sender_id: number;
  content: string;
  content_type: string;
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

export interface ChatRoomParticipantRow {
  id: number;
  match_id: number;
  user_a_id: number;
  user_b_id: number;
}

// ─── Room Queries ────────────────────────────────────────────────────────────

export async function getRoomsForUser(userId: number): Promise<ChatRoomRow[]> {
  const rooms = await prisma.chatRoom.findMany({
    where: {
      match: {
        OR: [
          { user_a_id: userId },
          { user_b_id: userId },
        ]
      }
    },
    include: {
      match: {
        include: {
          userA: { select: { id: true, username: true } },
          userB: { select: { id: true, username: true } },
        }
      },
      messages: {
        orderBy: { created_at: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          messages: {
            where: {
              sender_id: { not: userId },
              read_at: null
            }
          }
        }
      }
    }
  });

  const result = rooms.map((cr: any) => {
    const isUserA = cr.match.user_a_id === userId;
    const partner = isUserA ? cr.match.userB : cr.match.userA;
    const lastMessage = cr.messages[0];

    return {
      id: cr.id,
      match_id: cr.match_id,
      created_at: cr.created_at,
      partner_username: partner.username,
      partner_id: partner.id,
      last_message_content: lastMessage ? lastMessage.content : null,
      last_message_at: lastMessage ? lastMessage.created_at : null,
      unread_count: cr._count.messages
    };
  });

  result.sort((a: any, b: any) => {
    const aTime = a.last_message_at ? a.last_message_at.getTime() : a.created_at.getTime();
    const bTime = b.last_message_at ? b.last_message_at.getTime() : b.created_at.getTime();
    return bTime - aTime;
  });

  return result;
}

export async function getRoomWithParticipants(roomId: number): Promise<ChatRoomParticipantRow | null> {
  const cr = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { match: { select: { user_a_id: true, user_b_id: true } } }
  });

  if (!cr) return null;

  return {
    id: cr.id,
    match_id: cr.match_id,
    user_a_id: cr.match.user_a_id,
    user_b_id: cr.match.user_b_id,
  };
}

// ─── Message Queries ─────────────────────────────────────────────────────────

export async function getMessagesForRoom(
  roomId: number,
  page: number,
  limit: number
): Promise<MessageRow[]> {
  const skip = (page - 1) * limit;

  const msgs = await prisma.message.findMany({
    where: { room_id: roomId },
    orderBy: { created_at: 'desc' },
    skip,
    take: limit,
    include: {
      sender: { select: { username: true } },
      replyTo: {
        include: { sender: { select: { username: true } } }
      }
    }
  });

  return msgs.map((msg: any) => ({
    id: msg.id,
    room_id: msg.room_id,
    sender_id: msg.sender_id,
    content: msg.content,
    content_type: msg.content_type,
    language: msg.language,
    read_at: msg.read_at,
    created_at: msg.created_at,
    reply_to_id: msg.reply_to_id,
    file_url: msg.file_url,
    file_name: msg.file_name,
    file_size: msg.file_size,
    sender_username: msg.sender.username,
    reply_content: msg.replyTo ? msg.replyTo.content : null,
    reply_username: msg.replyTo ? msg.replyTo.sender.username : null,
  }));
}

export async function getMessageCountForRoom(roomId: number): Promise<number> {
  return prisma.message.count({ where: { room_id: roomId } });
}

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
) {
  const msg = await prisma.message.create({
    data: {
      room_id: roomId,
      sender_id: senderId,
      content,
      content_type: contentType,
      language,
      reply_to_id: replyToId,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
    }
  });
  return { insertId: msg.id };
}

export async function getMessageById(messageId: number): Promise<MessageRow | null> {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      sender: { select: { username: true } },
      replyTo: {
        include: { sender: { select: { username: true } } }
      }
    }
  });

  if (!msg) return null;

  return {
    id: msg.id,
    room_id: msg.room_id,
    sender_id: msg.sender_id,
    content: msg.content,
    content_type: msg.content_type,
    language: msg.language,
    read_at: msg.read_at,
    created_at: msg.created_at,
    reply_to_id: msg.reply_to_id,
    file_url: msg.file_url,
    file_name: msg.file_name,
    file_size: msg.file_size,
    sender_username: msg.sender.username,
    reply_content: msg.replyTo ? msg.replyTo.content : null,
    reply_username: msg.replyTo ? msg.replyTo.sender.username : null,
  };
}

export async function markMessagesAsRead(
  roomId: number,
  readerId: number
): Promise<Date> {
  const readAt = new Date();
  await prisma.message.updateMany({
    where: {
      room_id: roomId,
      sender_id: { not: readerId },
      read_at: null
    },
    data: { read_at: readAt }
  });
  return readAt;
}

export async function getUsernameById(userId: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true }
  });
  return user ? user.username : null;
}

// ─── Reaction Queries ────────────────────────────────────────────────────────

export async function addReaction(messageId: number, userId: number, emoji: string) {
  // Using upsert to emulate INSERT IGNORE
  const reaction = await prisma.messageReaction.upsert({
    where: {
      message_id_user_id_emoji: {
        message_id: messageId,
        user_id: userId,
        emoji: emoji,
      }
    },
    update: {},
    create: {
      message_id: messageId,
      user_id: userId,
      emoji: emoji,
    }
  });
  return { insertId: 1 };
}

export async function removeReaction(messageId: number, userId: number, emoji: string) {
  await prisma.messageReaction.deleteMany({
    where: {
      message_id: messageId,
      user_id: userId,
      emoji: emoji,
    }
  });
  return { affectedRows: 1 };
}

export async function getReactions(messageId: number) {
  const grouped = await prisma.messageReaction.groupBy({
    by: ['emoji'],
    where: { message_id: messageId },
    _count: true,
  });

  const users = await prisma.messageReaction.findMany({
    where: { message_id: messageId },
    include: { user: { select: { username: true } } }
  });

  return grouped.map((g: any) => {
    const emojiUsers = users.filter((u: any) => u.emoji === g.emoji).map((u: any) => u.user.username);
    return {
      emoji: g.emoji,
      count: g._count,
      users: emojiUsers.join(',')
    };
  });
}

export async function getReactionsForMessages(messageIds: number[]) {
  if (messageIds.length === 0) return [];
  
  const grouped = await prisma.messageReaction.groupBy({
    by: ['message_id', 'emoji'],
    where: { message_id: { in: messageIds } },
    _count: true,
  });

  const users = await prisma.messageReaction.findMany({
    where: { message_id: { in: messageIds } },
    include: { user: { select: { username: true } } }
  });

  return grouped.map((g: any) => {
    const emojiUsers = users.filter((u: any) => u.message_id === g.message_id && u.emoji === g.emoji).map((u: any) => u.user.username);
    return {
      message_id: g.message_id,
      emoji: g.emoji,
      count: g._count,
      users: emojiUsers.join(',')
    };
  });
}
