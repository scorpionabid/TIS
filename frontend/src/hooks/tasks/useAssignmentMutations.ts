import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, Task } from '@/services/tasks';
import { useToast } from '@/hooks/use-toast';

type MutationPayload = {
  assignmentId: number;
  payload: {
    status: Task['status'];
    progress?: number;
    completion_notes?: string;
    completion_data?: Record<string, unknown>;
  };
  successMessage: { title: string; description?: string };
};

export function useAssignmentMutations(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAssignmentId, setPendingAssignmentId] = useState<number | null>(null);

  const mutation = useMutation<unknown, Error, MutationPayload>({
    mutationFn: ({ assignmentId, payload }) =>
      taskService.updateAssignmentStatus(assignmentId, payload),
    onSuccess: (_, variables) => {
      toast({
        title: variables.successMessage.title,
        description: variables.successMessage.description,
      });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Əməliyyat uğursuz oldu',
        description: error.message || 'Əməliyyat zamanı xəta baş verdi.',
        variant: 'destructive',
      });
    },
    onSettled: () => setPendingAssignmentId(null),
  });

  const markInProgress = useCallback((task: Task, assignmentId: number, currentProgress: number) => {
    setPendingAssignmentId(assignmentId);
    mutation.mutate({
      assignmentId,
      payload: {
        status: 'in_progress',
        progress: Math.max(currentProgress, 25),
      },
      successMessage: {
        title: 'Tapşırıq icraya götürüldü',
        description: `${task.title} tapşırığı icraya götürüldü.`,
      },
    });
  }, [mutation]);

  const markCompleted = useCallback((
    task: Task,
    assignmentId: number,
    completionType: string,
    notes?: string
  ) => {
    setPendingAssignmentId(assignmentId);
    mutation.mutate({
      assignmentId,
      payload: {
        status: 'completed',
        progress: 100,
        completion_notes: notes?.trim() || undefined,
        completion_data: { completion_type: completionType },
      },
      successMessage: {
        title: 'Tapşırıq tamamlandı',
        description: `${task.title} tapşırığı tamamlandı.`,
      },
    });
  }, [mutation]);

  const markCancelled = useCallback((task: Task, assignmentId: number, reason: string) => {
    setPendingAssignmentId(assignmentId);
    mutation.mutate({
      assignmentId,
      payload: {
        status: 'cancelled',
        completion_notes: reason.trim(),
      },
      successMessage: {
        title: 'Tapşırıq ləğv edildi',
        description: `${task.title} tapşırığı ləğv edildi.`,
      },
    });
  }, [mutation]);

  const isAssignmentPending = useCallback((assignmentId: number) => {
    return mutation.isPending && pendingAssignmentId === assignmentId;
  }, [mutation.isPending, pendingAssignmentId]);

  return {
    isPending: mutation.isPending,
    pendingAssignmentId,
    isAssignmentPending,
    markInProgress,
    markCompleted,
    markCancelled,
  };
}
