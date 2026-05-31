'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface SkillGapData {
  skill: string;
  demand: number;
  supply: number;
}

interface SkillGapChartProps {
  data: SkillGapData[];
  isLoading?: boolean;
}

export default function SkillGapChart({ data, isLoading }: SkillGapChartProps) {
  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="animate-pulse space-y-3 w-full px-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded flex-1" style={{ width: `${60 - i * 8}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
        No skill gap data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="skill"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F9FAFB',
          }}
        />
        <Legend />
        <Bar dataKey="demand" name="Learners (Demand)" fill="#F59E0B" radius={[0, 4, 4, 0]} />
        <Bar dataKey="supply" name="Teachers (Supply)" fill="#10B981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
