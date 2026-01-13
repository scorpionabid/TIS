import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Table as TableIcon, Grid3x3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTaskData, Task, UpdateTaskData, taskService } from "@/services/tasks";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { TasksTable } from "@/components/tasks/TasksTable";
import { ExcelTaskTable } from "@/components/tasks/excel-view/ExcelTaskTable";
import { TaskModals } from "@/components/tasks/TaskModals";
import { TaskFilterState, useTaskFilters } from "@/hooks/tasks/useTaskFilters";
import { useTaskPermissions } from "@/hooks/tasks/useTaskPermissions";
import { useTasksData } from "@/hooks/tasks/useTasksData";
import { useTaskModals } from "@/hooks/tasks/useTaskModals";
import { useAssignableUsers } from "@/hooks/tasks/useAssignableUsers";
import { useAvailableDepartments } from "@/hooks/tasks/useAvailableDepartments";
import { useTaskMutations } from "@/hooks/tasks/useTaskMutations";
import { normalizeCreatePayload } from "@/utils/taskActions";
import { usePrefetchTaskFormData } from "@/hooks/tasks/useTaskFormData";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function Tasks() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'table' | 'excel'>('excel');

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    categoryFilter,
    setCategoryFilter,
    deadlineFilter,
    setDeadlineFilter,
    isFiltering,
    clearFilters,
  } = useTaskFilters();

  const handleApplyFilterPreset = (preset: Partial<TaskFilterState>) => {
    if (preset.searchTerm !== undefined) {
      setSearchTerm(preset.searchTerm);
    }
    if (preset.statusFilter !== undefined) {
      setStatusFilter(preset.statusFilter);
    }
    if (preset.priorityFilter !== undefined) {
      setPriorityFilter(preset.priorityFilter);
    }
    if (preset.categoryFilter !== undefined) {
      setCategoryFilter(preset.categoryFilter);
    }
    if (preset.deadlineFilter !== undefined) {
      setDeadlineFilter(preset.deadlineFilter);
    }
  };

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
    filters: { searchTerm, statusFilter, priorityFilter, categoryFilter, deadlineFilter },
  });

  const {
    tasks,
    stats,
    isLoading,
    isFetching,
    error,
    sortField,
    sortDirection,
    handleSort,
    refreshTasks,
    pagination,
    page,
    perPage,
    setPage,
    setPerPage,
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

  // Use new centralized hooks for fetching users and departments
  const { users: availableUsers } = useAssignableUsers({
    perPage: 1000,
    enabled: hasAccess,
  });

  const { departments: availableDepartments } = useAvailableDepartments({
    enabled: hasAccess,
  });

  const { createTask, updateTask, deleteTask } = useTaskMutations();

  usePrefetchTaskFormData(null, showCreateButton);
  usePrefetchTaskFormData("region", showCreateButton && canSeeRegionTab);
  usePrefetchTaskFormData("sector", showCreateButton && canSeeSectorTab);

  // Auto-refresh tasks every minute
  useEffect(() => {
    if (!hasAccess) return;
    const interval = setInterval(() => {
      refreshTasks().catch(() => undefined);
    }, 60_000);
    return () => clearInterval(interval);
  }, [hasAccess, refreshTasks]);

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

        await updateTask.mutateAsync({ id: selectedTask.id, data: updatePayload });
        toast({
          title: "Tapşırıq yeniləndi",
          description: "Tapşırıq məlumatları uğurla yeniləndi.",
        });
      } else {
        await createTask.mutateAsync(payload);
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
      await deleteTask.mutateAsync(task.id);
      toast({
        title: "Tapşırıq silindi",
        description: deleteType === "hard" ? "Tapşırıq sistemdən tam silindi." : "Tapşırıq uğurla silindi.",
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
        deadlineFilter={deadlineFilter}
        onDeadlineFilterChange={setDeadlineFilter}
        tasksCount={pagination?.total ?? stats.total}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onApplyPreset={handleApplyFilterPreset}
        disabled={isFetching}
      />

      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'table' | 'excel')}>
          <ToggleGroupItem value="table" aria-label="Cədvəl görünüşü" className="gap-2">
            <TableIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Cədvəl</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="excel" aria-label="Excel görünüşü" className="gap-2">
            <Grid3x3 className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Conditional Rendering Based on View Mode */}
      {viewMode === 'excel' ? (
        <ExcelTaskTable
          tasks={tasks}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewTask={(task) => openDetailsDrawer(task)}
          onEditTask={handleOpenModal}
          onDeleteTask={(task) => openDeleteModal(task)}
          onCreateTask={() => handleOpenModal()}
          canEditTaskItem={canEditTaskItem}
          canDeleteTaskItem={canDeleteTaskItem}
          showCreateButton={showCreateButton}
          page={page}
          perPage={perPage}
          availableUsers={availableUsers}
          availableDepartments={availableDepartments}
          onRefresh={refreshTasks}
        />
      ) : (
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
          pagination={pagination}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          isFetching={isFetching}
        />
      )}

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
