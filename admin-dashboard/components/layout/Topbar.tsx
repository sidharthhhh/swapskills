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
    <header className="h-16 flex items-center justify-between px-6 glass-panel border-b border-x-0 border-t-0 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-primary-500/20">
            <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {name}
            </p>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-bold rounded-full border border-current/20 shadow-sm',
              ROLE_BADGE_STYLES[role]
            )}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
