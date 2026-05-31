'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { ScrollText, Search } from 'lucide-react';
import api from '@/lib/api';
import AuditLogTable, { AuditLogEntry } from '@/components/tables/AuditLogTable';

export default function AuditLogPage() {
  const { data: session } = useSession();
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: entries = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['admin', 'audit-log', adminFilter, actionFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = { page: '1', limit: '50' };
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/api/v1/admin/audit-log', {
        params,
        headers: { Authorization: `Bearer ${session?.user.accessToken}` },
      });
      return res.data.data?.entries ?? [];
    },
    enabled: !!session?.user.accessToken,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Admin User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                placeholder="Filter by admin..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All actions</option>
              <option value="user_status_suspended">Suspend User</option>
              <option value="user_status_banned">Ban User</option>
              <option value="user_status_cooldown">Cooldown User</option>
              <option value="user_status_active">Activate User</option>
              <option value="report_dismiss">Dismiss Report</option>
              <option value="report_remove_content">Remove Content (Report)</option>
              <option value="report_suspend_user">Suspend via Report</option>
              <option value="post_removed">Remove Post</option>
              <option value="skill_added">Add Skill</option>
              <option value="skill_deleted">Delete Skill</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <AuditLogTable entries={entries} isLoading={isLoading} />
      </div>
    </div>
  );
}
