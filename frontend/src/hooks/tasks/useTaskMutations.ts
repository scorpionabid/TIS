import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, CreateTaskData, UpdateTaskData, Task } from '@/services/tasks';
import { toast } from 'react-hot-toast';

/**
 * Hook for task CRUD mutations (Create, Update, Delete)
 *
 * Provides:
 * - createTask: Mutation for creating new tasks
 * - updateTask: Mutation for updating existing tasks
 * - deleteTask: Mutation for deleting tasks
 *
 * Automatically invalidates 'tasks' query cache on successful mutations
 * Shows toast notifications for success/error states
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: (data: CreateTaskData) => taskService.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tapşırıq uğurla yaradıldı');
    },
    onError: (error: Error) => {
      console.error('Task creation failed:', error);
      toast.error(error.message || 'Tapşırıq yaratma zamanı xəta baş verdi');
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskData }) =>
      taskService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tapşırıq uğurla yeniləndi');
    },
    onError: (error: Error) => {
      console.error('Task update failed:', error);
      toast.error(error.message || 'Tapşırıq yeniləmə zamanı xəta baş verdi');
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => taskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tapşırıq uğurla silindi');
    },
    onError: (error: Error) => {
      console.error('Task deletion failed:', error);
      toast.error(error.message || 'Tapşırıq silmə zamanı xəta baş verdi');
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
  };
}
