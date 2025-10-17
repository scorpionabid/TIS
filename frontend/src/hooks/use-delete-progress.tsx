import { useState, useEffect, useRef } from 'react';
import { institutionService } from '@/services/institutions';
import { apiClient } from '@/services/api';

interface DeleteProgress {
  operation_id: string;
  status: 'started' | 'completed' | 'failed';
  progress: number;
  current_stage: string;
  stages_completed: number;
  total_stages: number;
  started_at: string;
  updated_at?: string;
  completed_at?: string;
  failed_at?: string;
  metadata?: any;
  errors?: Array<{ message: string; timestamp: string }>;
  warnings?: Array<{ message: string; timestamp: string }>;
  error?: string;
  context?: any;
}

interface UseDeleteProgressResult {
  progress: DeleteProgress | null;
  isPolling: boolean;
  startPolling: (operationId: string) => void;
  stopPolling: () => void;
  isComplete: boolean;
  isFailed: boolean;
  error: string | null;
}

export const useDeleteProgress = (): UseDeleteProgressResult => {
  const [progress, setProgress] = useState<DeleteProgress | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const operationIdRef = useRef<string | null>(null);

  const pollProgress = async (operationId: string) => {
    try {
      const token = apiClient.getToken();

      const response = await fetch(`/api/institutions/delete-progress/${operationId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Progress not found, stop polling
          stopPolling();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setProgress(data.data);
        setError(null);

        // Stop polling if operation is complete or failed
        if (data.data.status === 'completed' || data.data.status === 'failed') {
          stopPolling();
        }
      }
    } catch (err) {
      console.error('Failed to poll progress:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Don't stop polling on network errors, retry
      if (err instanceof Error && err.message.includes('fetch')) {
        return; // Continue polling
      }

      stopPolling();
    }
  };

  const startPolling = (operationId: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    operationIdRef.current = operationId;
    setIsPolling(true);
    setError(null);
    setProgress(null);

    // Poll immediately
    pollProgress(operationId);

    // Then poll every 1 second
    intervalRef.current = setInterval(() => {
      if (operationIdRef.current) {
        pollProgress(operationIdRef.current);
      }
    }, 1000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    operationIdRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const isComplete = progress?.status === 'completed';
  const isFailed = progress?.status === 'failed';

  return {
    progress,
    isPolling,
    startPolling,
    stopPolling,
    isComplete,
    isFailed,
    error
  };
};
