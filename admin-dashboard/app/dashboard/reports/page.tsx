'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Flag } from 'lucide-react';
import api from '@/lib/api';
import ReportTable, { Report } from '@/components/tables/ReportTable';
import ReportResolveModal from '@/components/modals/ReportResolveModal';

type StatusFilter = 'all' | 'pending' | 'reviewed' | 'resolved';

export default function ReportsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['admin', 'reports', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/api/v1/admin/reports', {
        params,
        headers: { Authorization: `Bearer ${session?.user.accessToken}` },
      });
      return res.data.data?.reports ?? [];
    },
    enabled: !!session?.user.accessToken,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ reportId, resolution }: { reportId: number; resolution: string }) => {
      await api.put(
        `/api/v1/admin/reports/${reportId}`,
        { status: 'resolved', resolution },
        { headers: { Authorization: `Bearer ${session?.user.accessToken}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      setSelectedReport(null);
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Flag className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'reviewed', 'resolved'] as StatusFilter[]).map((status) => (
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
        <ReportTable
          reports={reports}
          onResolve={(report) => setSelectedReport(report)}
          isLoading={isLoading}
        />
      </div>

      {/* Resolve Modal */}
      {selectedReport && (
        <ReportResolveModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSubmit={(reportId, resolution) => resolveMutation.mutate({ reportId, resolution })}
          isSubmitting={resolveMutation.isPending}
        />
      )}
    </div>
  );
}
