/**
 * TaskChecklist Component
 *
 * Displays and manages checklist items within a task
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  GripVertical,
  Trash2,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api";
import { format } from "date-fns";
import { az } from "date-fns/locale";

// Checklist item interface
export interface ChecklistItem {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  position: number;
  completed_by?: number | null;
  completed_at?: string | null;
  completed_by_user?: {
    id: number;
    name: string;
  } | null;
}

interface TaskChecklistProps {
  taskId: number;
  items?: ChecklistItem[];
  canEdit?: boolean;
  onRefresh?: () => void;
}

// API functions
const fetchChecklistItems = async (taskId: number): Promise<ChecklistItem[]> => {
  try {
    const response = await apiClient.get<{ data: ChecklistItem[] }>(`/tasks/${taskId}/checklists`);
    return response.data || [];
  } catch {
    return [];
  }
};

const createChecklistItem = async (taskId: number, title: string): Promise<ChecklistItem> => {
  const response = await apiClient.post<{ data: ChecklistItem }>(`/tasks/${taskId}/checklists`, {
    title,
  });
  return response.data;
};

const updateChecklistItem = async (
  taskId: number,
  itemId: number,
  data: Partial<ChecklistItem>
): Promise<ChecklistItem> => {
  const response = await apiClient.put<{ data: ChecklistItem }>(
    `/tasks/${taskId}/checklists/${itemId}`,
    data
  );
  return response.data;
};

const deleteChecklistItem = async (taskId: number, itemId: number): Promise<void> => {
  await apiClient.delete(`/tasks/${taskId}/checklists/${itemId}`);
};

const reorderChecklistItems = async (
  taskId: number,
  itemIds: number[]
): Promise<void> => {
  await apiClient.post(`/tasks/${taskId}/checklists/reorder`, { item_ids: itemIds });
};

// Sortable Checklist Item Component
interface SortableChecklistItemProps {
  item: ChecklistItem;
  canEdit: boolean;
  onToggle: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
  isToggling: boolean;
}

function SortableChecklistItem({
  item,
  canEdit,
  onToggle,
  onDelete,
  isToggling,
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors group",
        isDragging && "opacity-50 bg-accent",
        item.is_completed && "opacity-60"
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
        checked={item.is_completed}
        disabled={!canEdit || isToggling}
        onCheckedChange={() => onToggle(item)}
        className="shrink-0"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm",
            item.is_completed && "line-through text-muted-foreground"
          )}
        >
          {item.title}
        </span>
        {item.is_completed && item.completed_at && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.completed_by_user?.name && `${item.completed_by_user.name} - `}
            {format(new Date(item.completed_at), "d MMM, HH:mm", { locale: az })}
          </div>
        )}
      </div>

      {/* Delete Button */}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={() => onDelete(item)}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
    </div>
  );
}

export function TaskChecklist({
  taskId,
  items: externalItems,
  canEdit = false,
  onRefresh,
}: TaskChecklistProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  // Fetch checklist items if not provided externally
  const { data: fetchedItems = [], refetch } = useQuery({
    queryKey: ["task-checklist", taskId],
    queryFn: () => fetchChecklistItems(taskId),
    enabled: !externalItems,
    staleTime: 30000,
  });

  // Use external items if provided, otherwise use fetched items
  const items = externalItems ?? fetchedItems;

  // Wrapper for refresh that also refetches local data
  const handleRefresh = useCallback(() => {
    onRefresh?.();
    if (!externalItems) {
      refetch();
    }
  }, [onRefresh, externalItems, refetch]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (title: string) => createChecklistItem(taskId, title),
    onSuccess: () => {
      toast({ title: "Element əlavə edildi" });
      setNewItemTitle("");
      setIsAddingNew(false);
      handleRefresh();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-checklist", taskId] });
    },
    onError: (error) => {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Element əlavə edilə bilmədi",
        variant: "destructive",
      });
    },
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: (item: ChecklistItem) =>
      updateChecklistItem(taskId, item.id, { is_completed: !item.is_completed }),
    onMutate: (item) => {
      setTogglingIds((prev) => new Set(prev).add(item.id));
    },
    onSettled: (_, __, item) => {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    },
    onSuccess: () => {
      handleRefresh();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-checklist", taskId] });
    },
    onError: (error) => {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Status dəyişdirilə bilmədi",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (item: ChecklistItem) => deleteChecklistItem(taskId, item.id),
    onSuccess: () => {
      toast({ title: "Element silindi" });
      handleRefresh();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-checklist", taskId] });
    },
    onError: (error) => {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Element silinə bilmədi",
        variant: "destructive",
      });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (itemIds: number[]) => reorderChecklistItems(taskId, itemIds),
    onSuccess: () => {
      handleRefresh();
      queryClient.invalidateQueries({ queryKey: ["task-checklist", taskId] });
    },
    onError: (error) => {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Sıralama dəyişdirilə bilmədi",
        variant: "destructive",
      });
    },
  });

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Reorder locally and send to server
      const newItems = [...items];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);

      reorderMutation.mutate(newItems.map((i) => i.id));
    },
    [items, reorderMutation]
  );

  // Handle create
  const handleCreate = useCallback(() => {
    if (!newItemTitle.trim()) return;
    createMutation.mutate(newItemTitle.trim());
  }, [newItemTitle, createMutation]);

  // Calculate stats
  const completedCount = items.filter((i) => i.is_completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Yoxlama siyahısı</h4>
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

      {/* Checklist items */}
      {totalCount > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {items.map((item) => (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  onToggle={(i) => toggleMutation.mutate(i)}
                  onDelete={(i) => deleteMutation.mutate(i)}
                  isToggling={togglingIds.has(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty state */}
      {totalCount === 0 && !isAddingNew && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Square className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Yoxlama siyahısı boşdur</p>
        </div>
      )}

      {/* Add new item */}
      {canEdit && (
        <div>
          {isAddingNew ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Element adı..."
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setIsAddingNew(false);
                    setNewItemTitle("");
                  }
                }}
                autoFocus
                disabled={createMutation.isPending}
              />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newItemTitle.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? (
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
                  setNewItemTitle("");
                }}
                disabled={createMutation.isPending}
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
              Element əlavə et
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
