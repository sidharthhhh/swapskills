'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { BookOpen, Plus, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '@/lib/api';
import SkillGapChart, { SkillGapData } from '@/components/charts/SkillGapChart';

interface SkillAnalytics {
  skill_gap: SkillGapData[];
  category_distribution: { name: string; value: number }[];
  skill_table: {
    id: number;
    name: string;
    category: string;
    teachers: number;
    learners: number;
    gap_percent: number;
    active_matches: number;
  }[];
}

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6'];

const SKILL_CATEGORIES = [
  'programming', 'devops', 'cloud', 'ai_ml', 'design',
  'business', 'languages', 'finance', 'productivity', 'career',
] as const;

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
      <div className="h-[300px] bg-gray-100 dark:bg-gray-900 rounded" />
    </div>
  );
}

export default function SkillsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Add Skill modal state
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<string>(SKILL_CATEGORIES[0]);
  const [addSkillError, setAddSkillError] = useState('');
  const [addSkillSuccess, setAddSkillSuccess] = useState('');

  const addSkillMutation = useMutation({
    mutationFn: async (data: { name: string; category: string }) => {
      const res = await api.post('/api/v1/admin/skills', data, {
        headers: { Authorization: `Bearer ${session?.user.accessToken}` },
      });
      return res.data;
    },
    onSuccess: (data) => {
      setAddSkillSuccess(`Skill "${data.data.name}" added successfully!`);
      setNewSkillName('');
      setNewSkillCategory(SKILL_CATEGORIES[0]);
      setAddSkillError('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'skills', 'analytics'] });
      setTimeout(() => {
        setAddSkillSuccess('');
        setShowAddSkill(false);
      }, 2000);
    },
    onError: (err: any) => {
      setAddSkillError(err.response?.data?.message || 'Failed to add skill');
      setAddSkillSuccess('');
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: number) => {
      await api.delete(`/api/v1/admin/skills/${skillId}`, {
        headers: { Authorization: `Bearer ${session?.user.accessToken}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'skills', 'analytics'] });
    },
  });

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    setAddSkillError('');
    setAddSkillSuccess('');
    if (!newSkillName.trim()) {
      setAddSkillError('Skill name is required');
      return;
    }
    addSkillMutation.mutate({ name: newSkillName.trim(), category: newSkillCategory });
  };

  const { data, isLoading } = useQuery<SkillAnalytics>({
    queryKey: ['admin', 'skills', 'analytics'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/skills/analytics', {
        headers: { Authorization: `Bearer ${session?.user.accessToken}` },
      });
      const rawSkills = res.data.data ?? [];

      // Transform flat skill array into structured analytics
      const skill_gap: SkillGapData[] = rawSkills
        .filter((s: any) => (s.supply > 0 || s.demand > 0))
        .slice(0, 15)
        .map((s: any) => ({
          skill: s.name,
          supply: Number(s.supply) || 0,
          demand: Number(s.demand) || 0,
        }));

      // Category distribution
      const categoryMap: Record<string, number> = {};
      for (const s of rawSkills) {
        const cat = s.category || 'other';
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(s.supply || 0) + Number(s.demand || 0);
      }
      const category_distribution = Object.entries(categoryMap)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

      // Skill table
      const skill_table = rawSkills.map((s: any) => {
        const supply = Number(s.supply) || 0;
        const demand = Number(s.demand) || 0;
        const total = supply + demand;
        const gap_percent = total > 0 ? Math.round(Math.abs(demand - supply) / total * 100) : 0;
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          teachers: supply,
          learners: demand,
          gap_percent,
          active_matches: 0,
        };
      });

      return { skill_gap, category_distribution, skill_table };
    },
    enabled: !!session?.user?.accessToken,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skill Analytics</h1>
        <button
          onClick={() => setShowAddSkill(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      {/* Add Skill Modal */}
      {showAddSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Skill</h2>
              <button
                onClick={() => { setShowAddSkill(false); setAddSkillError(''); setAddSkillSuccess(''); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addSkillSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                {addSkillSuccess}
              </div>
            )}

            {addSkillError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {addSkillError}
              </div>
            )}

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label htmlFor="skill-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Skill Name
                </label>
                <input
                  id="skill-name"
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. React, Docker, Python"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label htmlFor="skill-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  id="skill-category"
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  {SKILL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' / ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddSkill(false); setAddSkillError(''); setAddSkillSuccess(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSkillMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {addSkillMutation.isPending ? 'Adding...' : 'Add Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Skill Gap Chart */}
        {isLoading ? (
          <SkeletonCard />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Skill Gap (Demand vs Supply)
            </h2>
            <SkillGapChart data={data?.skill_gap ?? []} />
          </div>
        )}

        {/* Category Distribution */}
        {isLoading ? (
          <SkeletonCard />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Category Distribution
            </h2>
            {(data?.category_distribution ?? []).length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                No category data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.category_distribution ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {(data?.category_distribution ?? []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* Skills Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Skills Overview</h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4 mb-3">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Skill</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Teachers</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Learners</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Gap %</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.skill_table ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      No skill data available.
                    </td>
                  </tr>
                ) : (
                  (data?.skill_table ?? []).map((skill) => (
                    <tr
                      key={skill.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{skill.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                          {skill.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{skill.teachers}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{skill.learners}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${skill.gap_percent > 50 ? 'text-red-500' : skill.gap_percent > 20 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {skill.gap_percent}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteSkillMutation.mutate(skill.id)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
