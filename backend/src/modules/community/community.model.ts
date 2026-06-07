import prisma from '../../config/prisma';

/**
 * Database access layer for community module using Prisma.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CommunityRow {
  id: number;
  skill_id: number;
  name: string;
  description: string | null;
}

export interface PostRow {
  id: number;
  community_id: number;
  author_id: number;
  author_username: string;
  content: string;
  upvotes: number;
  status: string;
  created_at: Date;
}

export interface CommentRow {
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

export async function findAllCommunities(): Promise<CommunityRow[]> {
  return prisma.community.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function communityExists(communityId: number): Promise<boolean> {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true }
  });
  return c !== null;
}

// ─── Post Queries ────────────────────────────────────────────────────────────

export async function findPostsByCommunity(
  communityId: number,
  userId: number | null,
  limit: number,
  offset: number
): Promise<PostRow[]> {
  const whereClause: any = {
    community_id: communityId,
    status: 'active'
  };

  if (userId) {
    // Exclude posts from blocked users
    const blockedUsers = await prisma.block.findMany({
      where: { blocker_id: userId },
      select: { blocked_id: true }
    });
    const blockedIds = blockedUsers.map(b => b.blocked_id);
    if (blockedIds.length > 0) {
      whereClause.author_id = { notIn: blockedIds };
    }
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: { author: { select: { username: true } } },
    orderBy: { created_at: 'desc' },
    skip: offset,
    take: limit,
  });

  return posts.map(p => ({
    id: p.id,
    community_id: p.community_id,
    author_id: p.author_id,
    author_username: p.author.username,
    content: p.content,
    upvotes: p.upvotes,
    status: p.status,
    created_at: p.created_at,
  }));
}

export async function countPostsByCommunity(
  communityId: number,
  userId: number | null
): Promise<number> {
  const whereClause: any = {
    community_id: communityId,
    status: 'active'
  };

  if (userId) {
    const blockedUsers = await prisma.block.findMany({
      where: { blocker_id: userId },
      select: { blocked_id: true }
    });
    const blockedIds = blockedUsers.map(b => b.blocked_id);
    if (blockedIds.length > 0) {
      whereClause.author_id = { notIn: blockedIds };
    }
  }

  return prisma.post.count({ where: whereClause });
}

export async function createPost(
  communityId: number,
  authorId: number,
  content: string
) {
  const post = await prisma.post.create({
    data: {
      community_id: communityId,
      author_id: authorId,
      content,
    }
  });
  return { insertId: post.id };
}

export async function findPostById(postId: number): Promise<PostRow | null> {
  const p = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: { select: { username: true } } }
  });

  if (!p) return null;

  return {
    id: p.id,
    community_id: p.community_id,
    author_id: p.author_id,
    author_username: p.author.username,
    content: p.content,
    upvotes: p.upvotes,
    status: p.status,
    created_at: p.created_at,
  };
}

export async function deletePost(postId: number) {
  await prisma.post.update({
    where: { id: postId },
    data: { status: 'removed' }
  });
  return { affectedRows: 1 };
}

// ─── Upvote Queries ──────────────────────────────────────────────────────────

export async function insertPostVote(userId: number, postId: number) {
  // Try to create the vote, if it fails, it means it exists
  try {
    await prisma.postVote.create({
      data: { user_id: userId, post_id: postId }
    });
    return { affectedRows: 1 };
  } catch (e: any) {
    if (e.code === 'P2002') {
      return { affectedRows: 0 };
    }
    throw e;
  }
}

export async function incrementPostUpvotes(postId: number) {
  await prisma.post.update({
    where: { id: postId },
    data: { upvotes: { increment: 1 } }
  });
  return { affectedRows: 1 };
}

// ─── Comment Queries ─────────────────────────────────────────────────────────

export async function findCommentsByPost(
  postId: number,
  userId: number | null
): Promise<CommentRow[]> {
  const whereClause: any = {
    post_id: postId,
    status: 'active'
  };

  if (userId) {
    const blockedUsers = await prisma.block.findMany({
      where: { blocker_id: userId },
      select: { blocked_id: true }
    });
    const blockedIds = blockedUsers.map(b => b.blocked_id);
    if (blockedIds.length > 0) {
      whereClause.author_id = { notIn: blockedIds };
    }
  }

  const comments = await prisma.comment.findMany({
    where: whereClause,
    include: { author: { select: { username: true } } },
    orderBy: { created_at: 'asc' }
  });

  return comments.map(c => ({
    id: c.id,
    post_id: c.post_id,
    author_id: c.author_id,
    author_username: c.author.username,
    content: c.content,
    parent_id: c.parent_id,
    upvotes: c.upvotes,
    status: c.status,
    created_at: c.created_at,
  }));
}

export async function createComment(
  postId: number,
  authorId: number,
  content: string,
  parentId: number | null
) {
  const comment = await prisma.comment.create({
    data: {
      post_id: postId,
      author_id: authorId,
      content,
      parent_id: parentId,
    }
  });
  return { insertId: comment.id };
}

export async function findCommentById(commentId: number): Promise<CommentRow | null> {
  const c = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: { select: { username: true } } }
  });

  if (!c) return null;

  return {
    id: c.id,
    post_id: c.post_id,
    author_id: c.author_id,
    author_username: c.author.username,
    content: c.content,
    parent_id: c.parent_id,
    upvotes: c.upvotes,
    status: c.status,
    created_at: c.created_at,
  };
}

export async function incrementCommentUpvotes(commentId: number) {
  await prisma.comment.update({
    where: { id: commentId },
    data: { upvotes: { increment: 1 } }
  });
  return { affectedRows: 1 };
}

export async function findTrendingPosts(): Promise<PostRow[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const posts = await prisma.post.findMany({
    where: {
      status: 'active',
      created_at: { gte: sevenDaysAgo }
    },
    include: { author: { select: { username: true } } },
    orderBy: { upvotes: 'desc' },
    take: 10,
  });

  return posts.map(p => ({
    id: p.id,
    community_id: p.community_id,
    author_id: p.author_id,
    author_username: p.author.username,
    content: p.content,
    upvotes: p.upvotes,
    status: p.status,
    created_at: p.created_at,
  }));
}
