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
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true, category: true },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });
  return skills;
}

export async function findAllCategories(): Promise<string[]> {
  const categories = await prisma.skill.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' }
  });
  return categories.map((cat: { category: any; }) => cat.category);
}

export async function findSkillsGroupedByCategory(): Promise<SkillRow[]> {
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true, category: true },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });
  return skills;
}

export async function findSkillGap(): Promise<SkillGapRow[]> {
  const skills = await prisma.skill.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      _count: {
        select: { teachSkills: true, learnSkills: true }
      }
    }
  });

  const mapped: SkillGapRow[] = skills.map((skill: { id: any; name: any; category: any; _count: { learnSkills: any; teachSkills: any; }; }) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    learnerCount: skill._count.learnSkills,
    teacherCount: skill._count.teachSkills,
  }));

  return mapped.sort((first, second) => {
    const diffA = first.learnerCount - first.teacherCount;
    const diffB = second.learnerCount - second.teacherCount;
    if (diffA !== diffB) return diffB - diffA; // DESC
    return first.name.localeCompare(second.name); // ASC
  });
}
