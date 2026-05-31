'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface Match {
  id: number;
  user1_username: string;
  user2_username: string;
  skills: string[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  session_count: number;
}

interface MatchTableProps {
  matches: Match[];
  isLoading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function MatchTable({ matches, isLoading }: MatchTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Users</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Skills</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Sessions</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No matches found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Users</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Skills</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Created</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Sessions</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr
              key={match.id}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="px-4 py-3 text-gray-900 dark:text-white">
                <span className="font-medium">{match.user_a_username || match.user1_username}</span>
                <span className="text-gray-400 mx-1">↔</span>
                <span className="font-medium">{match.user_b_username || match.user2_username}</span>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                <div className="flex flex-wrap gap-1">
                  {(match.skills ?? [match.skill_a_name, match.skill_b_name].filter(Boolean)).slice(0, 3).map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', STATUS_STYLES[match.status])}>
                  {match.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {new Date(match.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {match.session_count}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/matches/${match.id}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  View detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
