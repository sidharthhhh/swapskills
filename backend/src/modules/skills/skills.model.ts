import prisma from '../../config/prisma';

/**
 * Database access layer for skills module using Prisma.
 */

export interface SkillRow {
  id: number;
  name: string;
  category: string;
}

export interface SkillGapRow {
  id: number;
  name: string;
  category: string;
  teacherCount: number;
  learnerCount: number;
}

export async function findAllSkills(): Promise<SkillRow[]> {
  return prisma.skill.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });
}

export async function findAllCategories(): Promise<string[]> {
  const categories = await prisma.skill.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' }
  });
  return categories.map(c => c.category);
}

export async function findSkillsGroupedByCategory(): Promise<SkillRow[]> {
  return prisma.skill.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });
}

export async function findSkillGap(): Promise<SkillGapRow[]> {
  const skills = await prisma.skill.findMany({
    include: {
      _count: {
        select: { teachSkills: true, learnSkills: true }
      }
    }
  });

  const mapped = skills.map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    learnerCount: s._count.learnSkills,
    teacherCount: s._count.teachSkills,
  }));

  return mapped.sort((a, b) => {
    const diffA = a.learnerCount - a.teacherCount;
    const diffB = b.learnerCount - b.teacherCount;
    if (diffA !== diffB) return diffB - diffA; // DESC
    return a.name.localeCompare(b.name); // ASC
  });
}
