import { useEffect, useState, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTaskData, Task, UpdateTaskData, taskService, CreateSubDelegationRequest } from "@/services/tasks";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { ExcelTaskTable } from "@/components/tasks/excel-view/ExcelTaskTable";
import { TaskModals } from "@/components/tasks/TaskModals";
import { MultiDelegationModal } from "@/components/tasks/MultiDelegationModal";
import { TaskFilterState, useTaskFilters } from "@/hooks/tasks/useTaskFilters";
import { useTaskPermissions, TaskTabValue } from "@/hooks/tasks/useTaskPermissions";
import { useTasksData } from "@/hooks/tasks/useTasksData";
import { useTaskModals } from "@/hooks/tasks/useTaskModals";
import { useAssignableUsers } from "@/hooks/tasks/useAssignableUsers";
import { useTaskMutations } from "@/hooks/tasks/useTaskMutations";
import { useTaskStatusChange } from "@/hooks/tasks/useTaskStatusChange";
import { normalizeCreatePayload } from "@/utils/taskActions";
import { usePrefetchTaskFormData } from "@/hooks/tasks/useTaskFormData";
import { TaskViewMode } from "@/components/tasks/TaskViewToggle";
import { TaskStatisticsTab } from "@/components/tasks/tabs/TaskStatisticsTab";
import { TaskCompletionModal } from "@/components/tasks/dialogs/TaskCompletionModal";
import { TasksStatsDatesFilter } from "@/components/tasks/TasksStatsDatesFilter";
import { InstitutionLevelFilter } from "@/components/tasks/InstitutionLevelFilter";
import { TasksPagination } from "@/components/tasks/TasksPagination";

export default function Tasks() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    const saved = localStorage.getItem("tasks-view-mode");
    return (saved as TaskViewMode) || "table";
  });

  const handleViewModeChange = useCallback((mode: TaskViewMode) => {
    setViewMode(mode);
    localStorage.setItem("tasks-view-mode", mode);
  }, []);

  const {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    sourceFilter,
    setSourceFilter,
    deadlineFilter,
    setDeadlineFilter,
    institutionLevel,
    setInstitutionLevel,
    dateRange,
    setDateRange,
    isFiltering,
    clearFilters,
  } = useTaskFilters();

  const handleApplyFilterPreset = (preset: Partial<TaskFilterState>) => {
    if (preset.searchTerm !== undefined) setSearchTerm(preset.searchTerm);
    if (preset.statusFilter !== undefined) setStatusFilter(preset.statusFilter);
    if (preset.priorityFilter !== undefined) setPriorityFilter(preset.priorityFilter);
    if (preset.sourceFilter !== undefined) setSourceFilter(preset.sourceFilter);
    if (preset.deadlineFilter !== undefined) setDeadlineFilter(preset.deadlineFilter);
    if (preset.institutionLevel !== undefined) setInstitutionLevel(preset.institutionLevel);
    if (preset.dateRange !== undefined) setDateRange(preset.dateRange);
  };

  const permissions = useTaskPermissions(currentUser);
  const {
    hasAccess,
    availableTabs,
    activeTab,
    setActiveTab,
    currentTabLabel,
    showCreateButton,
    canEditTaskItem,
    canDeleteTaskItem,
    currentUserRole,
  } = permissions;

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const state = location.state as { activeTab?: TaskTabValue } | null;
    const tabParam = searchParams.get("tab") as TaskTabValue | null;
    const targetTab = state?.activeTab || tabParam;

    if (targetTab && availableTabs.some(t => t.value === targetTab)) {
      setActiveTab(targetTab);
      if (state?.activeTab) window.history.replaceState({}, document.title);
      if (tabParam) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("tab");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [location.state, searchParams, availableTabs, setActiveTab, setSearchParams]);

  const tasksData = useTasksData({
    currentUser,
    activeTab,
    hasAccess,
    canSeeRegionTab: true,
    canSeeSectorTab: true,
    filters: { searchTerm: debouncedSearchTerm, statusFilter, priorityFilter, sourceFilter, deadlineFilter, institutionLevel, dateRange },
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

  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");

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
  } = useTaskModals();

  const { users: availableUsers } = useAssignableUsers({
    perPage: 200,
    enabled: hasAccess,
    originScope: activeTab === "created" ? "region" : null,
  });

  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [selectedTaskForDelegation, setSelectedTaskForDelegation] = useState<Task | null>(null);

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
      toast({ title: "Yönləndirmə uğurlu", description: `${data.delegations.length} nəfərə yönləndirmə edildi` });
      await refreshTasks();
    } catch (error) {
      console.error("Delegation error:", error);
      throw error;
    }
  };

  const { createTask, updateTask, deleteTask } = useTaskMutations();

  const { taskToComplete, setTaskToComplete, isCompletingTask, handleStatusChange, handleConfirmCompletion } =
    useTaskStatusChange({ activeTab, tasks, refreshTasks });

  usePrefetchTaskFormData(null, showCreateButton);

  useEffect(() => {
    if (!hasAccess) return;
    const interval = setInterval(() => {
      refreshTasks().catch(() => undefined);
    }, 60_000);
    return () => clearInterval(interval);
  }, [hasAccess, refreshTasks]);

  if (!hasAccess || availableTabs.length === 0) return <TaskAccessRestricted />;
  if (isLoading) return <TasksLoadingState />;
  if (error) return <TasksErrorState error={error} />;

  const handleOpenModal = async (task?: Task) => {
    if (!task && !showCreateButton) {
      toast({ title: "İcazə yoxdur", description: "Yeni tapşırıq yaratmaq səlahiyyətiniz yoxdur.", variant: "destructive" });
      return;
    }
    openTaskModal(task ?? null);
    if (task) {
      try {
        const freshTask = await taskService.getById(task.id, false);
        updateSelectedTask(freshTask);
      } catch (modalError) {
        console.error("[Tasks] Tapşırıq detalları yenilənmədi", modalError);
      }
    }
  };

  const handleSave = async (formData: CreateTaskData) => {
    const payload = normalizeCreatePayload(formData, { activeTab: activeTab === "created" ? "region" : null });
    const isUpdate = Boolean(selectedTask);
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
      } else {
        await createTask.mutateAsync(payload);
        if (availableTabs.some(tab => tab.value === "created")) setActiveTab("created");
      }
      closeTaskModal();
    } catch (saveError) {
      console.error("[Tasks] Save əməliyyatı alınmadı", saveError);
    }
  };

  const handleDeleteConfirm = async (task: Task | null, _deleteType: "soft" | "hard") => {
    if (!task) return;
    try {
      await deleteTask.mutateAsync(task.id);
      toast({ title: "Tapşırıq silindi" });
    } catch (deleteError) {
      console.error("[Tasks] Silmə əməliyyatında xəta", deleteError);
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
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        deadlineFilter={deadlineFilter}
        onDeadlineFilterChange={setDeadlineFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        tasksCount={pagination?.total ?? stats.total}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onApplyPreset={handleApplyFilterPreset}
        disabled={isFetching}
      />

      {activeTab === "statistics" ? (
        <div className="space-y-4">
          <TasksStatsDatesFilter
            startDate={statsStartDate}
            endDate={statsEndDate}
            onStartDateChange={setStatsStartDate}
            onEndDateChange={setStatsEndDate}
            onClear={() => { setStatsStartDate(""); setStatsEndDate(""); }}
          />
          <TaskStatisticsTab
            stats={stats}
            tasks={tasks}
            availableUsers={availableUsers}
            currentUser={currentUser}
            startDate={statsStartDate || undefined}
            endDate={statsEndDate || undefined}
          />
        </div>
      ) : (
        <>
          <InstitutionLevelFilter
            value={institutionLevel}
            currentUserRole={currentUserRole}
            onChange={setInstitutionLevel}
          />

          <ExcelTaskTable
            tasks={tasks}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onViewTask={handleOpenModal}
            onEditTask={handleOpenModal}
            onDeleteTask={(task) => openDeleteModal(task)}
            canEditTaskItem={canEditTaskItem}
            canDeleteTaskItem={canDeleteTaskItem}
            showCreateButton={showCreateButton && activeTab !== "assigned"}
            page={page}
            perPage={perPage}
            availableUsers={availableUsers}
            onRefresh={refreshTasks}
            onTaskCreated={async () => { await refreshTasks(); }}
            originScope={activeTab === "assigned" ? null : "region"}
            onDelegate={handleOpenDelegationModal}
            currentUserId={currentUser?.id}
            statistics={stats}
            isLoadingStats={isFetching}
            isAssignedTab={activeTab === "assigned"}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      {viewMode === "table" && activeTab !== "statistics" && pagination && (
        <TasksPagination
          pagination={pagination}
          page={page}
          perPage={perPage}
          isFetching={isFetching}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      )}

      <TaskModals
        isTaskModalOpen={isTaskModalOpen}
        selectedTask={selectedTask}
        onCloseTaskModal={closeTaskModal}
        onSaveTask={handleSave}
        originScope={activeTab === "created" ? "region" : null}
        isDeleteModalOpen={isDeleteModalOpen}
        taskToDelete={taskToDelete}
        onCloseDeleteModal={closeDeleteModal}
        onConfirmDelete={(task, deleteType) => handleDeleteConfirm(task, deleteType)}
      />

      <MultiDelegationModal
        isOpen={isDelegationModalOpen}
        onClose={handleCloseDelegationModal}
        taskId={selectedTaskForDelegation?.id || 0}
        availableUsers={availableUsers}
        onDelegate={handleDelegate}
      />

      <TaskCompletionModal
        isOpen={taskToComplete !== null}
        onClose={() => setTaskToComplete(null)}
        onConfirm={handleConfirmCompletion}
        isLoading={isCompletingTask}
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
