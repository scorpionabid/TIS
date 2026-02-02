import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Filter, Search, Loader2, Forward, ArrowUpDown, ArrowUp, ArrowDown, ClipboardList, Send, Eye } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { taskService, Task, UserAssignmentSummary, AssignmentStatus } from "@/services/tasks";
import { useAssignedTasksFilters, type SortField, type SortDirection } from "@/hooks/tasks/useAssignedTasksFilters";
import { useAssignmentDialogs } from "@/hooks/tasks/useAssignmentDialogs";
import { useAssignmentMutations } from "@/hooks/tasks/useAssignmentMutations";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
} from "@/components/tasks/config/taskFormFields";
import { TaskDelegationModal } from "@/components/modals/TaskDelegationModal";
import { TablePagination } from "@/components/common/TablePagination";
import { TableSkeleton } from "@/components/common/loading/LoadingStates";
import { TaskCompletionDialog, TaskCancellationDialog } from "@/components/tasks/dialogs";
import TaskDetailsDrawer from "@/components/tasks/TaskDetailsDrawer";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("az-AZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusBadgeVariant = (status: string): "secondary" | "default" | "outline" | "destructive" => {
  const variants: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
    pending: "secondary",
    accepted: "default",
    in_progress: "default",
    review: "outline",
    completed: "default",
    cancelled: "destructive",
  };
  return variants[status] || "secondary";
};

// Extended status labels for assignment statuses
const assignmentStatusLabels: Record<string, string> = {
  pending: "Gözləyir",
  accepted: "Qəbul edilib",
  in_progress: "İcrada",
  completed: "Tamamlanıb",
  cancelled: "Ləğv edilib",
  review: "Nəzərdən keçirilir",
};

const getPriorityBadgeVariant = (priority: string) => {
  const variants: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
    low: "outline",
    medium: "secondary",
    high: "default",
    urgent: "destructive",
  };
  return variants[priority] || "secondary";
};

// Sortable header helper component
interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ field, label, currentField, direction, onSort }) => {
  const isActive = currentField === field;
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );
};

const AssignedTasks = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Custom hooks for state management
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
  } = useAssignmentMutations(() => {
    closeDecisionDialog();
    closeCompletionDialog();
  });

  const allowedRoles = useMemo(
    () => ["superadmin", "regionadmin", "sektoradmin", "schooladmin", "regionoperator"],
    []
  );

  const hasAccess = currentUser ? allowedRoles.includes(currentUser.role) : false;

  const availableTabs = useMemo(
    () =>
      [
        { value: "region" as const, label: "Regional Tapşırıqlar" },
        { value: "sector" as const, label: "Sektor Tapşırıqları" },
      ] as Array<{ value: "region" | "sector"; label: string }>,
    []
  );

  useEffect(() => {
    if (availableTabs.some((tab) => tab.value === activeTab)) {
      return;
    }

    setActiveTab("region");
  }, [activeTab, availableTabs]);

  const regionTasksQuery = useQuery({
    queryKey: ["assigned-tasks", "region", currentUser?.id, debouncedSearchTerm, statusFilter, priorityFilter, sortField, sortDirection, page, perPage],
    queryFn: () => taskService.getAssignedToMe({
      origin_scope: "region",
      search: debouncedSearchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter as Task["status"] : undefined,
      priority: priorityFilter !== "all" ? priorityFilter as Task["priority"] : undefined,
      sort_by: sortField,
      sort_direction: sortDirection,
      page,
      per_page: perPage,
    }),
    enabled: hasAccess && activeTab === "region",
  });

  const sectorTasksQuery = useQuery({
    queryKey: ["assigned-tasks", "sector", currentUser?.id, debouncedSearchTerm, statusFilter, priorityFilter, sortField, sortDirection, page, perPage],
    queryFn: () => taskService.getAssignedToMe({
      origin_scope: "sector",
      search: debouncedSearchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter as Task["status"] : undefined,
      priority: priorityFilter !== "all" ? priorityFilter as Task["priority"] : undefined,
      sort_by: sortField,
      sort_direction: sortDirection,
      page,
      per_page: perPage,
    }),
    enabled: hasAccess && activeTab === "sector",
  });

  const activeQuery = activeTab === "region" ? regionTasksQuery : sectorTasksQuery;
  const isLoading = activeQuery.isLoading || activeQuery.isFetching;
  const error = activeQuery.error as Error | null | undefined;

  // Server-side data extraction
  const responseData = activeQuery.data as { data?: Task[]; meta?: { current_page: number; last_page: number; per_page: number; total: number; from: number; to: number } } | undefined;
  const tasks = Array.isArray(responseData?.data) ? responseData.data : [];
  const meta = responseData?.meta;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, statusFilter, priorityFilter, sortField, sortDirection, activeTab]);

  // Server-side pagination metadata
  const totalPages = meta?.last_page ?? 1;
  const totalItems = meta?.total ?? 0;

  // Task details drawer state
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Helper function to check if transition is allowed
  const canTransition = (assignment: UserAssignmentSummary | null | undefined, status: Task["status"] | AssignmentStatus) =>
    Boolean(assignment?.can_update && assignment.allowed_transitions?.includes(status as AssignmentStatus));

  // Action handlers using hook mutations
  const handleMarkInProgress = (task: Task, assignment: UserAssignmentSummary) => {
    if (!canTransition(assignment, "in_progress")) return;
    markInProgress(task, assignment.id, assignment.progress ?? 0);
  };

  const handleOpenCompletionDialog = (task: Task, assignment: UserAssignmentSummary) => {
    if (!canTransition(assignment, "completed")) return;
    openCompletionDialog(task, assignment);
  };

  const handleOpenCancellationDialog = (task: Task, assignment: UserAssignmentSummary) => {
    if (!canTransition(assignment, "cancelled")) return;
    openDecisionDialog(task, assignment);
  };

  const submitCompletion = () => {
    if (!completionContext || !isCompletionValid) return;
    const { assignment, task } = completionContext;
    markCompleted(task, assignment.id, completionType, completionNotes);
  };

  const submitCancellation = () => {
    if (!decisionContext || !isDecisionValid) return;
    const { assignment, task } = decisionContext;
    markCancelled(task, assignment.id, decisionReason);
  };

  // Handle accepting a task
  const handleAcceptTask = (task: Task, assignment: UserAssignmentSummary) => {
    if (!canTransition(assignment, "accepted" as Task["status"])) return;
    markAccepted(task, assignment.id);
  };

  // Handle submit for review
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
          <p className="text-muted-foreground">Regional və sektor tapşırıqlarını ayrıca tablarda izləyin</p>
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
        <p className="text-muted-foreground">Regional və sektor tapşırıqlarını ayrıca tablarda izləyin</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "region" | "sector")}>
        <TabsList className="w-full sm:w-auto">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tapşırıq axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün prioritetlər</SelectItem>
              {Object.entries(priorityLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{totalItems} tapşırıq</span>
          {(searchTerm || statusFilter !== "all" || priorityFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filterləri təmizlə
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                field="title"
                label="Tapşırıq"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
              <TableHead>Kateqoriya</TableHead>
              <TableHead>Göndərən</TableHead>
              <SortableHeader
                field="priority"
                label="Prioritet"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="status"
                label="Status"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="deadline"
                label="Son tarix"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
              <TableHead>İrəliləyiş</TableHead>
              <TableHead className="text-right w-[280px]">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48">
                  <div className="flex flex-col items-center justify-center text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-lg font-medium text-muted-foreground mb-1">
                      {isFiltering ? "Nəticə tapılmadı" : "Tapşırıq yoxdur"}
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      {isFiltering
                        ? "Axtarış kriteriyalarınıza uyğun tapşırıq tapılmadı. Filterləri dəyişdirməyi sınayın."
                        : "Hal-hazırda sizə təyin olunmuş tapşırıq yoxdur."
                      }
                    </p>
                    {isFiltering && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={clearFilters}
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Filterləri təmizlə
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const assignment = task.user_assignment;
                const statusForUser = assignment?.status ?? task.status;
                const progressValue = assignment?.progress ?? task.progress ?? 0;

                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {task.origin_scope_label && (
                          <Badge variant="outline">
                            {task.origin_scope_label}
                          </Badge>
                        )}
                        <button
                          className="text-left hover:text-primary hover:underline cursor-pointer"
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setSelectedTask(task);
                          }}
                        >
                          {task.title}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{categoryLabels[task.category]}</TableCell>
                    <TableCell>{task.creator?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(task.priority)}>
                        {priorityLabels[task.priority] || task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={getStatusBadgeVariant(statusForUser)}>
                          {assignmentStatusLabels[statusForUser] || statusLabels[statusForUser] || statusForUser}
                        </Badge>
                        {assignment && task.status !== statusForUser && (
                          <span className="text-xs text-muted-foreground">
                            Ümumi: {statusLabels[task.status] || task.status}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(assignment?.due_date ?? task.deadline)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(Math.max(progressValue, 0), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round(progressValue)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {assignment ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap justify-end gap-2">
                            {/* View details button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setSelectedTask(task);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* Accept button - for pending tasks */}
                            {canTransition(assignment, "accepted" as Task["status"]) && statusForUser === "pending" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleAcceptTask(task, assignment)}
                                disabled={isMutationPending}
                              >
                                {isAssignmentPending(assignment.id) ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Qəbul et
                              </Button>
                            )}
                            {/* Delegation button - now controlled by backend permission flag */}
                            {assignment.can_delegate && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDelegationDialog(task, assignment)}
                                disabled={isMutationPending}
                              >
                                <Forward className="mr-2 h-4 w-4" />
                                Yönləndir
                              </Button>
                            )}
                            {/* Start working button - for accepted tasks */}
                            {canTransition(assignment, "in_progress") && statusForUser !== "completed" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleMarkInProgress(task, assignment)}
                                disabled={isMutationPending}
                              >
                                {isAssignmentPending(assignment.id) ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                İcraya götür
                              </Button>
                            )}
                            {/* Complete button */}
                            {canTransition(assignment, "completed") && statusForUser !== "completed" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleOpenCompletionDialog(task, assignment)}
                                disabled={isMutationPending}
                              >
                                Tamamla
                              </Button>
                            )}
                            {/* Submit for review button - for completed tasks */}
                            {statusForUser === "completed" && task.requires_approval && task.approval_status !== "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmitForReview(task)}
                                disabled={isMutationPending}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Təsdiqə göndər
                              </Button>
                            )}
                            {/* Cancel button */}
                            {canTransition(assignment, "cancelled") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCancellationDialog(task, assignment)}
                                disabled={isMutationPending}
                              >
                                Ləğv et
                              </Button>
                            )}
                          </div>
                          {assignment.institution && (
                            <span className="text-xs text-muted-foreground">
                              Müəssisə: {assignment.institution.name}
                            </span>
                          )}
                          {assignment.completion_notes && (
                            <span className="text-xs text-muted-foreground text-right">
                              Son qeyd: {assignment.completion_notes}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Məsul təyinat tapılmadı</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={perPage}
          onPageChange={setPage}
          onItemsPerPageChange={(value) => {
            setPerPage(value);
            setPage(1);
          }}
        />
      )}

      {/* Task Cancellation Dialog */}
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

      {/* Task Completion Dialog */}
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

      {/* Task Delegation Modal */}
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

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
            setSelectedTask(null);
          }
        }}
        fallbackTask={selectedTask}
      />
    </div>
  );
};

export default AssignedTasks;
