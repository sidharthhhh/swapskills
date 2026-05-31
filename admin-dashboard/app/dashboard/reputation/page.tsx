'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { TrendingUp, AlertTriangle, Clock, Ghost } from 'lucide-react';
import api from '@/lib/api';
import TrustDistChart, { TrustDistData } from '@/components/charts/TrustDistChart';
import { cn } from '@/lib/utils';

interface ReputationStats {
  average_trust_score: number;
  users_below_50: number;
  users_in_cooldown: number;
  ghost_events_this_week: number;
}

interface OutlierUser {
  id: string;
  username: string;
  trust_score: number;
  ghost_events: number;
  no_shows: number;
  status: 'active' | 'cooldown' | 'banned';
}

interface ReputationData {
  stats: ReputationStats;
  outliers: OutlierUser[];
  trust_distribution: TrustDistData[];
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cooldown: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReputationPage() {
  const { data: session } = useSession();

  const { data, isLoading } = useQuery<ReputationData>({
    queryKey: ['admin', 'reputation', 'outliers'],
    queryFn: async () => {
      const token = session?.user.accessToken;
      const [outliersRes, statsRes, usersRes] = await Promise.all([
        api.get('/api/v1/admin/reputation/outliers', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/api/v1/admin/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/api/v1/admin/users', { headers: { Authorization: `Bearer ${token}` }, params: { page: 1, limit: 100 } }),
      ]);

      const rawOutliers = outliersRes.data.data ?? [];
      const dashStats = statsRes.data.data ?? {};
      const allUsers = usersRes.data.data?.users ?? [];

      // Calculate stats
      const trustScores = allUsers.map((u: any) => Number(u.trust_score) || 0);
      const avgScore = trustScores.length > 0 ? Math.round(trustScores.reduce((a: number, b: number) => a + b, 0) / trustScores.length) : 0;
      const below50 = allUsers.filter((u: any) => Number(u.trust_score) < 50).length;
      const inCooldown = allUsers.filter((u: any) => u.status === 'cooldown').length;
      const ghostCount = rawOutliers.reduce((sum: number, u: any) => sum + (Number(u.ghost_count) || 0), 0);

      const stats: ReputationStats = {
        average_trust_score: avgScore,
        users_below_50: below50,
        users_in_cooldown: inCooldown,
        ghost_events_this_week: ghostCount,
      };

      // Transform outliers
      const outliers: OutlierUser[] = rawOutliers.map((u: any) => ({
        id: u.id?.toString() ?? u.uid ?? '',
        username: u.username ?? '',
        trust_score: Number(u.trust_score) || 0,
        ghost_events: Number(u.ghost_count) || 0,
        no_shows: 0,
        status: u.status ?? 'active',
      }));

      // Trust distribution histogram
      const bands = [
        { range: '0-20', min: 0, max: 20 },
        { range: '20-40', min: 20, max: 40 },
        { range: '40-60', min: 40, max: 60 },
        { range: '60-80', min: 60, max: 80 },
        { range: '80-100', min: 80, max: 101 },
      ];
      const trust_distribution: TrustDistData[] = bands.map((band) => ({
        band: band.range,
        count: allUsers.filter((u: any) => {
          const score = Number(u.trust_score) || 0;
          return score >= band.min && score < band.max;
        }).length,
      }));

      return { stats, outliers, trust_distribution };
    },
    enabled: !!session?.user?.accessToken,
  });

  const stats = data?.stats;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reputation Outliers</h1>
      </div>

      {/* Stats Row */}
      {isLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={TrendingUp}
            label="Average Trust Score"
            value={stats?.average_trust_score ?? 0}
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={AlertTriangle}
            label="Users Below 50%"
            value={stats?.users_below_50 ?? 0}
            color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
          />
          <StatCard
            icon={Clock}
            label="Users in Cooldown"
            value={stats?.users_in_cooldown ?? 0}
            color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          />
          <StatCard
            icon={Ghost}
            label="Ghost Events This Week"
            value={stats?.ghost_events_this_week ?? 0}
            color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          />
        </div>
      )}

      {/* Trust Distribution Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Trust Score Distribution
        </h2>
        <TrustDistChart data={data?.trust_distribution ?? []} isLoading={isLoading} />
      </div>

      {/* Outlier Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Outlier Users</h2>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Username</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Trust Score</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Ghost Events</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">No-Shows</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.outliers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      No outlier users found.
                    </td>
                  </tr>
                ) : (
                  (data?.outliers ?? []).map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{user.username}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${user.trust_score < 30 ? 'text-red-500' : user.trust_score < 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {user.trust_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.ghost_events}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.no_shows}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', STATUS_STYLES[user.status])}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => window.location.href = `/dashboard/users/${user.id}`}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                        >
                          View
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
