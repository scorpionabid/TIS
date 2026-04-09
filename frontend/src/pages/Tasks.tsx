import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle, Loader2, ChevronLeft, ChevronRight, BarChart2, List, CheckSquare, CalendarDays, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTaskData, Task, UpdateTaskData, taskService, CreateSubDelegationRequest } from "@/services/tasks";
import { TasksHeader } from "@/components/tasks/TasksHeader";
import { ExcelTaskTable } from "@/components/tasks/excel-view/ExcelTaskTable";
import { TaskModals } from "@/components/tasks/TaskModals";
import { MultiDelegationModal } from "@/components/tasks/MultiDelegationModal";
import { TaskFilterState, useTaskFilters } from "@/hooks/tasks/useTaskFilters";
import { useTaskPermissions, TaskTabValue } from "@/hooks/tasks/useTaskPermissions";
import { useTasksData, SortField } from "@/hooks/tasks/useTasksData";
import { useTaskModals } from "@/hooks/tasks/useTaskModals";
import { useAssignableUsers } from "@/hooks/tasks/useAssignableUsers";
import { useTaskMutations } from "@/hooks/tasks/useTaskMutations";
import { normalizeCreatePayload } from "@/utils/taskActions";
import { usePrefetchTaskFormData } from "@/hooks/tasks/useTaskFormData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskViewMode } from "@/components/tasks/TaskViewToggle";
import { TaskStatsWidget } from "@/components/tasks/TaskStatsWidget";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskStatisticsTab } from "@/components/tasks/tabs/TaskStatisticsTab";
import { TaskCompletionModal } from "@/components/tasks/dialogs/TaskCompletionModal";

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

  const {
    searchTerm,
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

  // Handle tab from navigation state (redirects) or query params
  useEffect(() => {
    const state = location.state as { activeTab?: TaskTabValue } | null;
    const tabParam = searchParams.get('tab') as TaskTabValue | null;
    const targetTab = state?.activeTab || tabParam;

    if (targetTab && availableTabs.some(t => t.value === targetTab)) {
      setActiveTab(targetTab);
      
      // Clean up state and params
      if (state?.activeTab) {
        window.history.replaceState({}, document.title);
      }
      if (tabParam) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('tab');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [location.state, searchParams, availableTabs, setActiveTab, setSearchParams]);

  const tasksData = useTasksData({
    currentUser,
    activeTab,
    hasAccess,
    canSeeRegionTab: true, // Not used strictly anymore inside the hook query
    canSeeSectorTab: true,
    filters: { searchTerm, statusFilter, priorityFilter, sourceFilter, deadlineFilter, institutionLevel },
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
    assignedTasks,
  } = tasksData;

  // Statistika tabı üçün tarix aralığı filtri
  const [statsStartDate, setStatsStartDate] = useState('');
  const [statsEndDate, setStatsEndDate] = useState('');

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

  // Use new centralized hooks for fetching users
  const { users: availableUsers } = useAssignableUsers({
    perPage: 200,
    enabled: hasAccess,
    originScope: activeTab === 'created' ? 'region' : null,
  });

  // Sub-delegation state
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [selectedTaskForDelegation, setSelectedTaskForDelegation] = useState<Task | null>(null);

  // Completion modal state
  const [taskToComplete, setTaskToComplete] = useState<number | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

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
      await refreshTasks();
    } catch (error) {
      console.error('Delegation error:', error);
      throw error;
    }
  };

  const { createTask, updateTask, deleteTask } = useTaskMutations();

  // Actual status change execution
  const executeStatusChange = useCallback(async (taskId: number, newStatus: Task["status"], completionData?: { resolution: string; notes: string }) => {
    try {
      if (activeTab === 'assigned') {
        // For assigned tab: update assignment status, not task directly
        const task = tasks.find(t => t.id === taskId);
        const assignmentId = task?.user_assignment?.id;
        if (!assignmentId) {
          toast({
            title: "Xəta baş verdi",
            description: "Tapşırıq təyinatı tapılmadı.",
            variant: "destructive",
          });
          return;
        }
        
        const payload: Parameters<typeof taskService.updateAssignmentStatus>[1] = { 
          status: newStatus,
          ...(newStatus === 'in_progress' && { progress: 25 }),
          ...(newStatus === 'completed' && { progress: 100 }),
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
      toast({
        title: "Status yeniləndi",
        description: "Tapşırıq statusu uğurla dəyişdirildi.",
      });
    } catch (error) {
      console.error("[Tasks] Status change failed", error);
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Status dəyişdirilə bilmədi.",
        variant: "destructive",
      });
      throw error;
    }
  }, [updateTask, toast, activeTab, tasks, refreshTasks]);

  // Handle status change for task rows and Kanban view
  const handleStatusChange = useCallback(async (taskId: number, newStatus: Task["status"]) => {
    if (newStatus === 'completed' && activeTab === 'assigned') {
      setTaskToComplete(taskId);
      return;
    }
    await executeStatusChange(taskId, newStatus);
  }, [executeStatusChange, activeTab]);

  const handleConfirmCompletion = async (data: { resolution: string; notes: string }) => {
    if (!taskToComplete) return;
    setIsCompletingTask(true);
    try {
      await executeStatusChange(taskToComplete, 'completed', data);
      setTaskToComplete(null);
    } catch (error) {
      // Error is handled inside executeStatusChange
    } finally {
      setIsCompletingTask(false);
    }
  };

  usePrefetchTaskFormData(null, showCreateButton);

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
        description: "Yeni tapşırıq yaratmaq səlahiyyətiniz yoxdur.",
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
      }
    }
  };

  const handleSave = async (formData: CreateTaskData) => {
    const payload = normalizeCreatePayload(formData, { activeTab: activeTab === 'created' ? 'region' : null });
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
        if (availableTabs.some((tab) => tab.value === "created")) {
          setActiveTab("created");
        }
      }
      closeTaskModal();
    } catch (saveError) {
      console.error("[Tasks] Save əməliyyatı alınmadı", saveError);
    }
  };

  const handleTaskCreated = async () => {
    await refreshTasks();
  };

  const handleDeleteConfirm = async (task: Task | null, deleteType: "soft" | "hard") => {
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

      {/* Enhanced Statistics Tab */}
      {activeTab === "statistics" ? (
        <div className="space-y-4">
          {/* Tarix aralığı filtri */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <CalendarDays className="h-4 w-4" />
              Tarix aralığı:
            </div>
            <input
              type="date"
              value={statsStartDate}
              onChange={e => setStatsStartDate(e.target.value)}
              className="h-8 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={statsEndDate}
              onChange={e => setStatsEndDate(e.target.value)}
              className="h-8 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {(statsStartDate || statsEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStatsStartDate(''); setStatsEndDate(''); }}
                className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Sıfırla
              </Button>
            )}
          </div>
          <TaskStatisticsTab
            stats={stats}
            tasks={tasks}
            assignedTasks={assignedTasks}
            availableUsers={availableUsers}
            currentUser={currentUser}
            startDate={statsStartDate || undefined}
            endDate={statsEndDate || undefined}
          />
        </div>
      ) : (
        <>
          {/* Hierarchical Filter Buttons - Only for Created tab and admins */}
          {activeTab === "created" && ["superadmin", "regionadmin", "sektoradmin"].includes(currentUserRole || "") && (
            <div className="flex items-center gap-2 pb-2">
              <Button 
                variant={institutionLevel === 'all' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setInstitutionLevel('all')}
                className="rounded-full h-8 text-xs px-4"
              >
                Hamısı
              </Button>
              <Button 
                variant={institutionLevel === 'region' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setInstitutionLevel('region')}
                className="rounded-full h-8 text-xs px-4"
              >
                Region
              </Button>
              <Button 
                variant={institutionLevel === 'sector' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setInstitutionLevel('sector')}
                className="rounded-full h-8 text-xs px-4"
              >
                Sektor
              </Button>
              <Button 
                variant={institutionLevel === 'school' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setInstitutionLevel('school')}
                className="rounded-full h-8 text-xs px-4"
              >
                Məktəb
              </Button>
            </div>
          )}

          {/* Excel Task Table */}
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
            showCreateButton={showCreateButton && activeTab !== 'assigned'}
            page={page}
            perPage={perPage}
            availableUsers={availableUsers}
            onRefresh={refreshTasks}
            onTaskCreated={handleTaskCreated}
            originScope={activeTab === 'assigned' ? null : 'region'}
            onDelegate={handleOpenDelegationModal}
            currentUserId={currentUser?.id}
            statistics={stats}
            isLoadingStats={isFetching}
            isAssignedTab={activeTab === 'assigned'}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      {/* Pagination */}
      {viewMode === "table" && activeTab !== "statistics" && pagination && pagination.total > 0 && (
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
              Səhifə {page} / {pagination.total_pages || Math.ceil(pagination.total / perPage)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= (pagination.total_pages || Math.ceil(pagination.total / perPage)) || isFetching}
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
        originScope={activeTab === 'created' ? 'region' : null}
        isDeleteModalOpen={isDeleteModalOpen}
        taskToDelete={taskToDelete}
        onCloseDeleteModal={closeDeleteModal}
        onConfirmDelete={(task, deleteType) => handleDeleteConfirm(task, deleteType)}
      />

      {/* Multi-Delegation Modal */}
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
