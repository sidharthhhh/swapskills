'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Report } from '@/components/tables/ReportTable';

type Resolution = 'dismiss' | 'remove_content' | 'suspend_user';

interface ReportResolveModalProps {
  report: Report;
  onClose: () => void;
  onSubmit: (reportId: number, resolution: Resolution) => void;
  isSubmitting?: boolean;
}

const RESOLUTIONS: { value: Resolution; label: string; description: string }[] = [
  { value: 'dismiss', label: 'Dismiss', description: 'No action needed — dismiss this report' },
  { value: 'remove_content', label: 'Remove Content', description: 'Remove the reported content from the platform' },
  { value: 'suspend_user', label: 'Suspend User', description: 'Suspend the reported user from the platform' },
];

export default function ReportResolveModal({
  report,
  onClose,
  onSubmit,
  isSubmitting,
}: ReportResolveModalProps) {
  const [selected, setSelected] = useState<Resolution | null>(null);

  const handleSubmit = () => {
    if (selected) {
      onSubmit(report.id, selected);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Resolve Report
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">{report.reporter_username}</span>
            {' reported '}
            <span className="font-medium text-gray-900 dark:text-white">{report.reported_username}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Reason: {report.reason}
          </p>
        </div>

        {/* Resolution Options */}
        <div className="space-y-2 mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Choose resolution:
          </p>
          {RESOLUTIONS.map((res) => (
            <label
              key={res.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected === res.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <input
                type="radio"
                name="resolution"
                value={res.value}
                checked={selected === res.value}
                onChange={() => setSelected(res.value)}
                className="mt-0.5 text-primary-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{res.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{res.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
