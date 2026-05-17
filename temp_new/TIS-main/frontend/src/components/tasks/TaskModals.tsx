import { TaskModalStandardized } from "@/components/modals/TaskModalStandardized";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { CreateTaskData, Task } from "@/services/tasks";

type TaskModalsProps = {
  isTaskModalOpen: boolean;
  selectedTask: Task | null;
  onCloseTaskModal: () => void;
  onSaveTask: (data: CreateTaskData) => Promise<void>;
  originScope: any;
  isDeleteModalOpen: boolean;
  taskToDelete: Task | null;
  onCloseDeleteModal: () => void;
  onConfirmDelete: (task: Task, deleteType: "soft" | "hard") => Promise<void>;
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
}: TaskModalsProps) {
  return (
    <>
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
