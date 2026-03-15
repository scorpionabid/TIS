import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { messageService } from '@/services/messageService';
import type { MessagesResponse, UnreadCountResponse } from '@/types/message';

export function useInbox(search = '', enabled = true) {
  return useInfiniteQuery<MessagesResponse>({
    queryKey: ['messages', 'inbox', search],
    queryFn: ({ pageParam = 1 }) => messageService.getInbox(pageParam as number, search),
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta && lastPage.meta.current_page < lastPage.meta.last_page) {
        return lastPage.meta.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30_000,
    enabled,
  });
}

export function useSent(search = '', enabled = true) {
  return useInfiniteQuery<MessagesResponse>({
    queryKey: ['messages', 'sent', search],
    queryFn: ({ pageParam = 1 }) => messageService.getSent(pageParam as number, search),
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta && lastPage.meta.current_page < lastPage.meta.last_page) {
        return lastPage.meta.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30_000,
    enabled,
  });
}

// skipPolling=true olduqda (WebSocket aktiv) polling devre dışı olur
export function useUnreadCount(skipPolling = false) {
  return useQuery<UnreadCountResponse>({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => messageService.getUnreadCount(),
    staleTime: 30_000,
    refetchInterval: skipPolling ? false : 60_000,
  });
}

export function useMessageThread(id: number | null) {
  return useQuery({
    queryKey: ['messages', 'thread', id],
    queryFn: () => messageService.getThread(id!),
    enabled: id !== null,
    staleTime: 15_000,
  });
}

export function useAvailableRecipients() {
  return useQuery({
    queryKey: ['messages', 'recipients'],
    queryFn: () => messageService.getRecipients(),
    staleTime: 5 * 60_000,
  });
}
