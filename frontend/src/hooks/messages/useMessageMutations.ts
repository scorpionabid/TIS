import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '@/services/messageService';
import type { SendMessagePayload, Message } from '@/types/message';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useMessageMutations() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const sendMessage = useMutation({
    mutationFn: (payload: SendMessagePayload) => messageService.send(payload),
    onMutate: async (newPayload) => {
      // Thread ID (parent_id varsa o, yoxsa yeni thread - lakin biz adətən thread daxilindəyik)
      const threadId = newPayload.parent_id;
      if (!threadId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', 'thread', threadId] });

      // Snapshot the previous value
      const previousThread = queryClient.getQueryData(['messages', 'thread', threadId]);

      // Optimistically update to the new value
      if (previousThread && currentUser) {
        const optimisticMessage: Message = {
          id: Date.now(), // Temporary ID
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role || '',
            institution: currentUser.institution || null,
          },
          body: newPayload.body,
          parent_id: threadId,
          is_read: true,
          read_at: null,
          replies_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          replies: []
        };

        queryClient.setQueryData(['messages', 'thread', threadId], (old: any) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              replies: [...(old.data.replies || []), optimisticMessage]
            }
          };
        });
      }

      return { previousThread, threadId };
    },
    onError: (err, newPayload, context) => {
      if (context?.threadId) {
        queryClient.setQueryData(['messages', 'thread', context.threadId], context.previousThread);
      }
      toast.error('Mesaj göndərilmədi. Yenidən cəhd edin.');
    },
    onSettled: (data, err, variables, context) => {
      if (context?.threadId) {
        queryClient.invalidateQueries({ queryKey: ['messages', 'thread', context.threadId] });
      }
      queryClient.invalidateQueries({ queryKey: ['messages', 'sent'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: (id: number) => messageService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (id: number) => messageService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'sent'] });
      toast.success('Mesaj silindi.');
    },
    onError: () => {
      toast.error('Mesaj silinmədi. Yenidən cəhd edin.');
    },
  });

  return { sendMessage, markAsRead, deleteMessage };
}
