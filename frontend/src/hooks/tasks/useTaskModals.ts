import { useCallback, useState } from "react";
import { Task } from "@/services/tasks";

export function useTaskModals() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [detailTaskPreview, setDetailTaskPreview] = useState<Task | null>(null);

  const openTaskModal = useCallback((task?: Task | null) => {
    setSelectedTask(task ?? null);
    setIsTaskModalOpen(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }, []);

  const openDeleteModal = useCallback((task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);
  }, []);

  const openDetailsDrawer = useCallback((task: Task) => {
    setDetailTaskId(task.id);
    setDetailTaskPreview(task);
    setIsDetailDrawerOpen(true);
  }, []);

  const handleDetailDrawerChange = useCallback((open: boolean) => {
    setIsDetailDrawerOpen(open);
    if (!open) {
      setDetailTaskId(null);
      setDetailTaskPreview(null);
    }
  }, []);

  const updateSelectedTask = useCallback((task: Task | null) => {
    setSelectedTask(task);
  }, []);

  return {
    isTaskModalOpen,
    selectedTask,
    openTaskModal,
    closeTaskModal,
    updateSelectedTask,
    isDeleteModalOpen,
    taskToDelete,
    openDeleteModal,
    closeDeleteModal,
    isDetailDrawerOpen,
    detailTaskId,
    detailTaskPreview,
    openDetailsDrawer,
    handleDetailDrawerChange,
  };
}
