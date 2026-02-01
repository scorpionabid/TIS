/**
 * SubtaskList Component
 *
 * Displays and manages subtasks for a parent task
 */

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, taskService } from "@/services/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  GripVertical,
  MoreVertical,
  Trash2,
  Edit,
  Calendar,
  Flag,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { az } from "date-fns/locale";

// Extended Task type with subtask fields
interface SubtaskItem extends Task {
  parent_id?: number;
  position?: number;
  is_milestone?: boolean;
}

interface SubtaskListProps {
  parentTaskId: number;
  parentTask?: Task;
  subtasks: SubtaskItem[];
  canEdit?: boolean;
  onSubtaskClick?: (subtask: SubtaskItem) => void;
  onRefresh?: () => void;
}

// Priority colors
const priorityColors: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

// Sortable Subtask Item
interface SortableSubtaskItemProps {
  subtask: SubtaskItem;
  canEdit: boolean;
  onToggleComplete: (subtask: SubtaskItem) => void;
  onDelete: (subtask: SubtaskItem) => void;
  onClick?: () => void;
  isUpdating: boolean;
}

function SortableSubtaskItem({
  subtask,
  canEdit,
  onToggleComplete,
  onDelete,
  onClick,
  isUpdating,
}: SortableSubtaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = subtask.status === "completed";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors group",
        isDragging && "opacity-50 shadow-lg",
        isCompleted && "opacity-60"
      )}
    >
      {/* Drag Handle */}
      {canEdit && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Checkbox */}
      <Checkbox
        checked={isCompleted}
        disabled={!canEdit || isUpdating}
        onCheckedChange={() => onToggleComplete(subtask)}
        className="shrink-0"
      />

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm truncate",
            isCompleted && "line-through text-muted-foreground"
          )}>
            {subtask.title}
          </span>
          {subtask.is_milestone && (
            <Badge variant="outline" className="text-xs shrink-0">
              <Flag className="h-3 w-3 mr-1" />
              Milestone
            </Badge>
          )}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {subtask.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(subtask.deadline), "d MMM", { locale: az })}
            </span>
          )}
          {subtask.priority && (
            <span className={cn("flex items-center gap-1", priorityColors[subtask.priority])}>
              <Flag className="h-3 w-3" />
              {subtask.priority}
            </span>
          )}
          {typeof subtask.progress === "number" && subtask.progress > 0 && !isCompleted && (
            <span>{subtask.progress}%</span>
          )}
        </div>
      </div>

      {/* Progress */}
      {typeof subtask.progress === "number" && subtask.progress > 0 && !isCompleted && (
        <div className="w-16 shrink-0">
          <Progress value={subtask.progress} className="h-1.5" />
        </div>
      )}

      {/* Actions */}
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              <Edit className="h-4 w-4 mr-2" />
              Redaktə et
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(subtask)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function SubtaskList({
  parentTaskId,
  parentTask,
  subtasks,
  canEdit = false,
  onSubtaskClick,
  onRefresh,
}: SubtaskListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Create subtask mutation
  const createSubtask = useMutation({
    mutationFn: async (title: string) => {
      return taskService.create({
        title,
        description: "",
        category: parentTask?.category || "general",
        priority: "medium",
        parent_id: parentTaskId,
        target_scope: parentTask?.target_scope,
        origin_scope: parentTask?.origin_scope,
      } as any);
    },
    onSuccess: () => {
      toast({ title: "Alt tapşırıq yaradıldı" });
      setNewSubtaskTitle("");
      setIsAddingNew(false);
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Alt tapşırıq yaradıla bilmədi",
        variant: "destructive",
      });
    },
  });

  // Toggle complete mutation
  const toggleComplete = useMutation({
    mutationFn: async (subtask: SubtaskItem) => {
      const newStatus = subtask.status === "completed" ? "pending" : "completed";
      return taskService.update(subtask.id, { status: newStatus });
    },
    onMutate: (subtask) => {
      setUpdatingIds((prev) => new Set(prev).add(subtask.id));
    },
    onSettled: (_, __, subtask) => {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(subtask.id);
        return next;
      });
    },
    onSuccess: () => {
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Status dəyişdirilə bilmədi",
        variant: "destructive",
      });
    },
  });

  // Delete subtask mutation
  const deleteSubtask = useMutation({
    mutationFn: async (subtask: SubtaskItem) => {
      return taskService.delete(subtask.id);
    },
    onSuccess: () => {
      toast({ title: "Alt tapşırıq silindi" });
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Alt tapşırıq silinə bilmədi",
        variant: "destructive",
      });
    },
  });

  // Handle drag end (reorder)
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Find indices
    const oldIndex = subtasks.findIndex((s) => s.id === active.id);
    const newIndex = subtasks.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // TODO: Implement reorder API call
    console.log("Reorder subtask", { oldIndex, newIndex });
  }, [subtasks]);

  // Handle create new subtask
  const handleCreateSubtask = useCallback(() => {
    if (!newSubtaskTitle.trim()) return;
    createSubtask.mutate(newSubtaskTitle.trim());
  }, [newSubtaskTitle, createSubtask]);

  // Calculate stats
  const completedCount = subtasks.filter((s) => s.status === "completed").length;
  const totalCount = subtasks.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Alt tapşırıqlar</h4>
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{totalCount}
          </Badge>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={progressPercentage} className="w-20 h-1.5" />
            <span className="text-xs text-muted-foreground">{progressPercentage}%</span>
          </div>
        )}
      </div>

      {/* Subtask list */}
      {totalCount > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={subtasks.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {subtasks.map((subtask) => (
                <SortableSubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  canEdit={canEdit}
                  onToggleComplete={(s) => toggleComplete.mutate(s)}
                  onDelete={(s) => deleteSubtask.mutate(s)}
                  onClick={() => onSubtaskClick?.(subtask)}
                  isUpdating={updatingIds.has(subtask.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty state */}
      {totalCount === 0 && !isAddingNew && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Alt tapşırıq yoxdur</p>
        </div>
      )}

      {/* Add new subtask */}
      {canEdit && (
        <div>
          {isAddingNew ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Alt tapşırıq başlığı..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSubtask();
                  if (e.key === "Escape") {
                    setIsAddingNew(false);
                    setNewSubtaskTitle("");
                  }
                }}
                autoFocus
                disabled={createSubtask.isPending}
              />
              <Button
                size="sm"
                onClick={handleCreateSubtask}
                disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
              >
                {createSubtask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Əlavə et"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewSubtaskTitle("");
                }}
                disabled={createSubtask.isPending}
              >
                Ləğv et
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsAddingNew(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Alt tapşırıq əlavə et
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
