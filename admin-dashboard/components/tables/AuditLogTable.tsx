'use client';

export interface AuditLogEntry {
  id: number;
  admin_id: number;
  admin_username: string;
  action: string;
  target_type: string;
  target_id: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  isLoading?: boolean;
}

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

export default function AuditLogTable({ entries, isLoading }: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Admin</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Target Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Target ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Detail</th>
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

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No audit log entries found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Admin</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Target Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Target ID</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Detail</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {new Date(entry.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                {entry.admin_username}
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {entry.action}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {entry.target_type}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                {entry.target_id}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">
                {entry.metadata ? JSON.stringify(entry.metadata) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
