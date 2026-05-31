import { query } from '../../config/database';
import { RowDataPacket } from 'mysql2/promise';

/**
 * Skill row from the skills table.
 */
export interface SkillRow extends RowDataPacket {
  id: number;
  name: string;
  category: string;
}

/**
 * Skill gap row — demand vs supply for each skill.
 */
export interface SkillGapRow extends RowDataPacket {
  id: number;
  name: string;
  category: string;
  teacherCount: number;
  learnerCount: number;
}

/**
 * Fetch all skills ordered by category and name.
 */
export async function findAllSkills(): Promise<SkillRow[]> {
  const sql = `SELECT id, name, category FROM skills ORDER BY category, name`;
  return query<SkillRow[]>(sql);
}

/**
 * Fetch all distinct categories.
 */
export async function findAllCategories(): Promise<string[]> {
  const sql = `SELECT DISTINCT category FROM skills ORDER BY category`;
  const rows = await query<RowDataPacket[]>(sql);
  return rows.map((row) => row.category as string);
}

/**
 * Fetch skills grouped by category.
 * Returns all skills; grouping is done in the service layer.
 */
export async function findSkillsGroupedByCategory(): Promise<SkillRow[]> {
  const sql = `SELECT id, name, category FROM skills ORDER BY category, name`;
  return query<SkillRow[]>(sql);
}

/**
 * Skill gap analysis: for each skill, count how many users want to learn it (learnerCount)
 * vs how many users can teach it (teacherCount).
 */
export async function findSkillGap(): Promise<SkillGapRow[]> {
  const sql = `
    SELECT
      s.id,
      s.name,
      s.category,
      COALESCE(learn_counts.learnerCount, 0) AS learnerCount,
      COALESCE(teach_counts.teacherCount, 0) AS teacherCount
    FROM skills s
    LEFT JOIN (
      SELECT skill_id, COUNT(*) AS learnerCount
      FROM user_learn_skills
      GROUP BY skill_id
    ) learn_counts ON s.id = learn_counts.skill_id
    LEFT JOIN (
      SELECT skill_id, COUNT(*) AS teacherCount
      FROM user_teach_skills
      GROUP BY skill_id
    ) teach_counts ON s.id = teach_counts.skill_id
    ORDER BY (COALESCE(learn_counts.learnerCount, 0) - COALESCE(teach_counts.teacherCount, 0)) DESC, s.name
  `;
  return query<SkillGapRow[]>(sql);
}
