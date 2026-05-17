import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { TaskSubDelegation } from '@/services/tasks';
import { logger } from '@/utils/logger';

interface SubDelegationUpdateData {
  delegation_id: number;
  task_id: number;
  parent_assignment_id: number;
  delegated_to_user_id: number;
  old_status: string;
  new_status: string;
  changed_by: {
    id: number;
    name: string;
    email: string;
  };
  delegation: {
    id: number;
    status: string;
    progress: number;
    deadline?: string;
    delegatedToUser: {
      id: number;
      name: string;
      email: string;
    };
    parentAssignment: {
      id: number;
      user_id: number;
    };
  };
  timestamp: string;
}

export const useSubDelegationUpdates = (parentAssignmentId: number) => {
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const handleStatusChange = useCallback((event: MessageEvent) => {
    try {
      const data: SubDelegationUpdateData = JSON.parse(event.data);
      
      // Show toast notification for status changes
      const statusMessages = {
        pending: 'Gözləmədə',
        accepted: 'Qəbul edildi',
        in_progress: 'İcraya başladı',
        completed: 'Tamamladı',
        cancelled: 'Ləğv etdi',
      };

      const action = statusMessages[data.new_status as keyof typeof statusMessages] || 'status dəyişdirdi';
      
      toast({
        title: 'Yönləndirmə Statusu Dəyişdi',
        description: `${data.delegation.delegatedToUser.name} tapşırığı ${action}`,
        variant: data.new_status === 'completed' ? 'default' : 
                  data.new_status === 'cancelled' ? 'destructive' : 'default',
      });

      // Trigger custom event for parent components
      window.dispatchEvent(new CustomEvent('subDelegationUpdate', {
        detail: data
      }));

    } catch (error) {
      logger.error('Error parsing sub-delegation update', error);
    }
  }, [toast]);

  const connectWebSocket = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/sub-delegations/${parentAssignmentId}`;

    try {
      eventSourceRef.current = new EventSource(`/api/sub-delegations/${parentAssignmentId}/stream`);
      
      eventSourceRef.current.onmessage = handleStatusChange;
      
      eventSourceRef.current.onerror = (error) => {
        logger.error('EventSource error', error);
        toast({
          title: 'Bağlantı Xətası',
          description: 'Real-time yeniləmələr bağlantısı kəsildi',
          variant: 'destructive',
        });
      };

      eventSourceRef.current.onopen = () => {
        logger.debug('Sub-delegation EventSource connected');
      };

    } catch (error) {
      logger.error('Error creating EventSource connection', error);
      startPolling();
    }
  }, [parentAssignmentId, handleStatusChange]);

  const startPolling = useCallback(() => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        // Polling endpoint would be called here when implemented
        logger.debug('Polling for sub-delegation updates...');
      } catch (error) {
        logger.error('Polling error', error);
      }
    }, 30000); // Poll every 30 seconds
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (pollIntervalRef.current !== undefined) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (parentAssignmentId) {
      connectWebSocket();
    }

    return () => {
      disconnect();
    };
  }, [parentAssignmentId, connectWebSocket, disconnect]);

  // Return connection status for debugging
  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    reconnect: connectWebSocket,
    disconnect,
  };
};
