'use client';

import { signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import { AdminRole } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface TopbarProps {
  name: string;
  role: AdminRole;
}

const ROLE_BADGE_STYLES: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  moderator: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  analyst: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  moderator: 'Moderator',
  analyst: 'Analyst',
};

export default function Topbar({ name, role }: TopbarProps) {
  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700">
            <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {name}
            </p>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              ROLE_BADGE_STYLES[role]
            )}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
