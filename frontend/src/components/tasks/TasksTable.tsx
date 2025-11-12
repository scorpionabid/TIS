import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "lucide-react";
import type { ElementType } from "react";

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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Əməliyyatları aç</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Əməliyyatlar</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewTask(task)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ətraflı bax
                      </DropdownMenuItem>
                      {canEditTaskItem(task) && (
                        <DropdownMenuItem onClick={() => onEditTask(task)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Redaktə et
                        </DropdownMenuItem>
                      )}
                      {canDeleteTaskItem(task) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDeleteTask(task)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
