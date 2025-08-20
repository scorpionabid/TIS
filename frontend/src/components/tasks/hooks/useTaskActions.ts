import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { schoolAdminService, schoolAdminKeys, SchoolTask } from '@/services/schoolAdmin';
import { Task } from '@/services/tasks';

export const useTaskActions = () => {
  const queryClient = useQueryClient();

  // Task status update mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status, notes }: { 
      taskId: number; 
      status: Task['status']; 
      notes?: string 
    }) => schoolAdminService.updateTaskStatus(taskId, status, notes),
    onSuccess: () => {
      toast.success('Tapşırıq statusu yeniləndi');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.tasks() });
    },
    onError: () => {
      toast.error('Status yenilənə bilmədi');
    },
  });

  const handleTaskStatusChange = (task: SchoolTask, newStatus: Task['status']) => {
    updateTaskMutation.mutate({
      taskId: task.id,
      status: newStatus,
    });
  };

  const handleTaskEdit = (task: SchoolTask) => {
    // TODO: Implement task edit functionality
    console.log('Edit task:', task);
  };

  const handleTaskView = (task: SchoolTask) => {
    // TODO: Implement task view functionality
    console.log('View task:', task);
  };

  return {
    handleTaskStatusChange,
    handleTaskEdit,
    handleTaskView,
    isUpdating: updateTaskMutation.isPending,
  };
};