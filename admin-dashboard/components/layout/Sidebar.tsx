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
        'h-screen sticky top-0 flex flex-col glass-panel border-r border-y-0 border-l-0 z-20 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-white/20 dark:border-slate-700/50">
        {!collapsed && (
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-purple-500 tracking-tight">
            SkillSwap Admin
          </span>
        )}
        {collapsed && (
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary-500 to-purple-500 mx-auto">
            SS
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <ul className="space-y-1.5">
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative group',
                    isActive
                      ? 'bg-gradient-to-r from-primary-500/10 to-purple-500/10 dark:from-primary-500/20 dark:to-purple-500/20 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "text-primary-600 dark:text-primary-400")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  
                  {/* Active Indicator Line */}
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary-500 to-purple-500 rounded-r-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-white/20 dark:border-slate-700/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2.5 rounded-xl text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-all duration-300 shadow-sm"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
