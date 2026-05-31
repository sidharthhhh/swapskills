import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import * as skillsModel from './skills.model';
import type { SkillRow } from './skills.model';

const CACHE_TTL = 3600; // 1 hour in seconds

const CACHE_KEYS = {
  ALL: 'skills:all',
  CATEGORIES: 'skills:categories',
  GAP: 'skills:gap',
};

/**
 * Grouped skills by category structure.
 */
export interface SkillsByCategory {
  category: string;
  skills: { id: number; name: string }[];
}

/**
 * Skill gap entry.
 */
export interface SkillGapEntry {
  skillId: number;
  name: string;
  category: string;
  teacherCount: number;
  learnerCount: number;
  gap: number;
}

/**
 * List all skills with their categories.
 * Results are cached in Redis with 1-hour TTL.
 */
export async function getAllSkills(): Promise<SkillRow[]> {
  try {
    const cached = await redisClient.get(CACHE_KEYS.ALL);
    if (cached) {
      logger.debug('Skills cache hit', { key: CACHE_KEYS.ALL });
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('Redis cache read failed for skills:all', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  const skills = await skillsModel.findAllSkills();

  try {
    await redisClient.setex(CACHE_KEYS.ALL, CACHE_TTL, JSON.stringify(skills));
  } catch (err) {
    logger.warn('Redis cache write failed for skills:all', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return skills;
}

/**
 * Get skills grouped by category.
 * Results are cached in Redis with 1-hour TTL.
 */
export async function getSkillsByCategory(): Promise<SkillsByCategory[]> {
  try {
    const cached = await redisClient.get(CACHE_KEYS.CATEGORIES);
    if (cached) {
      logger.debug('Skills categories cache hit', { key: CACHE_KEYS.CATEGORIES });
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('Redis cache read failed for skills:categories', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  const skills = await skillsModel.findSkillsGroupedByCategory();

  // Group skills by category
  const grouped: Record<string, { id: number; name: string }[]> = {};
  for (const skill of skills) {
    if (!grouped[skill.category]) {
      grouped[skill.category] = [];
    }
    grouped[skill.category].push({ id: skill.id, name: skill.name });
  }

  const result: SkillsByCategory[] = Object.entries(grouped).map(([category, skills]) => ({
    category,
    skills,
  }));

  try {
    await redisClient.setex(CACHE_KEYS.CATEGORIES, CACHE_TTL, JSON.stringify(result));
  } catch (err) {
    logger.warn('Redis cache write failed for skills:categories', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return result;
}

/**
 * Skill gap analysis: for each skill, count demand (users wanting to learn)
 * vs supply (users who can teach).
 * Results are cached in Redis with 1-hour TTL.
 */
export async function getSkillGap(): Promise<SkillGapEntry[]> {
  try {
    const cached = await redisClient.get(CACHE_KEYS.GAP);
    if (cached) {
      logger.debug('Skills gap cache hit', { key: CACHE_KEYS.GAP });
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('Redis cache read failed for skills:gap', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  const gapData = await skillsModel.findSkillGap();

  const result: SkillGapEntry[] = gapData.map((row) => ({
    skillId: row.id,
    name: row.name,
    category: row.category,
    teacherCount: Number(row.teacherCount),
    learnerCount: Number(row.learnerCount),
    gap: Number(row.learnerCount) - Number(row.teacherCount),
  }));

  try {
    await redisClient.setex(CACHE_KEYS.GAP, CACHE_TTL, JSON.stringify(result));
  } catch (err) {
    logger.warn('Redis cache write failed for skills:gap', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return result;
}

/**
 * Invalidate all skills-related caches.
 * Call this when skills are modified (added, updated, or deleted).
 */
export async function invalidateSkillsCache(): Promise<void> {
  try {
    await redisClient.del(CACHE_KEYS.ALL, CACHE_KEYS.CATEGORIES, CACHE_KEYS.GAP);
    logger.info('Skills cache invalidated');
  } catch (err) {
    logger.warn('Failed to invalidate skills cache', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
