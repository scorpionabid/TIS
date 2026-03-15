import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '@/services/messageService';
import type { SendMessagePayload } from '@/types/message';
import { toast } from 'sonner';

export function useMessageMutations() {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: (payload: SendMessagePayload) => messageService.send(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'sent'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
    },
    onError: () => {
      toast.error('Mesaj göndərilmədi. Yenidən cəhd edin.');
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
