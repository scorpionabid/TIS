import { useQuery } from '@tanstack/react-query';
import { messageService } from '@/services/messageService';
import type { MessagesResponse, UnreadCountResponse } from '@/types/message';

export function useInbox(page = 1, enabled = true) {
  return useQuery<MessagesResponse>({
    queryKey: ['messages', 'inbox', page],
    queryFn: () => messageService.getInbox(page),
    staleTime: 30_000,
    enabled,
  });
}

export function useSent(page = 1, enabled = true) {
  return useQuery<MessagesResponse>({
    queryKey: ['messages', 'sent', page],
    queryFn: () => messageService.getSent(page),
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
