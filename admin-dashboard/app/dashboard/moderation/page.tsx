'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Shield, MessageSquare, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface FlaggedItem {
  id: number;
  content_type: 'message' | 'post' | 'comment';
  snippet: string;
  author_username: string;
  reporter_count: number;
  created_at: string;
}

const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  message: MessageSquare,
  post: FileText,
  comment: Users,
};

const CONTENT_TYPE_STYLES: Record<string, string> = {
  message: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  post: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  comment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

function SkeletonQueue() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function ModerationPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);

  const { data: flaggedItems = [], isLoading } = useQuery<FlaggedItem[]>({
    queryKey: ['admin', 'moderation', 'flagged'],
    queryFn: async () => {
      const token = session?.user.accessToken;
      // Fetch flagged posts and open reports as moderation queue
      const [postsRes, reportsRes] = await Promise.all([
        api.get('/api/v1/admin/posts', { headers: { Authorization: `Bearer ${token}` }, params: { status: 'flagged', page: 1, limit: 50 } }),
        api.get('/api/v1/admin/reports', { headers: { Authorization: `Bearer ${token}` }, params: { status: 'open', page: 1, limit: 50 } }),
      ]);

      const flaggedPosts = (postsRes.data.data?.posts ?? []).map((p: any) => ({
        id: p.id,
        content_type: 'post' as const,
        snippet: (p.content ?? '').slice(0, 150),
        author_username: p.author_username ?? 'Unknown',
        reporter_count: 1,
        created_at: p.created_at,
      }));

      const openReports = (reportsRes.data.data?.reports ?? []).map((r: any) => ({
        id: r.id,
        content_type: (r.target_type === 'message' ? 'message' : r.target_type === 'comment' ? 'comment' : 'post') as 'message' | 'post' | 'comment',
        snippet: r.detail ?? r.reason ?? 'No details',
        author_username: r.reporter_username ?? 'Unknown',
        reporter_count: 1,
        created_at: r.created_at,
        _isReport: true,
        _reportId: r.id,
      }));

      return [...flaggedPosts, ...openReports];
    },
    enabled: !!session?.user?.accessToken,
  });

  const moderationAction = useMutation({
    mutationFn: async ({ itemId, action, isReport }: { itemId: number; action: string; isReport?: boolean }) => {
      const token = session?.user.accessToken;
      if (isReport || (selectedItem as any)?._isReport) {
        // Resolve the report
        const reportId = (selectedItem as any)?._reportId ?? itemId;
        await api.put(
          `/api/v1/admin/reports/${reportId}`,
          { resolution: action === 'dismiss' ? 'dismiss' : action === 'remove_content' ? 'remove_content' : 'suspend_user' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Remove the post
        if (action === 'remove_content' || action === 'remove_and_suspend') {
          await api.delete(`/api/v1/admin/posts/${itemId}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      setSelectedItem(null);
    },
  });

  const getAge = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Moderation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Left: Flagged Content Queue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Flagged Content Queue ({flaggedItems.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <SkeletonQueue />
            ) : flaggedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                No flagged content to review.
              </div>
            ) : (
              flaggedItems.map((item) => {
                const Icon = CONTENT_TYPE_ICONS[item.content_type] || FileText;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedItem?.id === item.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('px-1.5 py-0.5 text-xs font-medium rounded flex items-center gap-1', CONTENT_TYPE_STYLES[item.content_type])}>
                        <Icon className="w-3 h-3" />
                        {item.content_type}
                      </span>
                      <span className="text-xs text-gray-400">{getAge(item.created_at)}</span>
                      <span className="ml-auto text-xs text-red-500 font-medium">
                        {item.reporter_count} report{item.reporter_count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {item.snippet}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">by {item.author_username}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Item Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preview</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedItem ? (
              <div>
                {/* Content Info */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('px-2 py-0.5 text-xs font-medium rounded', CONTENT_TYPE_STYLES[selectedItem.content_type])}>
                      {selectedItem.content_type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      by <span className="font-medium text-gray-700 dark:text-gray-300">{selectedItem.author_username}</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Created {new Date(selectedItem.created_at).toLocaleString()} • {selectedItem.reporter_count} report(s)
                  </p>
                </div>

                {/* Content Preview */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-6">
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {selectedItem.snippet}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => moderationAction.mutate({ itemId: selectedItem.id, action: 'dismiss', isReport: !!(selectedItem as any)._isReport })}
                    disabled={moderationAction.isPending}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => moderationAction.mutate({ itemId: selectedItem.id, action: 'remove_content', isReport: !!(selectedItem as any)._isReport })}
                    disabled={moderationAction.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    Remove Content
                  </button>
                  <button
                    onClick={() => moderationAction.mutate({ itemId: selectedItem.id, action: 'remove_and_suspend', isReport: !!(selectedItem as any)._isReport })}
                    disabled={moderationAction.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Remove + Suspend Author
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                Select an item from the queue to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
