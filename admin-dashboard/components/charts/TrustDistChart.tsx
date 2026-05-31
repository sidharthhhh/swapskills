'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface TrustDistData {
  band: string;
  count: number;
}

interface TrustDistChartProps {
  data: TrustDistData[];
  isLoading?: boolean;
}

export default function TrustDistChart({ data, isLoading }: TrustDistChartProps) {
  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse flex items-end gap-2 h-48">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="w-10 bg-gray-200 dark:bg-gray-700 rounded-t"
              style={{ height: `${Math.random() * 100 + 30}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
        No trust distribution data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="band"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          label={{ value: 'Trust Score Band', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          label={{ value: 'Users', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F9FAFB',
          }}
        />
        <Bar dataKey="count" name="Users" fill="#6366F1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
