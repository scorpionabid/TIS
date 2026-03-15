import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useMessageWebSocket(isPanelOpen: boolean) {
  const { currentUser } = useAuth();
  const { listenToUserChannel, stopListening, isEchoConnected } = useWebSocket();
  const queryClient = useQueryClient();

  // Keep a ref of the open state to avoid unnecessary resubscriptions
  const openRef = useRef(isPanelOpen);
  openRef.current = isPanelOpen;

  useEffect(() => {
    if (!currentUser || !isEchoConnected) return;

    const channelName = `App.Models.User.${currentUser.id}`;

    listenToUserChannel(currentUser.id, (data: unknown) => {
      const eventData = data as {
        type?: string;
        sender_name?: string;
        body_preview?: string;
      };

      if (eventData?.type === 'NewMessageReceived') {
        // Invalidate queries so the UI updates
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });

        // Show toast notification if the panel is not currently open
        if (!openRef.current) {
          toast.info(
            `${eventData.sender_name ?? 'Yeni mesaj'}: ${eventData.body_preview ?? ''}`,
            { duration: 4000 }
          );
        }
      }
    });

    return () => {
      stopListening(channelName);
    };
  }, [currentUser, isEchoConnected, queryClient, listenToUserChannel, stopListening]);
}
