'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldOff,
  Ban,
  Clock,
  Unlock,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import api from '@/lib/api';
import UserActionModal, { UserActionType } from '@/components/modals/UserActionModal';
import { cn } from '@/lib/utils';

interface UserDetail {
  id: number;
  uid: string;
  username: string;
  bio: string | null;
  experience_level: string;
  availability: string;
  trust_score: number;
  status: string;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
  reputation_history: ReputationEvent[];
  teach_skills?: { id: number; name: string; category: string }[];
  learn_skills?: { id: number; name: string; category: string }[];
}

interface ReputationEvent {
  id: number;
  event_type: string;
  delta: number;
  created_at: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: UserActionType;
  }>({ isOpen: false, type: 'suspend' });

  const { data: user, isLoading } = useQuery<UserDetail>({
    queryKey: ['admin', 'user', id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token && !!id,
  });

  const { data: reputationEvents } = useQuery<ReputationEvent[]>({
    queryKey: ['admin', 'user', id, 'reputation'],
    queryFn: async () => {
      // Reputation history is included in the user detail response
      return user?.reputation_history ?? [];
    },
    enabled: !!user,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      action,
      reason,
      duration,
    }: {
      action: UserActionType;
      reason: string;
      duration?: number;
    }) => {
      const statusMap: Record<string, string> = {
        suspend: 'suspended',
        ban: 'banned',
        cooldown: 'cooldown',
        lift: 'active',
      };
      const endpoint = `/api/v1/admin/users/${id}/status`;

      await api.put(
        endpoint,
        { status: statusMap[action] || action, reason: reason || `Admin action: ${action}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      setActionModal({ isOpen: false, type: 'suspend' });
    },
  });

  const getUserStatus = (): string => {
    if (!user) return 'unknown';
    return user.status || 'active';
  };

  const status = getUserStatus();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>
        <DetailSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">User not found</p>
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    cooldown: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  };

  const eventTypeStyles: Record<string, string> = {
    EXCHANGE_COMPLETE: 'text-green-600 dark:text-green-400',
    ENDORSEMENT: 'text-green-600 dark:text-green-400',
    SESSION_COMPLETE: 'text-green-600 dark:text-green-400',
    POSITIVE_FEEDBACK: 'text-green-600 dark:text-green-400',
    GHOST: 'text-red-600 dark:text-red-400',
    NO_SHOW: 'text-red-600 dark:text-red-400',
    IGNORED_REQUEST: 'text-yellow-600 dark:text-yellow-400',
    REPORT: 'text-red-600 dark:text-red-400',
    SUSPENDED: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.username}
              </h1>
              <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', statusStyles[status])}>
                {status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>UID: <code className="font-mono text-xs">{user.uid}</code></span>
              <span>Trust Score: <strong className="text-gray-900 dark:text-white">{user.trust_score}</strong></span>
              <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            {user.bio && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{user.bio}</p>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {!user.status || user.status === 'active' ? (
              <>
                <button
                  onClick={() => setActionModal({ isOpen: true, type: 'suspend' })}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                >
                  <ShieldOff className="w-4 h-4" />
                  Suspend
                </button>
                <button
                  onClick={() => setActionModal({ isOpen: true, type: 'ban' })}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  Ban
                </button>
                <button
                  onClick={() => setActionModal({ isOpen: true, type: 'cooldown' })}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Cooldown
                </button>
              </>
            ) : (
              <button
                onClick={() => setActionModal({ isOpen: true, type: 'lift' })}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <Unlock className="w-4 h-4" />
                Lift Restriction
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teach Skills */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Skills Taught
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(user.teach_skills ?? []).length > 0 ? (
              (user.teach_skills ?? []).map((skill) => (
                <span
                  key={skill.id}
                  className="px-3 py-1 text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full"
                >
                  {skill.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No teach skills</p>
            )}
          </div>
        </div>

        {/* Learn Skills */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-4 h-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Skills Learning
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(user.learn_skills ?? []).length > 0 ? (
              (user.learn_skills ?? []).map((skill) => (
                <span
                  key={skill.id}
                  className="px-3 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full"
                >
                  {skill.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No learn skills</p>
            )}
          </div>
        </div>
      </div>

      {/* Reputation Event Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Reputation Event Timeline
        </h3>
        {(reputationEvents ?? []).length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(reputationEvents ?? []).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      event.delta > 0 ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      eventTypeStyles[event.event_type] ?? 'text-gray-700 dark:text-gray-300'
                    )}>
                      {event.event_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-sm font-bold',
                    event.delta > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {event.delta > 0 ? '+' : ''}{event.delta}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No reputation events
          </p>
        )}
      </div>

      {/* Action Modal */}
      <UserActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: 'suspend' })}
        onConfirm={(reason, duration) => {
          actionMutation.mutate({
            action: actionModal.type,
            reason,
            duration,
          });
        }}
        actionType={actionModal.type}
        username={user.username}
        isLoading={actionMutation.isPending}
      />
    </div>
  );
}
