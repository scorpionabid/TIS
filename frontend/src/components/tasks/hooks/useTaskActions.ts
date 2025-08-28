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
    // Open task edit modal or navigate to edit page
    console.log('Opening edit modal for task:', task.title);
    toast.info(`${task.title} tapşırığının redaktəsi açılır`);
  };

  const handleTaskView = (task: SchoolTask) => {
    // Open task details modal or navigate to detail page
    console.log('Opening details for task:', task.title);
    toast.info(`${task.title} tapşırığının detalları göstərilir`);
  };

  return {
    handleTaskStatusChange,
    handleTaskEdit,
    handleTaskView,
    isUpdating: updateTaskMutation.isPending,
  };
};