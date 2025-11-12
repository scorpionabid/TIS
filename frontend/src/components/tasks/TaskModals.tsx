import TaskDetailsDrawer from "@/components/tasks/TaskDetailsDrawer";
import { TaskModalStandardized } from "@/components/modals/TaskModalStandardized";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { CreateTaskData, Task } from "@/services/tasks";
import { TaskTabValue } from "@/hooks/tasks/useTaskPermissions";

type TaskModalsProps = {
  isTaskModalOpen: boolean;
  selectedTask: Task | null;
  onCloseTaskModal: () => void;
  onSaveTask: (data: CreateTaskData) => Promise<void>;
  originScope: TaskTabValue;
  isDeleteModalOpen: boolean;
  taskToDelete: Task | null;
  onCloseDeleteModal: () => void;
  onConfirmDelete: (task: Task, deleteType: "soft" | "hard") => Promise<void>;
  isDetailDrawerOpen: boolean;
  detailTaskId: number | null;
  detailTaskPreview: Task | null;
  onDetailDrawerChange: (open: boolean) => void;
};

export function TaskModals({
  isTaskModalOpen,
  selectedTask,
  onCloseTaskModal,
  onSaveTask,
  originScope,
  isDeleteModalOpen,
  taskToDelete,
  onCloseDeleteModal,
  onConfirmDelete,
  isDetailDrawerOpen,
  detailTaskId,
  detailTaskPreview,
  onDetailDrawerChange,
}: TaskModalsProps) {
  return (
    <>
      <TaskDetailsDrawer
        open={isDetailDrawerOpen}
        onOpenChange={onDetailDrawerChange}
        taskId={detailTaskId}
        fallbackTask={detailTaskPreview}
      />

      <TaskModalStandardized
        open={isTaskModalOpen}
        onClose={onCloseTaskModal}
        task={selectedTask}
        onSave={onSaveTask}
        originScope={originScope}
      />

      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={onCloseDeleteModal}
        item={taskToDelete}
        onConfirm={onConfirmDelete}
        itemType="tapşırıq"
      />
    </>
  );
}
