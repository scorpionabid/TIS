import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { taskService, Task, UserAssignmentSummary } from "@/services/tasks";
import { useAssignedTasksFilters } from "@/hooks/tasks/useAssignedTasksFilters";
import { useAssignmentDialogs } from "@/hooks/tasks/useAssignmentDialogs";
import { useAssignmentMutations } from "@/hooks/tasks/useAssignmentMutations";
import { useAssignedTasksQueries } from "@/hooks/tasks/useAssignedTasksQueries";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePagination } from "@/components/common/TablePagination";
import { TableSkeleton } from "@/components/common/loading/LoadingStates";
import { TaskCompletionDialog, TaskCancellationDialog } from "@/components/tasks/dialogs";
import { TaskDelegationModal } from "@/components/modals/TaskDelegationModal";
import TaskDetailsDrawer from "@/components/tasks/TaskDetailsDrawer";
import { AssignedTasksStats } from "@/components/tasks/assigned/AssignedTasksStats";
import { AssignedTasksFilters } from "@/components/tasks/assigned/AssignedTasksFilters";
import { AssignedTasksTable } from "@/components/tasks/assigned/AssignedTasksTable";

const AssignedTasks = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    sortField,
    sortDirection,
    handleSort,
    page,
    setPage,
    perPage,
    setPerPage,
    isFiltering,
    clearFilters,
  } = useAssignedTasksFilters();

  const {
    decisionContext,
    decisionReason,
    setDecisionReason,
    openDecisionDialog,
    closeDecisionDialog,
    isDecisionValid,
    completionContext,
    completionType,
    setCompletionType,
    completionNotes,
    setCompletionNotes,
    openCompletionDialog,
    closeCompletionDialog,
    isCompletionValid,
    delegationContext,
    openDelegationDialog,
    closeDelegationDialog,
  } = useAssignmentDialogs();

  const {
    isPending: isMutationPending,
    isAssignmentPending,
    markAccepted,
    markInProgress,
    markCompleted,
    markCancelled,
  } = useAssignmentMutations();

  useEffect(() => {
    if (!isMutationPending) {
      closeDecisionDialog();
      closeCompletionDialog();
    }
  }, [isMutationPending, closeDecisionDialog, closeCompletionDialog]);

  const allowedRoles = useMemo(
    () => ["superadmin", "regionadmin", "sektoradmin", "schooladmin", "regionoperator"],
    []
  );
  const hasAccess = currentUser ? allowedRoles.includes(currentUser.role) : false;

  const availableTabs = useMemo(() => {
    const tabs: Array<{ value: "region" | "sector"; label: string }> = [];
    const role = currentUser?.role;
    const regionalRoles = ["superadmin", "regionadmin", "regionoperator"];
    if (role && regionalRoles.includes(role)) {
      tabs.push({ value: "region" as const, label: "Regional Tapşırıqlar" });
    }
    tabs.push({ value: "sector" as const, label: "Sektor Tapşırıqları" });
    return tabs;
  }, [currentUser?.role]);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(availableTabs[0]?.value ?? "sector");
    }
  }, [activeTab, availableTabs, setActiveTab]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, statusFilter, priorityFilter, sortField, sortDirection, activeTab, setPage]);

  const { tasks, meta, statistics, isLoading, error } = useAssignedTasksQueries({
    hasAccess,
    activeTab,
    currentUserId: currentUser?.id,
    filters: {
      search: debouncedSearchTerm,
      status: statusFilter,
      priority: priorityFilter,
      sortField,
      sortDirection,
      page,
      perPage,
    },
  });

  const totalPages = meta?.last_page ?? 1;
  const totalItems = meta?.total ?? 0;

  // Task details drawer state
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleMarkInProgress = (task: Task, assignment: UserAssignmentSummary) => {
    markInProgress(task, assignment.id, assignment.progress ?? 0);
  };

  const submitCompletion = () => {
    if (!completionContext || !isCompletionValid) return;
    markCompleted(completionContext.task, completionContext.assignment.id, completionType, completionNotes);
  };

  const submitCancellation = () => {
    if (!decisionContext || !isDecisionValid) return;
    markCancelled(decisionContext.task, decisionContext.assignment.id, decisionReason);
  };

  const handleSubmitForReview = async (task: Task) => {
    try {
      await taskService.submitForReview(task.id);
      queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      // Error handling is done in the service
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">Bu səhifə yalnız inzibati istifadəçilər üçün nəzərdə tutulub.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-foreground">Təyin olunmuş tapşırıqlar</h1>
          <p className="text-muted-foreground">Sizə təyin olunmuş tapşırıqları izləyin</p>
        </div>
        <TableSkeleton columns={8} rows={5} hasActions />
      </div>
    );
  }

  if (error) {
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

  return (
    <div className="space-y-4 px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground">Təyin olunmuş tapşırıqlar</h1>
        <p className="text-muted-foreground">
          {availableTabs.length > 1
            ? "Regional və sektor tapşırıqlarını ayrıca tablarda izləyin"
            : "Sizə təyin olunmuş tapşırıqları izləyin"}
        </p>
      </div>

      {availableTabs.length > 1 && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "region" | "sector")}>
          <TabsList className="w-full sm:w-auto">
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {statistics && <AssignedTasksStats statistics={statistics} />}

      <AssignedTasksFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        totalItems={totalItems}
        isFiltering={isFiltering}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onClearFilters={clearFilters}
      />

      <AssignedTasksTable
        tasks={tasks}
        isFiltering={isFiltering}
        isMutationPending={isMutationPending}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onClearFilters={clearFilters}
        onViewTask={(task) => { setSelectedTaskId(task.id); setSelectedTask(task); }}
        onMarkInProgress={handleMarkInProgress}
        onOpenCompletion={openCompletionDialog}
        onOpenCancellation={openDecisionDialog}
        onOpenDelegation={openDelegationDialog}
        onSubmitForReview={handleSubmitForReview}
        isAssignmentPending={isAssignmentPending}
      />

      {totalItems > 0 && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={perPage}
          onPageChange={setPage}
          onItemsPerPageChange={(value) => { setPerPage(value); setPage(1); }}
        />
      )}

      <TaskCancellationDialog
        open={Boolean(decisionContext)}
        context={decisionContext}
        reason={decisionReason}
        onReasonChange={setDecisionReason}
        onSubmit={submitCancellation}
        onClose={closeDecisionDialog}
        isPending={decisionContext ? isAssignmentPending(decisionContext.assignment.id) : false}
        isValid={isDecisionValid}
      />

      <TaskCompletionDialog
        open={Boolean(completionContext)}
        context={completionContext}
        completionType={completionType}
        completionNotes={completionNotes}
        onCompletionTypeChange={setCompletionType}
        onCompletionNotesChange={setCompletionNotes}
        onSubmit={submitCompletion}
        onClose={closeCompletionDialog}
        isPending={completionContext ? isAssignmentPending(completionContext.assignment.id) : false}
        isValid={isCompletionValid}
      />

      {delegationContext && (
        <TaskDelegationModal
          open={Boolean(delegationContext)}
          onClose={closeDelegationDialog}
          task={delegationContext.task}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            closeDelegationDialog();
          }}
        />
      )}

      <TaskDetailsDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) { setSelectedTaskId(null); setSelectedTask(null); }
        }}
        fallbackTask={selectedTask}
      />
    </div>
  );
};

export default AssignedTasks;
