'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Calendar, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface MatchDetail {
  id: number;
  user1_username: string;
  user2_username: string;
  skills: string[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  sessions: {
    id: number;
    scheduled_at: string;
    status: string;
  }[];
  chat_summary: {
    message_count: number;
    last_activity: string | null;
  };
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  scheduled: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

function SkeletonDetail() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}

export default function MatchDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const matchId = params.id as string;

  const { data: match, isLoading } = useQuery<MatchDetail>({
    queryKey: ['admin', 'matches', matchId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/admin/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${session?.user.accessToken}` },
      });
      return res.data.data;
    },
    enabled: !!session?.user.accessToken && !!matchId,
  });

  if (isLoading) {
    return (
      <div>
        <Link href="/dashboard/matches" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Matches
        </Link>
        <SkeletonDetail />
      </div>
    );
  }

  if (!match) {
    return (
      <div>
        <Link href="/dashboard/matches" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Matches
        </Link>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Match not found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/dashboard/matches" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Matches
      </Link>

      {/* Match Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {match.user1_username} <span className="text-gray-400">↔</span> {match.user2_username}
            </h1>
          </div>
          <span className={cn('px-3 py-1 text-sm font-medium rounded-full', STATUS_STYLES[match.status])}>
            {match.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {(match.skills ?? []).map((skill: string, idx: number) => (
            <span key={idx} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
              {skill}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Created {new Date(match.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Log */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Session Log</h2>
          </div>
          <div className="p-4">
            {(match.sessions ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                No sessions scheduled.
              </p>
            ) : (
              <div className="space-y-3">
                {match.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(session.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', STATUS_STYLES[session.status] || 'bg-gray-100 text-gray-700')}>
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chat Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {match.chat_summary.message_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Messages</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {match.chat_summary.last_activity
                    ? new Date(match.chat_summary.last_activity).toLocaleDateString()
                    : 'No activity'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last Activity</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
              Chat content is not displayed for privacy reasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
