'use client';

import { cn } from '@/lib/utils';

export interface Report {
  id: number;
  reporter_username: string;
  reported_username: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

interface ReportTableProps {
  reports: Report[];
  onResolve: (report: Report) => void;
  isLoading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function ReportTable({ reports, onResolve, isLoading }: ReportTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Involved Users</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Filed Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
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

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No reports found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Involved Users</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Filed Date</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr
              key={report.id}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="px-4 py-3 text-gray-900 dark:text-white">User Report</td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                <span className="font-medium">{report.reporter_username}</span>
                <span className="text-gray-400 mx-1">→</span>
                <span className="font-medium">{report.reported_username}</span>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {new Date(report.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', STATUS_STYLES[report.status])}>
                  {report.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {report.status !== 'resolved' && (
                  <button
                    onClick={() => onResolve(report)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    Resolve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
