import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, CreateTaskData, UpdateTaskData } from '@/services/tasks';

/**
 * Hook for task CRUD mutations (Create, Update, Delete)
 *
 * Provides:
 * - createTask: Mutation for creating new tasks
 * - updateTask: Mutation for updating existing tasks
 * - deleteTask: Mutation for deleting tasks
 *
 * Automatically invalidates 'tasks' query cache on successful mutations
 * Toast notifications should be handled by the caller component
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: (data: CreateTaskData) => taskService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      console.error('Task creation failed:', error);
      
      // Handle duplicate assignment errors specifically
      if (error.message.includes('Duplicate assignment detected') || 
          error.message.includes('artıq bu tapşırıq üçün təyin edilib')) {
        // This is a user-friendly error, no need for additional handling
        return;
      }
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskData }) =>
      taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      console.error('Task update failed:', error);
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => taskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      console.error('Task deletion failed:', error);
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
  };
}
