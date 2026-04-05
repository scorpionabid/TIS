import { useEffect, useState } from "react";
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

export function AssignedTasksTab() {
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

  const hasAccess = Boolean(currentUser);

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

  const responseData = activeQuery.data as any;
  const tasks = Array.isArray(responseData?.data) ? responseData.data : [];
  const meta = responseData?.meta;
  const statistics = responseData?.statistics;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, statusFilter, priorityFilter, sortField, sortDirection, activeTab]);

  const totalPages = meta?.last_page ?? 1;
  const totalItems = meta?.total ?? 0;

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const canTransition = (assignment: UserAssignmentSummary | null | undefined, status: Task["status"] | AssignmentStatus) =>
    Boolean(assignment?.can_update && assignment.allowed_transitions?.includes(status as AssignmentStatus));

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

  const handleAcceptTask = (task: Task, assignment: UserAssignmentSummary) => {
    if (!canTransition(assignment, "accepted" as Task["status"])) return;
    markAccepted(task, assignment.id);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        Tapşırıqlar yüklənir...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium">Xəta baş verdi</h3>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "region" | "sector")}>
          <TabsList>
            <TabsTrigger value="region">Regional</TabsTrigger>
            <TabsTrigger value="sector">Sektor</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-muted/40 border-0 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Toplam</p>
              <p className="text-2xl font-bold">{statistics.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-0 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Gözləyir</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{statistics.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-0 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">İcrada</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{statistics.in_progress}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-900/20 border-0 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-red-700 dark:text-red-400 mb-1">Gecikmiş</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{statistics.overdue}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center flex-1 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tapşırıqlarda axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(searchTerm || statusFilter !== "all" || priorityFilter !== "all") && (
          <Button variant="ghost" onClick={clearFilters} size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filterləri təmizlə
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="title" label="Tapşırıq" currentField={sortField} direction={sortDirection} onSort={handleSort} />
              <TableHead>Kateqoriya</TableHead>
              <SortableHeader field="priority" label="Prioritet" currentField={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="status" label="Status" currentField={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="deadline" label="Son tarix" currentField={sortField} direction={sortDirection} onSort={handleSort} />
              <TableHead className="text-right">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <ClipboardList className="h-10 w-10 text-muted-foreground opacity-30 mb-2" />
                    <p className="text-muted-foreground">Tapşırıq tapılmadı</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task: Task) => {
                const assignment = task.user_assignment;
                const statusForUser = assignment?.status ?? task.status;
                const overdue = isTaskOverdue(assignment?.due_date ?? task.deadline, task.status);

                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      <button
                        className="text-left hover:underline"
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setSelectedTask(task);
                        }}
                      >
                        {task.title}
                      </button>
                    </TableCell>
                    <TableCell>{categoryLabels[task.category]}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(task.priority)}>
                        {priorityLabels[task.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAssignmentStatusClass(statusForUser)}`}>
                        {assignmentStatusLabels[statusForUser] || statusLabels[statusForUser]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className={overdue ? "text-red-600 font-medium" : ""}>
                        {formatDate(assignment?.due_date ?? task.deadline)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => { setSelectedTaskId(task.id); setSelectedTask(task); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canTransition(assignment, "in_progress") && statusForUser === "pending" && (
                          <Button size="sm" onClick={() => handleMarkInProgress(task, assignment!)}>İcraya götür</Button>
                        )}
                        {canTransition(assignment, "completed") && statusForUser === "in_progress" && (
                          <Button size="sm" onClick={() => handleOpenCompletionDialog(task, assignment!)}>Tamamla</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={perPage}
        onPageChange={setPage}
        onItemsPerPageChange={(val) => { setPerPage(val); setPage(1); }}
      />

      {/* Dialogs */}
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
            closeDelegationDialog();
          }}
        />
      )}

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
}
