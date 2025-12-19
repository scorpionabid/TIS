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
import type { ElementType } from "react";

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

const categoryIcons: Record<string, ElementType> = {
  report: FileText,
  maintenance: Wrench,
  event: PartyPopper,
  audit: Shield,
  instruction: BookOpen,
  other: MoreHorizontal,
};

const sortableColumns: Array<{ field: SortField; label: string; className?: string }> = [
  { field: "title", label: "Tapşırıq", className: "w-[300px]" },
  { field: "category", label: "Kateqoriya" },
  { field: "assignee", label: "Məsul" },
  { field: "priority", label: "Prioritet" },
  { field: "status", label: "Status" },
  { field: "deadline", label: "Son tarix" },
];

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

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category] || MoreHorizontal;
    return <IconComponent className="h-4 w-4" />;
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
                <TableCell className="max-w-[300px]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {getCategoryIcon(task.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      {task.origin_scope_label && (
                        <Badge variant="outline" className="mb-1">
                          {task.origin_scope_label}
                        </Badge>
                      )}
                      <div className="font-medium truncate" title={task.title}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div
                          className="text-sm text-muted-foreground mt-1 overflow-hidden"
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
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(task.category)}
                    <span className="text-sm">{categoryLabels[task.category]}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {task.assignee && task.assignee.name ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs">
                        {task.assignee.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
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
