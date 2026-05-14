import { useState, useCallback } from "react";
import { Task, taskService } from "@/services/tasks";
import { useTaskMutations } from "./useTaskMutations";
import { useToast } from "@/hooks/use-toast";

interface UseTaskStatusChangeParams {
  activeTab: string;
  tasks: Task[];
  refreshTasks: () => Promise<unknown>;
}

export function useTaskStatusChange({ activeTab, tasks, refreshTasks }: UseTaskStatusChangeParams) {
  const { toast } = useToast();
  const { updateTask } = useTaskMutations();

  const [taskToComplete, setTaskToComplete] = useState<number | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  const executeStatusChange = useCallback(async (
    taskId: number,
    newStatus: Task["status"],
    completionData?: { resolution: string; notes: string }
  ) => {
    try {
      if (activeTab === "assigned") {
        const task = tasks.find(t => t.id === taskId);
        const assignmentId = task?.user_assignment?.id;
        if (!assignmentId) {
          toast({ title: "Xəta baş verdi", description: "Tapşırıq təyinatı tapılmadı.", variant: "destructive" });
          return;
        }

        const payload: Parameters<typeof taskService.updateAssignmentStatus>[1] = {
          status: newStatus,
          ...(newStatus === "in_progress" && { progress: 25 }),
          ...(newStatus === "completed" && { progress: 100 }),
        };

        if (completionData) {
          payload.completion_data = { resolution: completionData.resolution };
          if (completionData.notes) {
            payload.completion_notes = completionData.notes;
          }
        }

        await taskService.updateAssignmentStatus(assignmentId, payload);
        await refreshTasks();
      } else {
        await updateTask.mutateAsync({ id: taskId, data: { status: newStatus } });
      }
      toast({ title: "Status yeniləndi", description: "Tapşırıq statusu uğurla dəyişdirildi." });
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Status dəyişdirilə bilmədi.",
        variant: "destructive",
      });
      throw error;
    }
  }, [activeTab, tasks, refreshTasks, updateTask, toast]);

  const handleStatusChange = useCallback(async (taskId: number, newStatus: Task["status"]) => {
    if (newStatus === "completed" && activeTab === "assigned") {
      setTaskToComplete(taskId);
      return;
    }
    await executeStatusChange(taskId, newStatus);
  }, [executeStatusChange, activeTab]);

  const handleConfirmCompletion = async (data: { resolution: string; notes: string }) => {
    if (!taskToComplete) return;
    setIsCompletingTask(true);
    try {
      await executeStatusChange(taskToComplete, "completed", data);
      setTaskToComplete(null);
    } finally {
      setIsCompletingTask(false);
    }
  };

  return {
    taskToComplete,
    setTaskToComplete,
    isCompletingTask,
    handleStatusChange,
    handleConfirmCompletion,
  };
}
