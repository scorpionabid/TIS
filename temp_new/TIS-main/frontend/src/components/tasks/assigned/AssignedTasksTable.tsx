import { Filter, Forward, Loader2, Send, Eye, Clock, ClipboardList } from "lucide-react";
import { Task, UserAssignmentSummary, AssignmentStatus } from "@/services/tasks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SortableHeader } from "@/components/tasks/SortableHeader";
import { categoryLabels, priorityLabels, statusLabels } from "@/components/tasks/config/taskFormFields";
import { assignmentStatusLabels, getAssignmentStatusClass, getProgressBarColor } from "@/components/tasks/config/taskStatusClasses";
import { formatDate, isTaskOverdue } from "@/utils/taskFormatters";

type SortField = "title" | "priority" | "status" | "deadline";
type SortDirection = "asc" | "desc";

interface AssignedTasksTableProps {
  tasks: Task[];
  isFiltering: boolean;
  isMutationPending: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onClearFilters: () => void;
  onViewTask: (task: Task) => void;
  onMarkInProgress: (task: Task, assignment: UserAssignmentSummary) => void;
  onOpenCompletion: (task: Task, assignment: UserAssignmentSummary) => void;
  onOpenCancellation: (task: Task, assignment: UserAssignmentSummary) => void;
  onOpenDelegation: (task: Task, assignment: UserAssignmentSummary) => void;
  onSubmitForReview: (task: Task) => void;
  isAssignmentPending: (id: number) => boolean;
}

function getPriorityBadgeVariant(priority: string): "outline" | "secondary" | "default" | "destructive" {
  const variants: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
    low: "outline",
    medium: "secondary",
    high: "default",
    urgent: "destructive",
  };
  return variants[priority] || "secondary";
}

function canTransition(assignment: UserAssignmentSummary | null | undefined, status: Task["status"] | AssignmentStatus) {
  return Boolean(assignment?.can_update && assignment.allowed_transitions?.includes(status as AssignmentStatus));
}

export function AssignedTasksTable({
  tasks,
  isFiltering,
  isMutationPending,
  sortField,
  sortDirection,
  onSort,
  onClearFilters,
  onViewTask,
  onMarkInProgress,
  onOpenCompletion,
  onOpenCancellation,
  onOpenDelegation,
  onSubmitForReview,
  isAssignmentPending,
}: AssignedTasksTableProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table data-testid="tasks-table" className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <SortableHeader field="title" label="Tapşırıq" currentField={sortField} direction={sortDirection} onSort={(f) => onSort(f as SortField)} />
            <TableHead>Kateqoriya</TableHead>
            <TableHead>Göndərən</TableHead>
            <SortableHeader field="priority" label="Prioritet" currentField={sortField} direction={sortDirection} onSort={(f) => onSort(f as SortField)} />
            <SortableHeader field="status" label="Status" currentField={sortField} direction={sortDirection} onSort={(f) => onSort(f as SortField)} />
            <SortableHeader field="deadline" label="Son tarix" currentField={sortField} direction={sortDirection} onSort={(f) => onSort(f as SortField)} />
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
                      : "Hal-hazırda sizə təyin olunmuş tapşırıq yoxdur."}
                  </p>
                  {isFiltering && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
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
              const deadline = assignment?.due_date ?? task.deadline;
              const overdue = isTaskOverdue(deadline, task.status);

              return (
                <TableRow key={task.id} data-testid={`task-row-${task.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {task.origin_scope_label && (
                        <Badge variant="outline">{task.origin_scope_label}</Badge>
                      )}
                      <button
                        className="text-left hover:text-primary hover:underline cursor-pointer"
                        onClick={() => onViewTask(task)}
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
                      <span
                        data-testid={`task-status-${task.id}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAssignmentStatusClass(statusForUser)}`}
                      >
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
                          <Button size="sm" variant="ghost" onClick={() => onViewTask(task)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canTransition(assignment, "in_progress") && statusForUser === "pending" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => onMarkInProgress(task, assignment)}
                              disabled={isMutationPending}
                            >
                              {isAssignmentPending(assignment.id) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              İcraya götür
                            </Button>
                          )}
                          {assignment.can_delegate && statusForUser === "in_progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenDelegation(task, assignment)}
                              disabled={isMutationPending}
                            >
                              <Forward className="mr-2 h-4 w-4" />
                              Yönləndir
                            </Button>
                          )}
                          {canTransition(assignment, "completed") && (statusForUser === "in_progress" || statusForUser === "delegated") && (
                            <Button
                              data-testid={`task-complete-btn-${task.id}`}
                              size="sm"
                              variant="default"
                              onClick={() => onOpenCompletion(task, assignment)}
                              disabled={isMutationPending}
                            >
                              Tamamla
                            </Button>
                          )}
                          {statusForUser === "completed" && task.requires_approval && task.approval_status !== "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSubmitForReview(task)}
                              disabled={isMutationPending}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Təsdiqə göndər
                            </Button>
                          )}
                          {canTransition(assignment, "cancelled") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenCancellation(task, assignment)}
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
  );
}
