import { query } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Database access layer for community module.
 * All queries use parameterized SQL to prevent injection.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CommunityRow extends RowDataPacket {
  id: number;
  skill_id: number;
  name: string;
  description: string | null;
}

export interface PostRow extends RowDataPacket {
  id: number;
  community_id: number;
  author_id: number;
  author_username: string;
  content: string;
  upvotes: number;
  status: string;
  created_at: Date;
}

export interface CommentRow extends RowDataPacket {
  id: number;
  post_id: number;
  author_id: number;
  author_username: string;
  content: string;
  parent_id: number | null;
  upvotes: number;
  status: string;
  created_at: Date;
}

// ─── Community Queries ───────────────────────────────────────────────────────

/**
 * Fetch all communities with their associated skill info.
 */
export async function findAllCommunities(): Promise<CommunityRow[]> {
  const sql = `
    SELECT c.id, c.skill_id, c.name, c.description
    FROM communities c
    ORDER BY c.name
  `;
  return query<CommunityRow[]>(sql);
}

/**
 * Check if a community exists by ID.
 */
export async function communityExists(communityId: number): Promise<boolean> {
  const rows = await query<RowDataPacket[]>(
    'SELECT 1 FROM communities WHERE id = ? LIMIT 1',
    [communityId]
  );
  return rows.length > 0;
}

// ─── Post Queries ────────────────────────────────────────────────────────────

/**
 * Fetch paginated posts for a community, excluding posts from blocked users.
 * If userId is null (unauthenticated), no block filtering is applied.
 */
export async function findPostsByCommunity(
  communityId: number,
  userId: number | null,
  limit: number,
  offset: number
): Promise<PostRow[]> {
  let sql: string;
  let params: (number | null)[];

  if (userId) {
    sql = `
      SELECT p.id, p.community_id, p.author_id, u.username AS author_username,
             p.content, p.upvotes, p.status, p.created_at
      FROM posts p
      JOIN users u ON u.id = p.author_id
      WHERE p.community_id = ?
        AND p.status = 'active'
        AND p.author_id NOT IN (
          SELECT blocked_id FROM blocks WHERE blocker_id = ?
        )
      ORDER BY p.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    params = [communityId, userId];
  } else {
    sql = `
      SELECT p.id, p.community_id, p.author_id, u.username AS author_username,
             p.content, p.upvotes, p.status, p.created_at
      FROM posts p
      JOIN users u ON u.id = p.author_id
      WHERE p.community_id = ?
        AND p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    params = [communityId];
  }

  return query<PostRow[]>(sql, params);
}

/**
 * Count total active posts in a community (for pagination metadata).
 */
export async function countPostsByCommunity(
  communityId: number,
  userId: number | null
): Promise<number> {
  let sql: string;
  let params: (number | null)[];

  if (userId) {
    sql = `
      SELECT COUNT(*) AS total
      FROM posts p
      WHERE p.community_id = ?
        AND p.status = 'active'
        AND p.author_id NOT IN (
          SELECT blocked_id FROM blocks WHERE blocker_id = ?
        )
    `;
    params = [communityId, userId];
  } else {
    sql = `
      SELECT COUNT(*) AS total
      FROM posts p
      WHERE p.community_id = ?
        AND p.status = 'active'
    `;
    params = [communityId];
  }

  const rows = await query<RowDataPacket[]>(sql, params);
  return Number(rows[0].total);
}

/**
 * Create a new post in a community.
 */
export async function createPost(
  communityId: number,
  authorId: number,
  content: string
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO posts (community_id, author_id, content) VALUES (?, ?, ?)`,
    [communityId, authorId, content]
  );
}

/**
 * Find a post by ID.
 */
export async function findPostById(postId: number): Promise<PostRow | null> {
  const rows = await query<PostRow[]>(
    `SELECT p.id, p.community_id, p.author_id, u.username AS author_username,
            p.content, p.upvotes, p.status, p.created_at
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE p.id = ?`,
    [postId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Delete a post (set status to 'removed').
 */
export async function deletePost(postId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `UPDATE posts SET status = 'removed' WHERE id = ?`,
    [postId]
  );
}

// ─── Upvote Queries ──────────────────────────────────────────────────────────

/**
 * Attempt to insert a vote record. Uses INSERT IGNORE to prevent duplicates.
 * Returns the result — affectedRows will be 0 if the vote already existed.
 */
export async function insertPostVote(userId: number, postId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT IGNORE INTO post_votes (user_id, post_id) VALUES (?, ?)`,
    [userId, postId]
  );
}

/**
 * Increment the upvotes counter on a post.
 */
export async function incrementPostUpvotes(postId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?`,
    [postId]
  );
}

// ─── Comment Queries ─────────────────────────────────────────────────────────

/**
 * Fetch comments for a post, excluding comments from blocked users.
 */
export async function findCommentsByPost(
  postId: number,
  userId: number | null
): Promise<CommentRow[]> {
  let sql: string;
  let params: (number | null)[];

  if (userId) {
    sql = `
      SELECT c.id, c.post_id, c.author_id, u.username AS author_username,
             c.content, c.parent_id, c.upvotes, c.status, c.created_at
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ?
        AND c.status = 'active'
        AND c.author_id NOT IN (
          SELECT blocked_id FROM blocks WHERE blocker_id = ?
        )
      ORDER BY c.created_at ASC
    `;
    params = [postId, userId];
  } else {
    sql = `
      SELECT c.id, c.post_id, c.author_id, u.username AS author_username,
             c.content, c.parent_id, c.upvotes, c.status, c.created_at
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ?
        AND c.status = 'active'
      ORDER BY c.created_at ASC
    `;
    params = [postId];
  }

  return query<CommentRow[]>(sql, params);
}

/**
 * Create a new comment on a post.
 */
export async function createComment(
  postId: number,
  authorId: number,
  content: string,
  parentId: number | null
): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `INSERT INTO comments (post_id, author_id, content, parent_id) VALUES (?, ?, ?, ?)`,
    [postId, authorId, content, parentId]
  );
}

/**
 * Find a comment by ID.
 */
export async function findCommentById(commentId: number): Promise<CommentRow | null> {
  const rows = await query<CommentRow[]>(
    `SELECT c.id, c.post_id, c.author_id, u.username AS author_username,
            c.content, c.parent_id, c.upvotes, c.status, c.created_at
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.id = ?`,
    [commentId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Increment the upvotes counter on a comment.
 */
export async function incrementCommentUpvotes(commentId: number): Promise<ResultSetHeader> {
  return query<ResultSetHeader>(
    `UPDATE comments SET upvotes = upvotes + 1 WHERE id = ?`,
    [commentId]
  );
}

/**
 * Fetch top 10 trending posts by upvotes from the last 7 days.
 */
export async function findTrendingPosts(): Promise<PostRow[]> {
  const sql = `
    SELECT p.id, p.community_id, p.author_id, u.username AS author_username,
           p.content, p.upvotes, p.status, p.created_at
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.status = 'active'
      AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY p.upvotes DESC
    LIMIT 10
  `;
  return query<PostRow[]>(sql);
}
