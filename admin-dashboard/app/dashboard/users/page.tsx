'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Eye, Ban, Clock, ShieldOff } from 'lucide-react';
import api from '@/lib/api';
import UserTable, { Column } from '@/components/tables/UserTable';
import UserActionModal, { UserActionType } from '@/components/modals/UserActionModal';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  uid?: string;
  username: string;
  trust_score: number;
  status: string;
  experience_level?: string;
  cooldown_until: string | null;
  created_at: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trustMin, setTrustMin] = useState('');
  const [trustMax, setTrustMax] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: UserActionType;
    user: User | null;
  }>({ isOpen: false, type: 'suspend', user: null });

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', page, search, statusFilter, trustMin, trustMax, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (trustMin) params.set('trustMin', trustMin);
      if (trustMax) params.set('trustMax', trustMax);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await api.get(`/api/v1/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
    refetchInterval: 60000,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      userId,
      action,
      reason,
      duration,
    }: {
      userId: string;
      action: UserActionType;
      reason: string;
      duration?: number;
    }) => {
      const statusMap: Record<string, string> = {
        suspend: 'suspended',
        ban: 'banned',
        cooldown: 'cooldown',
        lift: 'active',
      };
      const endpoint = `/api/v1/admin/users/${userId}/status`;

      await api.put(
        endpoint,
        { status: statusMap[action] || action, reason: reason || `Admin action: ${action}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionModal({ isOpen: false, type: 'suspend', user: null });
    },
  });

  const openAction = (user: User, type: UserActionType) => {
    setActionModal({ isOpen: true, type, user });
  };

  const getUserStatus = (user: User): string => {
    return user.status || 'active';
  };

  const columns: Column<User>[] = [
    {
      key: 'username',
      header: 'Username',
      render: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.username}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'UID',
      render: (row) => (
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {row.uid || String(row.id)}
        </span>
      ),
    },
    {
      key: 'trust_score',
      header: 'Trust Score',
      render: (row) => (
        <span
          className={cn(
            'text-sm font-medium',
            row.trust_score >= 80
              ? 'text-green-600 dark:text-green-400'
              : row.trust_score >= 40
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
          )}
        >
          {row.trust_score}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const status = getUserStatus(row);
        const styles: Record<string, string> = {
          active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          cooldown: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        };
        return (
          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
            {status}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/dashboard/users/${row.id}`)}
            className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status !== 'banned' && (
            <button
              onClick={() => openAction(row, 'suspend')}
              className="p-1.5 text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Suspend"
            >
              <ShieldOff className="w-4 h-4" />
            </button>
          )}
          {row.status !== 'banned' && (
            <button
              onClick={() => openAction(row, 'ban')}
              className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Ban"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
          {getUserStatus(row) === 'active' && (
            <button
              onClick={() => openAction(row, 'cooldown')}
              className="p-1.5 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Cooldown"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        User Management
      </h1>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="cooldown">Cooldown</option>
            </select>
          </div>

          {/* Trust Score Range */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Min"
              value={trustMin}
              onChange={(e) => {
                setTrustMin(e.target.value);
                setPage(1);
              }}
              className="w-16 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-gray-400 text-xs">–</span>
            <input
              type="number"
              placeholder="Max"
              value={trustMax}
              onChange={(e) => {
                setTrustMax(e.target.value);
                setPage(1);
              }}
              className="w-16 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-gray-400 text-xs">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <UserTable columns={columns} data={data?.users ?? []} isLoading={isLoading} emptyMessage="No users found" />

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing page {data.page} of {data.totalPages} ({data.total} total users)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <UserActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: 'suspend', user: null })}
        onConfirm={(reason, duration) => {
          if (actionModal.user) {
            actionMutation.mutate({
              userId: actionModal.user.id,
              action: actionModal.type,
              reason,
              duration,
            });
          }
        }}
        actionType={actionModal.type}
        username={actionModal.user?.username ?? ''}
        isLoading={actionMutation.isPending}
      />
    </div>
  );
}
