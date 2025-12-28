import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/services/tasks";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { SortDirection, SortField } from "@/hooks/tasks/useTasksData";
import { categoryLabels } from "@/components/tasks/config/taskFormFields";
import { formatDate } from "@/utils/taskDate";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  PartyPopper,
  Plus,
  Trash2,
  Users,
  Wrench,
  Shield,
  BookOpen,
  Loader2,
} from "lucide-react";
import React from "react";

type PaginationMeta = {
  current_page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
  last_page?: number;
};

type TasksTableProps = {
  tasks: Task[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  canEditTaskItem: (task: Task) => boolean;
  canDeleteTaskItem: (task: Task) => boolean;
  showCreateButton: boolean;
  onCreateTask: () => void;
  pagination?: PaginationMeta | null;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (value: number) => void;
  isFetching?: boolean;
};

const sortableColumns: Array<{ field: SortField; label: string; className?: string }> = [
  { field: "title", label: "Tapşırıq", className: "w-[320px]" },
  { field: "assignee", label: "Məsul şəxslər", className: "w-[260px]" },
  { field: "priority", label: "Prioritet" },
  { field: "status", label: "Status" },
  { field: "deadline", label: "Son tarix" },
];

const assigneeAvatarColors = [
  "bg-primary/15 text-primary",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
];

const getAssigneeInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function TasksTable({
  tasks,
  sortField,
  sortDirection,
  onSort,
  onViewTask,
  onEditTask,
  onDeleteTask,
  canEditTaskItem,
  canDeleteTaskItem,
  showCreateButton,
  onCreateTask,
  pagination,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  isFetching = false,
}: TasksTableProps) {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const renderAssignees = (task: Task) => {
    const assignments = Array.isArray(task.assignments) ? task.assignments : [];
    const users = assignments
      .map((assignment) => assignment.assignedUser ?? (assignment as any)?.assigned_user)
      .filter(Boolean);

    console.log('[TasksTable] assignments debug', {
      taskId: task.id,
      assignments,
      mappedUsers: users,
      legacyAssignee: task.assignee,
    });

    if (!users.length && task.assignee) {
      users.push(task.assignee);
    }

    if (!users.length) {
      return <span className="text-muted-foreground">-</span>;
    }

    const maxVisible = 3;
    const visibleUsers = users.slice(0, maxVisible);
    const remaining = users.length - visibleUsers.length;

    return (
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex -space-x-2">
          {visibleUsers.map((user, index) => (
            <div
              key={user.id}
              className={`relative flex h-7 w-7 items-center justify-center rounded-full border border-background text-[11px] font-semibold shadow-sm ${assigneeAvatarColors[index % assigneeAvatarColors.length]}`}
              title={user.name}
            >
              {getAssigneeInitials(user.name)}
            </div>
          ))}
          {remaining > 0 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-muted text-[11px] font-semibold text-muted-foreground">
              +{remaining}
            </div>
          )}
        </div>
        <div className="flex flex-col text-xs text-muted-foreground leading-tight">
          {visibleUsers.slice(0, 2).map((user) => (
            <span key={user.id} className="truncate max-w-[160px]" title={user.name}>
              {user.name}
            </span>
          ))}
          {remaining > 0 && <span className="text-[11px]">və {remaining} nəfər daha</span>}
        </div>
      </div>
    );
  };

  const totalItems = pagination?.total ?? tasks.length;
  const currentPage = pagination?.current_page ?? page;
  const derivedTotalPages =
    pagination?.total_pages ??
    pagination?.last_page ??
    Math.max(1, Math.ceil(totalItems / perPage || 1));
  const safeCurrentPage = Math.min(currentPage, derivedTotalPages);
  const rangeStart = tasks.length === 0 ? 0 : (safeCurrentPage - 1) * perPage + 1;
  const rangeEnd = tasks.length === 0 ? 0 : rangeStart + tasks.length - 1;
  const perPageOptions = [10, 25, 50];

  const handlePrevPage = () => {
    if (safeCurrentPage > 1) {
      onPageChange(safeCurrentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (safeCurrentPage < derivedTotalPages) {
      onPageChange(safeCurrentPage + 1);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {sortableColumns.map((column) => (
              <TableHead key={column.field} className={column.className}>
                <Button
                  variant="ghost"
                  onClick={() => onSort(column.field)}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  {column.label}
                  {getSortIcon(column.field)}
                </Button>
              </TableHead>
            ))}
            <TableHead>İrəliləyiş</TableHead>
            <TableHead className="text-right w-[120px]">Əməliyyat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Heç bir tapşırıq tapılmadı.</p>
                  {showCreateButton && (
                    <Button variant="outline" size="sm" onClick={onCreateTask}>
                      <Plus className="h-4 w-4 mr-2" />
                      İlk tapşırığı yarat
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="max-w-[320px]">
                  <div className="flex flex-col gap-1">
                    {task.origin_scope_label && (
                      <Badge variant="outline" className="w-fit">
                        {task.origin_scope_label}
                      </Badge>
                    )}
                    <div className="font-medium truncate" title={task.title}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div
                        className="text-sm text-muted-foreground overflow-hidden"
                        title={task.description}
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {task.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {renderAssignees(task)}
                </TableCell>
                <TableCell>
                  <TaskPriorityBadge priority={task.priority} />
                </TableCell>
                <TableCell>
                  <TaskStatusBadge status={task.status} />
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDate(task.deadline)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{task.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onViewTask(task)}
                    >
                      <span className="sr-only">Ətraflı bax</span>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEditTaskItem(task) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditTask(task)}
                      >
                        <span className="sr-only">Redaktə et</span>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteTaskItem(task) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDeleteTask(task)}
                      >
                        <span className="sr-only">Tapşırığı sil</span>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex flex-col gap-3 border-t bg-muted/40 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {totalItems === 0
            ? "0 tapşırıq"
            : `${rangeStart}-${rangeEnd} aralığı · ${totalItems} tapşırıq`}
          {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(perPage)}
            onValueChange={(value) => onPerPageChange(Number(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sətir sayı" />
            </SelectTrigger>
            <SelectContent>
              {perPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}/səhifə
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={safeCurrentPage <= 1 || isFetching}
            >
              Əvvəlki
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {safeCurrentPage} / {derivedTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={safeCurrentPage >= derivedTotalPages || isFetching}
            >
              Növbəti
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
