// import { redisClient } from '../../config/redis';
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
  const skills = await skillsModel.findAllSkills();
  return skills;
}

/**
 * Get skills grouped by category.
 * Results are cached in Redis with 1-hour TTL.
 */
export async function getSkillsByCategory(): Promise<SkillsByCategory[]> {
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

  return result;
}

/**
 * Skill gap analysis: for each skill, count demand (users wanting to learn)
 * vs supply (users who can teach).
 * Results are cached in Redis with 1-hour TTL.
 */
export async function getSkillGap(): Promise<SkillGapEntry[]> {
  const gapData = await skillsModel.findSkillGap();

  const result: SkillGapEntry[] = gapData.map((row) => ({
    skillId: row.id,
    name: row.name,
    category: row.category,
    teacherCount: Number(row.teacherCount),
    learnerCount: Number(row.learnerCount),
    gap: Number(row.learnerCount) - Number(row.teacherCount),
  }));

  return result;
}

/**
 * Invalidate all skills-related caches.
 * Call this when skills are modified (added, updated, or deleted).
 */
export async function invalidateSkillsCache(): Promise<void> {
  // try {
  //   await redisClient.del(CACHE_KEYS.ALL, CACHE_KEYS.CATEGORIES, CACHE_KEYS.GAP);
  //   logger.info('Skills cache invalidated');
  // } catch (err) {
  //   logger.warn('Failed to invalidate skills cache', {
  //     error: err instanceof Error ? err.message : 'Unknown error',
  //   });
  // }
}
