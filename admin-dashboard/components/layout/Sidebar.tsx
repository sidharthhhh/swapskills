'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Handshake,
  Shield,
  Flag,
  BookOpen,
  TrendingUp,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AdminRole } from '@/lib/auth';
import { hasAccess, Feature } from '@/lib/rbac';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  feature: Feature;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, feature: 'overview' },
  { label: 'Users', href: '/dashboard/users', icon: Users, feature: 'users' },
  { label: 'Matches', href: '/dashboard/matches', icon: Handshake, feature: 'matches' },
  { label: 'Moderation', href: '/dashboard/moderation', icon: Shield, feature: 'moderation' },
  { label: 'Reports', href: '/dashboard/reports', icon: Flag, feature: 'reports' },
  { label: 'Skills', href: '/dashboard/skills', icon: BookOpen, feature: 'skills' },
  { label: 'Reputation', href: '/dashboard/reputation', icon: TrendingUp, feature: 'reputation' },
  { label: 'Audit Log', href: '/dashboard/audit-log', icon: ScrollText, feature: 'audit-log' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, feature: 'settings' },
];

interface SidebarProps {
  role: AdminRole;
}

export default function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const accessibleItems = NAV_ITEMS.filter((item) => hasAccess(role, item.feature));

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <span className="text-lg font-bold text-primary-600 dark:text-primary-400 truncate">
            SkillSwap
          </span>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-primary-600 dark:text-primary-400 mx-auto">
            SS
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {accessibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
