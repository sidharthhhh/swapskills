'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Users, Sliders, Filter, Plus, Trash2, Save } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'admins' | 'config' | 'keywords';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'admins', label: 'Admin Accounts', icon: Users },
  { id: 'config', label: 'Platform Config', icon: Sliders },
  { id: 'keywords', label: 'Keyword Filter', icon: Filter },
];

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

// Platform config defaults
const DEFAULT_CONFIG = {
  ghost_threshold: 3,
  cooldown_duration_days: 7,
  min_trust_for_matches: 30,
  penalties: {
    ghosting: -15,
    no_show: -10,
    ignored_request: -5,
    report_resolved: -5,
    suspended: -20,
  },
  gains: {
    exchange_complete: 10,
    endorsement: 3,
    session_complete: 5,
    positive_feedback: 2,
  },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('admins');

  // Only super_admin can access settings
  if (session?.user?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'admins' && <AdminAccountsTab token={token} />}
        {activeTab === 'config' && <PlatformConfigTab />}
        {activeTab === 'keywords' && <KeywordFilterTab />}
      </div>
    </div>
  );
}

// ─── Admin Accounts Tab ──────────────────────────────────────────────────────

function AdminAccountsTab({ token }: { token?: string }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', email: '', password: '', role: 'moderator' });
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'admin-users'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 50 },
      });
      // Filter to show only admin_users — for now show all users as placeholder
      return res.data.data.users ?? [];
    },
    enabled: !!token,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Accounts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage admin users and their roles.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">New Admin Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Username"
              value={newAdmin.username}
              onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <input
              type="password"
              placeholder="Password"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <select
              value={newAdmin.role}
              onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="moderator">Moderator</option>
              <option value="analyst">Analyst</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
              Create
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Admin list */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Username</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Joined</th>
            </tr>
          </thead>
          <tbody>
            {/* Hardcoded admin list since we don't have a separate admin list endpoint */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">admin</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">super_admin</span></td>
              <td className="px-4 py-3"><span className="text-green-600">Active</span></td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">—</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">mod_sarah</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">moderator</span></td>
              <td className="px-4 py-3"><span className="text-green-600">Active</span></td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">—</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">analyst_mike</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full">analyst</span></td>
              <td className="px-4 py-3"><span className="text-green-600">Active</span></td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Platform Config Tab ─────────────────────────────────────────────────────

function PlatformConfigTab() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Configuration</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure trust score thresholds and cooldown settings.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">General</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ghost Threshold (events)</label>
              <input
                type="number"
                value={config.ghost_threshold}
                onChange={(e) => setConfig({ ...config, ghost_threshold: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Events before cooldown triggers</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cooldown Duration (days)</label>
              <input
                type="number"
                value={config.cooldown_duration_days}
                onChange={(e) => setConfig({ ...config, cooldown_duration_days: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Days user is restricted</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min Trust for Matches</label>
              <input
                type="number"
                value={config.min_trust_for_matches}
                onChange={(e) => setConfig({ ...config, min_trust_for_matches: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum score to appear in suggestions</p>
            </div>
          </div>
        </div>

        {/* Penalties */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Trust Score Penalties</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(config.penalties).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setConfig({
                    ...config,
                    penalties: { ...config.penalties, [key]: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-red-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Gains */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Trust Score Gains</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(config.gains).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setConfig({
                    ...config,
                    gains: { ...config.gains, [key]: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-green-600"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Keyword Filter Tab ──────────────────────────────────────────────────────

function KeywordFilterTab() {
  const [keywords, setKeywords] = useState<string[]>([
    'spam', 'scam', 'fake', 'hack', 'cheat', 'abuse',
  ]);
  const [newKeyword, setNewKeyword] = useState('');
  const [filterEnabled, setFilterEnabled] = useState(true);

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Keyword Filter</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage blocked keywords for auto-moderation.</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filterEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <div
            onClick={() => setFilterEnabled(!filterEnabled)}
            className={cn(
              'w-10 h-5 rounded-full transition-colors relative',
              filterEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform',
                filterEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </div>
        </label>
      </div>

      {/* Add keyword */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Add a keyword..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
        />
        <button
          onClick={addKeyword}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Add
        </button>
      </div>

      {/* Keywords list */}
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800"
          >
            {keyword}
            <button
              onClick={() => removeKeyword(keyword)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {keywords.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No keywords added. Posts containing blocked keywords will be auto-flagged.
        </p>
      )}
    </div>
  );
}
