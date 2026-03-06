import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Filter, Search, Loader2, Forward, ArrowUpDown, ArrowUp, ArrowDown, ClipboardList, Send, Eye, Clock } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { taskService, Task, UserAssignmentSummary, AssignmentStatus } from "@/services/tasks";
import { useAssignedTasksFilters, type SortField, type SortDirection } from "@/hooks/tasks/useAssignedTasksFilters";
import { useAssignmentDialogs } from "@/hooks/tasks/useAssignmentDialogs";
import { useAssignmentMutations } from "@/hooks/tasks/useAssignmentMutations";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

const getAssignmentStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    pending:     "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    accepted:    "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    in_progress: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    completed:   "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    cancelled:   "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    delegated:   "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    rejected:    "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    review:      "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  };
  return classes[status] ?? "bg-gray-100 text-gray-600 border border-gray-200";
};

const getProgressBarColor = (progress: number): string => {
  if (progress >= 70) return "bg-green-500";
  if (progress >= 30) return "bg-amber-400";
  return "bg-red-500";
};

const isTaskOverdue = (deadline?: string | null, status?: string): boolean => {
  if (!deadline) return false;
  if (status === "completed" || status === "cancelled") return false;
  return new Date(deadline) < new Date();
};

// Extended status labels for assignment statuses
const assignmentStatusLabels: Record<string, string> = {
  pending: "Gözləyir",
  accepted: "Qəbul edilib",
  in_progress: "İcrada",
  completed: "Tamamlanıb",
  cancelled: "Ləğv edilib",
  delegated: "Yönləndirilib",
  rejected: "İmtina edilib",
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
  } = useAssignmentMutations();

  // Close dialogs on successful mutations
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

    // Only regional-level roles see regional tab
    const regionalRoles = ["superadmin", "regionadmin", "regionoperator"];
    if (role && regionalRoles.includes(role)) {
      tabs.push({ value: "region" as const, label: "Regional Tapşırıqlar" });
    }
    tabs.push({ value: "sector" as const, label: "Sektor Tapşırıqları" });

    return tabs;
  }, [currentUser?.role]);

  useEffect(() => {
    if (availableTabs.some((tab) => tab.value === activeTab)) {
      return;
    }

    // Default to first available tab
    setActiveTab(availableTabs[0]?.value ?? "sector");
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
  type AssignedTasksResponse = {
    data?: Task[];
    meta?: { current_page: number; last_page: number; per_page: number; total: number; from: number; to: number };
    statistics?: { total: number; pending: number; in_progress: number; completed: number; overdue: number };
  };
  const responseData = activeQuery.data as AssignedTasksResponse | undefined;
  const tasks = Array.isArray(responseData?.data) ? responseData.data : [];
  const meta = responseData?.meta;
  const statistics = responseData?.statistics;

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

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-muted/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Toplam</p>
              <p className="text-2xl font-bold">{statistics.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Gözləyir</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{statistics.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">İcrada</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{statistics.in_progress}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-red-600 dark:text-red-400" />
                <p className="text-xs text-red-700 dark:text-red-400">Gecikmiş</p>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{statistics.overdue}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="tasks-search"
              placeholder="Tapşırıq axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="tasks-status-filter" className="w-[160px]">
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

      <div className="rounded-md border overflow-x-auto">
        <Table data-testid="tasks-table" className="min-w-[800px]">
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
                  <TableRow key={task.id} data-testid={`task-row-${task.id}`}>
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
                        <span data-testid={`task-status-${task.id}`} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAssignmentStatusClass(statusForUser)}`}>
                          {assignmentStatusLabels[statusForUser] || statusLabels[statusForUser] || statusForUser}
                        </span>
                        {assignment && task.status !== statusForUser && (
                          <span className="text-xs text-muted-foreground">
                            Ümumi: {statusLabels[task.status] || task.status}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const deadline = assignment?.due_date ?? task.deadline;
                        const overdue = isTaskOverdue(deadline, task.status);
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className={overdue ? "text-red-600 font-medium dark:text-red-400" : ""}>
                              {formatDate(deadline)}
                            </span>
                            {overdue && (
                              <span className="flex items-center gap-0.5 text-xs text-red-500 dark:text-red-400">
                                <Clock className="h-3 w-3" />
                                Gecikmiş
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-secondary rounded-full h-2">
                          <div
                            className={`${getProgressBarColor(progressValue)} h-2 rounded-full transition-all`}
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
                            {/* Start working button - for pending tasks */}
                            {canTransition(assignment, "in_progress") && statusForUser === "pending" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleMarkInProgress(task, assignment)}
                                disabled={isMutationPending}
                              >
                                {isAssignmentPending(assignment.id) ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                İcraya götür
                              </Button>
                            )}
                            {/* Delegation button - only for in_progress tasks */}
                            {assignment.can_delegate && statusForUser === "in_progress" && (
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
                            {/* Complete button - for in_progress and delegated tasks */}
                            {canTransition(assignment, "completed") && (statusForUser === "in_progress" || statusForUser === "delegated") && (
                              <Button
                                data-testid={`task-complete-btn-${task.id}`}
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
