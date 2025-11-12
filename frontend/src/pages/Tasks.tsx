import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTaskData, Task, UpdateTaskData, taskService } from "@/services/tasks";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { TasksTable } from "@/components/tasks/TasksTable";
import { TaskModals } from "@/components/tasks/TaskModals";
import { useTaskFilters } from "@/hooks/tasks/useTaskFilters";
import { useTaskPermissions } from "@/hooks/tasks/useTaskPermissions";
import { useTasksData } from "@/hooks/tasks/useTasksData";
import { useTaskModals } from "@/hooks/tasks/useTaskModals";
import { normalizeCreatePayload } from "@/utils/taskActions";

export default function Tasks() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    categoryFilter,
    setCategoryFilter,
    isFiltering,
    clearFilters,
  } = useTaskFilters();

  const permissions = useTaskPermissions(currentUser);
  const {
    hasAccess,
    availableTabs,
    activeTab,
    setActiveTab,
    currentTabLabel,
    showCreateButton,
    canSeeRegionTab,
    canSeeSectorTab,
    canEditTaskItem,
    canDeleteTaskItem,
  } = permissions;

  const tasksData = useTasksData({
    currentUser,
    activeTab,
    hasAccess,
    canSeeRegionTab,
    canSeeSectorTab,
    filters: { searchTerm, statusFilter, priorityFilter, categoryFilter },
  });

  const {
    tasks,
    stats,
    isLoading,
    error,
    sortField,
    sortDirection,
    handleSort,
    refreshTasks,
  } = tasksData;

  const {
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
  } = useTaskModals();

  if (!hasAccess || availableTabs.length === 0) {
    return <TaskAccessRestricted />;
  }

  if (isLoading) {
    return <TasksLoadingState />;
  }

  if (error) {
    return <TasksErrorState error={error} />;
  }

  const handleOpenModal = async (task?: Task) => {
    if (!task && !showCreateButton) {
      toast({
        title: "İcazə yoxdur",
        description: "Bu tabda yeni tapşırıq yaratmaq səlahiyyətiniz yoxdur.",
        variant: "destructive",
      });
      return;
    }

    openTaskModal(task ?? null);

    if (task) {
      try {
        const freshTask = await taskService.getById(task.id, false);
        updateSelectedTask(freshTask);
      } catch (modalError) {
        console.error("[Tasks] Tapşırıq detalları yenilənmədi", modalError);
        toast({
          title: "Detallar alınmadı",
          description:
            modalError instanceof Error ? modalError.message : "Tapşırıq məlumatları yenilənə bilmədi.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSave = async (formData: CreateTaskData) => {
    const payload = normalizeCreatePayload(formData, { activeTab });
    const isUpdate = Boolean(selectedTask);

    console.log("[Tasks] Save əməliyyatı başladı", {
      mode: isUpdate ? "update" : "create",
      payload,
    });

    try {
      if (isUpdate && selectedTask) {
        const updatePayload: UpdateTaskData = {
          title: payload.title,
          description: payload.description,
          category: payload.category,
          priority: payload.priority,
          deadline: payload.deadline,
          notes: payload.notes,
        };

        await taskService.update(selectedTask.id, updatePayload);
        toast({
          title: "Tapşırıq yeniləndi",
          description: "Tapşırıq məlumatları uğurla yeniləndi.",
        });
      } else {
        await taskService.create(payload);
        toast({
          title: "Tapşırıq əlavə edildi",
          description: "Yeni tapşırıq uğurla yaradıldı.",
        });
      }

      await refreshTasks();
      closeTaskModal();
    } catch (saveError) {
      console.error("[Tasks] Save əməliyyatı alınmadı", saveError);
      toast({
        title: "Xəta baş verdi",
        description: saveError instanceof Error ? saveError.message : "Əməliyyat zamanı problem yarandı.",
        variant: "destructive",
      });
      throw saveError;
    }
  };

  const handleDeleteConfirm = async (task: Task | null, deleteType: "soft" | "hard") => {
    if (!task) return;

    console.log("[Tasks] Silmə əməliyyatı başladı", {
      taskId: task.id,
      deleteType,
    });

    try {
      await taskService.delete(task.id);

      toast({
        title: "Tapşırıq silindi",
        description:
          deleteType === "hard" ? "Tapşırıq sistemdən tam silindi." : "Tapşırıq uğurla silindi.",
      });

      await refreshTasks();
    } catch (deleteError) {
      console.error("[Tasks] Silmə əməliyyatında xəta", deleteError);
      toast({
        title: "Silinə bilmədi",
        description:
          deleteError instanceof Error ? deleteError.message : "Tapşırıq silinərkən xəta baş verdi.",
        variant: "destructive",
      });
      throw deleteError;
    }
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <TasksHeader
        currentTabLabel={currentTabLabel}
        availableTabs={availableTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showCreateButton={showCreateButton}
        onCreateTask={() => handleOpenModal()}
        stats={stats}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        tasksCount={tasks.length}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
      />

      <TasksTable
        tasks={tasks}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onViewTask={(task) => openDetailsDrawer(task)}
        onEditTask={handleOpenModal}
        onDeleteTask={(task) => openDeleteModal(task)}
        canEditTaskItem={canEditTaskItem}
        canDeleteTaskItem={canDeleteTaskItem}
        showCreateButton={showCreateButton}
        onCreateTask={() => handleOpenModal()}
      />

      <TaskModals
        isTaskModalOpen={isTaskModalOpen}
        selectedTask={selectedTask}
        onCloseTaskModal={closeTaskModal}
        onSaveTask={handleSave}
        originScope={activeTab}
        isDeleteModalOpen={isDeleteModalOpen}
        taskToDelete={taskToDelete}
        onCloseDeleteModal={closeDeleteModal}
        onConfirmDelete={(task, deleteType) => handleDeleteConfirm(task, deleteType)}
        isDetailDrawerOpen={isDetailDrawerOpen}
        detailTaskId={detailTaskId}
        detailTaskPreview={detailTaskPreview}
        onDetailDrawerChange={handleDetailDrawerChange}
      />
    </div>
  );
}

function TaskAccessRestricted() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
        <p className="text-muted-foreground">Bu səhifəyə yalnız idarəçi rolları daxil ola bilər</p>
      </div>
    </div>
  );
}

function TasksLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-2">
      <Loader2 className="h-8 w-8 animate-spin" />
      Tapşırıqlar yüklənir...
    </div>
  );
}

function TasksErrorState({ error }: { error?: Error | null }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
      <p className="text-muted-foreground">
        Tapşırıqlar yüklənərkən problem yarandı
        {error instanceof Error && error.message ? `: ${error.message}` : "."}
      </p>
    </div>
  );
}
