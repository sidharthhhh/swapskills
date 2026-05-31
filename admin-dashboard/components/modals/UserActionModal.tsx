'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UserActionType = 'suspend' | 'ban' | 'cooldown' | 'lift';

interface UserActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, duration?: number) => void;
  actionType: UserActionType;
  username: string;
  isLoading?: boolean;
}

const ACTION_CONFIG: Record<UserActionType, { title: string; description: string; variant: 'danger' | 'primary' }> = {
  suspend: {
    title: 'Suspend User',
    description: 'This will temporarily restrict the user from accessing the platform.',
    variant: 'danger',
  },
  ban: {
    title: 'Ban User',
    description: 'This will permanently ban the user from the platform. This action is severe.',
    variant: 'danger',
  },
  cooldown: {
    title: 'Apply Cooldown',
    description: 'This will apply a cooldown period preventing the user from matching.',
    variant: 'primary',
  },
  lift: {
    title: 'Lift Restriction',
    description: 'This will remove the current restriction on the user.',
    variant: 'primary',
  },
};

export default function UserActionModal({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  username,
  isLoading = false,
}: UserActionModalProps) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(7);

  if (!isOpen) return null;

  const config = ACTION_CONFIG[actionType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason, actionType === 'cooldown' ? duration : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {config.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          User: <span className="font-medium text-gray-700 dark:text-gray-300">{username}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {config.description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Reason
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Provide a reason for this action..."
            />
          </div>

          {actionType === 'cooldown' && (
            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Duration (days)
              </label>
              <input
                id="duration"
                type="number"
                min={1}
                max={90}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className={cn(
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50',
                config.variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              )}
            >
              {isLoading ? 'Processing...' : config.title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
