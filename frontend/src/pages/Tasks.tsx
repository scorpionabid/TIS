import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Loader2, ChevronLeft, ChevronRight, BarChart2, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTaskData, Task, UpdateTaskData, taskService, CreateSubDelegationRequest } from "@/services/tasks";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { ExcelTaskTable } from "@/components/tasks/excel-view/ExcelTaskTable";
import { TaskModals } from "@/components/tasks/TaskModals";
import { MultiDelegationModal } from "@/components/tasks/MultiDelegationModal";
import { SubDelegationTracker } from "@/components/tasks/SubDelegationTracker";
import { TaskFilterState, useTaskFilters } from "@/hooks/tasks/useTaskFilters";
import { useTaskPermissions } from "@/hooks/tasks/useTaskPermissions";
import { useTasksData } from "@/hooks/tasks/useTasksData";
import { useTaskModals } from "@/hooks/tasks/useTaskModals";
import { useAssignableUsers } from "@/hooks/tasks/useAssignableUsers";
import { useTaskMutations } from "@/hooks/tasks/useTaskMutations";
import { normalizeCreatePayload } from "@/utils/taskActions";
import { usePrefetchTaskFormData } from "@/hooks/tasks/useTaskFormData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskViewToggle, TaskViewMode } from "@/components/tasks/TaskViewToggle";
import { TaskKanbanView } from "@/components/tasks/TaskKanbanView";
import { TaskStatsWidget } from "@/components/tasks/TaskStatsWidget";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Tasks() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // View mode state (persisted in localStorage)
  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    const saved = localStorage.getItem("tasks-view-mode");
    return (saved as TaskViewMode) || "table";
  });
  const [showCharts, setShowCharts] = useState(() => {
    const saved = localStorage.getItem("tasks-show-charts");
    return saved !== "false"; // Default to true
  });

  // Persist view mode
  const handleViewModeChange = useCallback((mode: TaskViewMode) => {
    setViewMode(mode);
    localStorage.setItem("tasks-view-mode", mode);
  }, []);

  // Persist charts visibility
  const handleToggleCharts = useCallback(() => {
    setShowCharts((prev) => {
      const newValue = !prev;
      localStorage.setItem("tasks-show-charts", String(newValue));
      return newValue;
    });
  }, []);

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

  // Use new centralized hooks for fetching users (lower-level users only)
  const { users: availableUsers } = useAssignableUsers({
    perPage: 200,
    enabled: hasAccess,
    originScope: activeTab === 'region' ? 'region' : activeTab === 'sector' ? 'sector' : null,
  });

  // Sub-delegation state
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [selectedTaskForDelegation, setSelectedTaskForDelegation] = useState<Task | null>(null);
  const [subDelegations, setSubDelegations] = useState<any[]>([]);

  // Delegation handlers
  const handleOpenDelegationModal = (task: Task) => {
    setSelectedTaskForDelegation(task);
    setIsDelegationModalOpen(true);
  };

  const handleCloseDelegationModal = () => {
    setIsDelegationModalOpen(false);
    setSelectedTaskForDelegation(null);
  };

  const handleDelegate = async (data: CreateSubDelegationRequest) => {
    if (!selectedTaskForDelegation) return;

    try {
      await taskService.createSubDelegations(selectedTaskForDelegation.id, data);
      toast({
        title: 'Yönləndirmə uğurlu',
        description: `${data.delegations.length} nəfərə yönləndirmə edildi`,
      });
      
      // Refresh tasks and delegations
      await refreshTasks();
      if (selectedTaskForDelegation.id) {
        const delegations = await taskService.getSubDelegations(selectedTaskForDelegation.id);
        setSubDelegations(delegations);
      }
    } catch (error) {
      console.error('Delegation error:', error);
      throw error;
    }
  };

  // Load sub-delegations for a task
  const loadSubDelegations = async (taskId: number) => {
    try {
      const delegations = await taskService.getSubDelegations(taskId);
      setSubDelegations(delegations);
    } catch (error) {
      console.error('Error loading sub-delegations:', error);
      setSubDelegations([]);
    }
  };

  const { createTask, updateTask, deleteTask } = useTaskMutations();

  // Handle status change for Kanban view
  const handleStatusChange = useCallback(async (taskId: number, newStatus: Task["status"]) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { status: newStatus } });
      toast({
        title: "Status yeniləndi",
        description: "Tapşırıq statusu uğurla dəyişdirildi.",
      });
      await refreshTasks();
    } catch (error) {
      console.error("[Tasks] Status change failed", error);
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Status dəyişdirilə bilmədi.",
        variant: "destructive",
      });
      throw error;
    }
  }, [updateTask, refreshTasks, toast]);

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

  const handleTaskCreated = async () => {
    console.log('[Tasks] Yeni tapşırıq yaradıldı, cədvəl yenilənir...');
    await refreshTasks();
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

      {/* Enhanced Stats with Charts */}
      <Collapsible open={showCharts} onOpenChange={setShowCharts}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <BarChart2 className="h-4 w-4" />
              {showCharts ? "Statistikanı gizlə" : "Statistikanı göstər"}
            </Button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <TaskViewToggle
              value={viewMode}
              onChange={handleViewModeChange}
              showCalendar={false}
              showAnalytics={false}
              disabled={isFetching}
            />
          </div>
        </div>
        <CollapsibleContent className="mt-4">
          <TaskStatsWidget stats={stats} showCharts={true} />
        </CollapsibleContent>
      </Collapsible>

      {/* Conditional View Rendering */}
      {viewMode === "kanban" ? (
        <TaskKanbanView
          tasks={tasks}
          onViewTask={(task) => openDetailsDrawer(task)}
          onEditTask={handleOpenModal}
          onDeleteTask={(task) => openDeleteModal(task)}
          onStatusChange={handleStatusChange}
          canEditTaskItem={canEditTaskItem}
          canDeleteTaskItem={canDeleteTaskItem}
          isLoading={isFetching}
        />
      ) : (
        /* Excel Task Table */
        <ExcelTaskTable
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
          page={page}
          perPage={perPage}
          availableUsers={availableUsers}
          onRefresh={refreshTasks}
          onTaskCreated={handleTaskCreated}
          originScope={activeTab}
        />
      )}

      {/* Pagination - Only show for table view */}
      {viewMode === "table" && pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Səhifədə:</span>
            <Select
              value={String(perPage)}
              onValueChange={(value) => setPerPage(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="hidden sm:inline">
              Ümumi {pagination.total} tapşırıqdan {((page - 1) * perPage) + 1}-{Math.min(page * perPage, pagination.total)} göstərilir
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || isFetching}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Əvvəlki
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Səhifə {page} / {pagination.last_page || Math.ceil(pagination.total / perPage)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= (pagination.last_page || Math.ceil(pagination.total / perPage)) || isFetching}
            >
              Sonrakı
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
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

      {/* Multi-Delegation Modal */}
      <MultiDelegationModal
        isOpen={isDelegationModalOpen}
        onClose={handleCloseDelegationModal}
        taskId={selectedTaskForDelegation?.id || 0}
        availableUsers={availableUsers}
        onDelegate={handleDelegate}
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
