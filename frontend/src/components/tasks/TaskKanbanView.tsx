/**
 * TaskKanbanView Component
 *
 * Kanban board view for tasks with drag-and-drop functionality
 */

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/services/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  User,
  GripVertical,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabels, priorityLabels } from "@/components/tasks/config/taskFormFields";
import { format } from "date-fns";
import { az } from "date-fns/locale";

// Status column definitions
const COLUMNS = [
  {
    id: "pending",
    title: "Gözləyir",
    color: "bg-amber-500",
    textColor: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    icon: Clock,
  },
  {
    id: "in_progress",
    title: "İcradadır",
    color: "bg-blue-500",
    textColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    icon: Clock,
  },
  {
    id: "review",
    title: "Yoxlanılır",
    color: "bg-violet-500",
    textColor: "text-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-950/20",
    icon: Eye,
  },
  {
    id: "completed",
    title: "Tamamlandı",
    color: "bg-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    icon: CheckCircle,
  },
] as const;

type ColumnId = typeof COLUMNS[number]["id"];

interface TaskKanbanViewProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onStatusChange?: (taskId: number, newStatus: Task["status"]) => Promise<void>;
  canEditTaskItem: (task: Task) => boolean;
  canDeleteTaskItem: (task: Task) => boolean;
  isLoading?: boolean;
}

// Priority badge variants
const priorityVariants: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

// Sortable Task Card Component
interface SortableTaskCardProps {
  task: Task;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

function SortableTaskCard({
  task,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-50"
      )}
    >
      <TaskCard
        task={task}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        canEdit={canEdit}
        canDelete={canDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// Task Card Component
interface TaskCardProps {
  task: Task;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
  dragHandleProps?: Record<string, unknown>;
  isDragOverlay?: boolean;
}

function TaskCard({
  task,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  dragHandleProps,
  isDragOverlay,
}: TaskCardProps) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "completed";

  return (
    <Card
      className={cn(
        "mb-2 cursor-pointer hover:shadow-md transition-shadow",
        isDragOverlay && "shadow-lg rotate-3",
        isOverdue && "border-red-300 dark:border-red-800"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}

          {/* Card Content */}
          <div className="flex-1 min-w-0" onClick={onView}>
            {/* Title & Menu */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                    <Eye className="h-4 w-4 mr-2" />
                    Bax
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Redaktə et
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Sil
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Category */}
            {task.category && (
              <p className="text-xs text-muted-foreground mt-1">
                {categoryLabels[task.category] || task.category}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant={priorityVariants[task.priority] || "secondary"} className="text-xs">
                {priorityLabels[task.priority] || task.priority}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Gecikmiş
                </Badge>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              {/* Deadline */}
              {task.deadline && (
                <div className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-500"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.deadline), "d MMM", { locale: az })}
                </div>
              )}

              {/* Progress */}
              {typeof task.progress === "number" && task.progress > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span>{task.progress}%</span>
                </div>
              )}

              {/* Assignee */}
              {task.assignee && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{task.assignee.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  column: typeof COLUMNS[number];
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  canEditTaskItem: (task: Task) => boolean;
  canDeleteTaskItem: (task: Task) => boolean;
}

function KanbanColumn({
  column,
  tasks,
  onViewTask,
  onEditTask,
  onDeleteTask,
  canEditTaskItem,
  canDeleteTaskItem,
}: KanbanColumnProps) {
  const Icon = column.icon;

  return (
    <div className={cn("flex flex-col h-full min-w-[300px] max-w-[350px] rounded-lg", column.bgColor)}>
      {/* Column Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", column.color)} />
            <h3 className="font-semibold text-sm">{column.title}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Tasks List */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Icon className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Tapşırıq yoxdur</p>
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onView={() => onViewTask(task)}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task)}
                canEdit={canEditTaskItem(task)}
                canDelete={canDeleteTaskItem(task)}
              />
            ))
          )}
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

// Main Kanban View Component
export function TaskKanbanView({
  tasks,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  canEditTaskItem,
  canDeleteTaskItem,
  isLoading,
}: TaskKanbanViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<ColumnId, Task[]> = {
      pending: [],
      in_progress: [],
      review: [],
      completed: [],
    };

    tasks.forEach((task) => {
      const status = task.status as ColumnId;
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        // Default to pending if status doesn't match
        grouped.pending.push(task);
      }
    });

    return grouped;
  }, [tasks]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  }, [tasks]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !onStatusChange) return;

    const taskId = active.id as number;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine the target column
    let targetStatus: ColumnId | null = null;

    // Check if dropped over a column
    const column = COLUMNS.find((c) => c.id === over.id);
    if (column) {
      targetStatus = column.id;
    } else {
      // Check if dropped over another task - find its column
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        targetStatus = overTask.status as ColumnId;
      }
    }

    // Update status if changed
    if (targetStatus && targetStatus !== task.status) {
      setIsUpdating(true);
      try {
        await onStatusChange(taskId, targetStatus);
      } catch (error) {
        console.error("Failed to update task status:", error);
      } finally {
        setIsUpdating(false);
      }
    }
  }, [tasks, onStatusChange]);

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Could add visual feedback here
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="relative">
        {/* Updating overlay */}
        {isUpdating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Kanban Columns */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByStatus[column.id]}
              onViewTask={onViewTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              canEditTaskItem={canEditTaskItem}
              canDeleteTaskItem={canDeleteTaskItem}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              onView={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              canEdit={false}
              canDelete={false}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
