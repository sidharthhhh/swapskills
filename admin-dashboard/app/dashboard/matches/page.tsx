'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Handshake } from 'lucide-react';
import api from '@/lib/api';
import MatchTable, { Match } from '@/components/tables/MatchTable';

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export default function MatchesPage() {
  const { data: session } = useSession();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['admin', 'matches', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/api/v1/admin/matches', {
        params,
        headers: { Authorization: `Bearer ${session?.user.accessToken}` },
      });
      return res.data.data?.matches ?? [];
    },
    enabled: !!session?.user.accessToken,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Handshake className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Match Management</h1>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {(['all', 'active', 'completed', 'cancelled'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <MatchTable matches={matches} isLoading={isLoading} />
      </div>
    </div>
  );
}
