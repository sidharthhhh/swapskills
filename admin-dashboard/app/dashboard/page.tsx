'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Users, Handshake, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import DauChart from '@/components/charts/DauChart';
import MatchFunnelChart from '@/components/charts/MatchFunnelChart';
import { cn } from '@/lib/utils';

interface OverviewStats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeMatches: number;
  newMatchesToday: number;
  completedExchanges: number;
  completedToday: number;
  openReports: number;
}

interface DauDataPoint {
  date: string;
  count: number;
}

interface MatchFunnelData {
  requests: number;
  accepted: number;
  completed: number;
}

interface RecentSignup {
  id: string;
  anonymous_username: string;
  trust_score: number;
  created_at: string;
}

interface TrendingSkill {
  id: number;
  name: string;
  category: string;
  user_count: number;
}

function MetricCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      ))}
    </div>
  );
}

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const { data: stats, isLoading: statsLoading } = useQuery<OverviewStats>({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data.data;
      return {
        totalUsers: d.total_users ?? 0,
        newUsersThisWeek: 0,
        activeMatches: d.active_matches ?? 0,
        newMatchesToday: 0,
        completedExchanges: d.completed_exchanges ?? 0,
        completedToday: 0,
        openReports: d.open_reports ?? 0,
      };
    },
    enabled: !!token,
    refetchInterval: 60000,
  });

  const { data: dauData, isLoading: dauLoading } = useQuery<DauDataPoint[]>({
    queryKey: ['admin', 'dau'],
    queryFn: async () => {
      // DAU endpoint doesn't exist separately — use stats dau value as today's point
      return [{ date: new Date().toISOString().split('T')[0], count: stats?.totalUsers ?? 0 }];
    },
    enabled: !!token && !!stats,
    refetchInterval: 60000,
  });

  const { data: funnelData, isLoading: funnelLoading } = useQuery<MatchFunnelData>({
    queryKey: ['admin', 'match-funnel'],
    queryFn: async () => {
      // Derive from stats
      return {
        requests: (stats?.activeMatches ?? 0) + (stats?.completedExchanges ?? 0),
        accepted: stats?.activeMatches ?? 0,
        completed: stats?.completedExchanges ?? 0,
      };
    },
    enabled: !!token && !!stats,
    refetchInterval: 60000,
  });

  const { data: recentSignups, isLoading: signupsLoading } = useQuery<RecentSignup[]>({
    queryKey: ['admin', 'recent-signups'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 10 },
      });
      return (res.data.data.users ?? []).map((u: any) => ({
        id: u.id?.toString() ?? u.uid,
        anonymous_username: u.username,
        trust_score: u.trust_score,
        created_at: u.created_at,
      }));
    },
    enabled: !!token,
    refetchInterval: 60000,
  });

  const { data: trendingSkills, isLoading: skillsLoading } = useQuery<TrendingSkill[]>({
    queryKey: ['admin', 'trending-skills'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/skills/trending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (res.data.data ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        user_count: (s.supply ?? 0) + (s.demand ?? 0),
      }));
    },
    enabled: !!token,
    refetchInterval: 60000,
  });

  const metricCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      change: `+${stats?.newUsersThisWeek ?? 0} this week`,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Active Matches',
      value: stats?.activeMatches ?? 0,
      change: `+${stats?.newMatchesToday ?? 0} today`,
      icon: Handshake,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Completed Exchanges',
      value: stats?.completedExchanges ?? 0,
      change: `+${stats?.completedToday ?? 0} today`,
      icon: CheckCircle,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Open Reports',
      value: stats?.openReports ?? 0,
      change: (stats?.openReports ?? 0) > 0 ? 'Needs attention' : 'All clear',
      icon: AlertTriangle,
      color: (stats?.openReports ?? 0) > 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-600 dark:text-gray-400',
      bgColor: (stats?.openReports ?? 0) > 0
        ? 'bg-red-50 dark:bg-red-900/20'
        : 'bg-gray-50 dark:bg-gray-800/50',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Overview
      </h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : metricCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {card.label}
                    </span>
                    <div className={cn('p-2 rounded-lg', card.bgColor)}>
                      <Icon className={cn('w-4 h-4', card.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value.toLocaleString()}
                  </p>
                  <p className={cn(
                    'text-xs mt-1',
                    card.label === 'Open Reports' && (stats?.openReports ?? 0) > 0
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  )}>
                    {card.change}
                  </p>
                </div>
              );
            })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dauLoading ? (
          <ChartSkeleton />
        ) : (
          <DauChart data={dauData ?? []} />
        )}
        {funnelLoading ? (
          <ChartSkeleton />
        ) : (
          <MatchFunnelChart data={funnelData ?? { requests: 0, accepted: 0, completed: 0 }} />
        )}
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        {signupsLoading ? (
          <TableSkeleton />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Recent Signups
            </h3>
            <div className="space-y-3">
              {(recentSignups ?? []).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.anonymous_username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    Score: {user.trust_score}
                  </span>
                </div>
              ))}
              {(recentSignups ?? []).length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent signups
                </p>
              )}
            </div>
          </div>
        )}

        {/* Trending Skills */}
        {skillsLoading ? (
          <TableSkeleton />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Trending Skills
            </h3>
            <div className="space-y-3">
              {(trendingSkills ?? []).map((skill, index) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {skill.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {skill.category}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                    {skill.user_count} users
                  </span>
                </div>
              ))}
              {(trendingSkills ?? []).length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No trending skills
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
