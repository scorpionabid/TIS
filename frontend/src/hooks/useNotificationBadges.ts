import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService, type PageBadgeCounts } from '@/services/notification';

/** Badge key type — maps to sidebar badgeKey field */
export type BadgeKey = keyof PageBadgeCounts;

const QUERY_KEY = ['notification-badge-counts'] as const;
const POLL_INTERVAL = 60_000; // 60 seconds

const EMPTY_COUNTS: PageBadgeCounts = {
  tasks: 0,
  surveys: 0,
  documents: 0,
  report_tables: 0,
  attendance: 0,
  system: 0,
};

/**
 * Fetches unread notification counts per page category.
 * Polls every 60 seconds. Automatically invalidated when a new
 * notification arrives via WebSocket (call invalidateBadgeCache() below).
 *
 * Usage in sidebar:
 *   const badges = useNotificationBadges();
 *   badges['tasks']  // → number of unread task notifications
 */
export function useNotificationBadges(): PageBadgeCounts {
  const { currentUser } = useAuth();
  const isAuthenticated = !!currentUser;

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await notificationService.getPageBadgeCounts();
      return res.data ?? EMPTY_COUNTS;
    },
    enabled: isAuthenticated,
    refetchInterval: POLL_INTERVAL,
    staleTime: 30_000,
    gcTime: 120_000,
  });

  return data ?? EMPTY_COUNTS;
}

/**
 * Call this from any component/hook that receives a real-time notification
 * to immediately refresh the sidebar badges without waiting for the next poll.
 */
export function useInvalidateBadgeCache() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

/**
 * Hook that auto-invalidates badge cache on any mark-as-read action.
 * Use this in components that call markAsRead / markAllAsRead so the
 * sidebar count drops instantly.
 */
export function useBadgeCacheInvalidator() {
  const invalidate = useInvalidateBadgeCache();
  return { invalidateBadgeCache: invalidate };
}
