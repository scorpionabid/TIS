import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from './use-toast';
import { useWebSocket } from '../contexts/WebSocketContext';
import surveyResponseApprovalService from '../services/surveyResponseApproval';
import { BulkJobResult, BulkJobProgress } from '../services/bulkJobService';

export interface BulkJobState {
  isRunning: boolean;
  jobId: string | null;
  progress: BulkJobProgress | null;
  result: BulkJobResult | null;
  error: Error | null;
  canCancel: boolean;
}

export interface UseBulkApprovalJobOptions {
  onProgress?: (progress: BulkJobProgress) => void;
  onComplete?: (result: BulkJobResult) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  autoStart?: boolean;
}

export function useBulkApprovalJob(options: UseBulkApprovalJobOptions = {}) {
  const { toast } = useToast();
  const { subscribe, isConnected } = useWebSocket();
  const abortController = useRef<AbortController | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  const [state, setState] = useState<BulkJobState>({
    isRunning: false,
    jobId: null,
    progress: null,
    result: null,
    error: null,
    canCancel: false
  });

  // Handle progress updates
  const handleProgress = useCallback((progress: BulkJobProgress) => {
    setState(prev => ({ ...prev, progress }));
    options.onProgress?.(progress);
  }, [options.onProgress]);

  // Handle completion
  const handleComplete = useCallback((result: BulkJobResult) => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      result,
      canCancel: false,
      progress: null
    }));

    const { successful, failed, total } = result;
    
    if (successful === total) {
      toast({
        title: "Toplu əməliyyat tamamlandı",
        description: `${successful} cavab uğurla emal edildi`,
        variant: "default",
      });
    } else if (successful > 0 && failed > 0) {
      toast({
        title: "Toplu əməliyyat qismən tamamlandı",
        description: `${successful} uğurlu, ${failed} uğursuz`,
        variant: "default",
      });
    } else {
      toast({
        title: "Toplu əməliyyat uğursuz",
        description: `${failed} cavabın emalında xəta baş verdi`,
        variant: "destructive",
      });
    }

    options.onComplete?.(result);
  }, [options.onComplete, toast]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      error,
      canCancel: false,
      progress: null
    }));

    toast({
      title: "Xəta baş verdi",
      description: error.message || "Toplu əməliyyatda xəta baş verdi",
      variant: "destructive",
    });

    options.onError?.(error);
  }, [options.onError, toast]);

  // Start bulk approval job
  const startJob = useCallback(async (
    responseIds: number[],
    action: 'approve' | 'reject' | 'return',
    comments?: string
  ) => {
    if (state.isRunning) {
      throw new Error('Job is already running');
    }

    try {
      setState(prev => ({
        ...prev,
        isRunning: true,
        jobId: null,
        progress: null,
        result: null,
        error: null,
        canCancel: false
      }));

      const initialResult = await surveyResponseApprovalService.bulkApprovalOperation({
        response_ids: responseIds,
        action,
        comments
      });

      // If operation was processed synchronously
      if (initialResult.successful !== undefined && initialResult.failed !== undefined) {
        handleComplete(initialResult);
        return initialResult;
      }

      // If operation was queued as background job
      if (initialResult.job_id) {
        setState(prev => ({
          ...prev,
          jobId: initialResult.job_id!,
          canCancel: true
        }));

        // Subscribe to WebSocket updates if connected, otherwise use polling
        if (isConnected) {
          unsubscribeRef.current = subscribe(
            `bulk-approval.${initialResult.job_id}`,
            (data: any) => {
              if (data.status === 'in_progress') {
                handleProgress(data as BulkJobProgress);
              } else if (data.status === 'completed' || data.status === 'failed') {
                handleComplete(data.result || data);
              }
            }
          );

          // Also subscribe to user-specific channel as fallback
          const userUnsubscribe = subscribe(
            `user.${initialResult.job_id}.bulk-approval`,
            (data: any) => {
              if (data.status === 'in_progress') {
                handleProgress(data as BulkJobProgress);
              } else if (data.status === 'completed' || data.status === 'failed') {
                handleComplete(data.result || data);
              }
            }
          );

          // Combine unsubscribe functions
          const originalUnsubscribe = unsubscribeRef.current;
          unsubscribeRef.current = () => {
            originalUnsubscribe?.();
            userUnsubscribe?.();
          };

          // Return a promise that resolves when the job completes
          return new Promise((resolve, reject) => {
            const checkCompletion = () => {
              if (state.result) {
                resolve(state.result);
              } else if (state.error) {
                reject(state.error);
              } else {
                setTimeout(checkCompletion, 100);
              }
            };
            checkCompletion();
          });
        } else {
          // Fallback to polling if WebSocket is not connected
          console.log('WebSocket not connected, using polling fallback for job:', initialResult.job_id);
          abortController.current = new AbortController();
          const result = await surveyResponseApprovalService.monitorBulkApprovalJob(
            initialResult.job_id,
            handleProgress,
            handleComplete,
            handleError
          );

          return result;
        }
      }

      throw new Error('Invalid response from bulk approval service');

    } catch (error) {
      handleError(error as Error);
      throw error;
    }
  }, [state.isRunning, handleProgress, handleComplete, handleError]);

  // Cancel running job
  const cancelJob = useCallback(async () => {
    if (!state.jobId || !state.canCancel) {
      throw new Error('No cancellable job running');
    }

    try {
      await surveyResponseApprovalService.cancelBulkApprovalJob(state.jobId);
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        canCancel: false,
        progress: null,
        error: null
      }));

      toast({
        title: "Əməliyyat ləğv edildi",
        description: "Toplu əməliyyat uğurla ləğv edildi",
        variant: "default",
      });

      options.onCancel?.();
      
    } catch (error) {
      toast({
        title: "Ləğv etmə xətası",
        description: "Əməliyyatı ləğv etmək mümkün olmadı",
        variant: "destructive",
      });
      
      throw error;
    }
  }, [state.jobId, state.canCancel, toast, options.onCancel]);

  // Reset job state
  const resetJob = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setState({
      isRunning: false,
      jobId: null,
      progress: null,
      result: null,
      error: null,
      canCancel: false
    });
  }, []);

  // Get progress percentage
  const progressPercentage = state.progress?.progress.percentage ?? 0;

  // Get progress text
  const progressText = state.progress 
    ? `${state.progress.progress.processed}/${state.progress.progress.total} (${state.progress.progress.successful} uğurlu, ${state.progress.progress.failed} uğursuz)`
    : '';

  // Get estimated time remaining
  const estimatedTimeRemaining = state.progress?.metadata.remaining 
    ? `${state.progress.metadata.remaining} qalıb`
    : '';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    // State
    ...state,
    progressPercentage,
    progressText,
    estimatedTimeRemaining,
    
    // Actions
    startJob,
    cancelJob,
    resetJob,
    
    // Computed properties
    isCompleted: !state.isRunning && state.result !== null,
    hasError: state.error !== null,
    isSuccessful: state.result?.successful === state.result?.total,
    hasPartialSuccess: state.result && state.result.successful > 0 && state.result.failed > 0,
    hasFailed: state.result?.successful === 0 && (state.result?.failed ?? 0) > 0,
  };
}