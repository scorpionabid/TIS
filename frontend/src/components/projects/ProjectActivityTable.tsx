import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextOptimized';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProjectActivity } from '@/services/projects';
import { projectService } from '@/services/projects';
import type { AssignableUser } from '@/services/tasks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Settings2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { useColumnSettings } from '@/hooks/projects/useColumnSettings';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { ProjectActivityCreateRow } from './ProjectActivityCreateRow';
import { ProjectActivitySortableRow } from './ProjectActivitySortableRow';
import { ACTIVITY_GROUP_CONFIG, type ActivityStatus } from '@/utils/projectStatus';

interface ProjectActivityTableProps {
  projectId: number;
  activities: ProjectActivity[];
  onEditActivity: (activity: ProjectActivity) => void;
  onDeleteActivity: (id: number) => Promise<void>;
  onStatusChange: (id: number, status: ProjectActivity['status']) => void;
  onRefresh?: () => void;
  canEdit?: boolean;
  highlightedActivityId?: number;
  isLoading?: boolean;
  availableUsers?: AssignableUser[];
}

const ACTIVITY_GROUP_ORDER: ActivityStatus[] = [
  'pending',
  'in_progress',
  'checking',
  'completed',
  'stuck',
];

export function ProjectActivityTable({
  projectId,
  activities,
  onDeleteActivity,
  onStatusChange,
  onRefresh,
  canEdit,
  highlightedActivityId,
  availableUsers,
}: ProjectActivityTableProps) {
  const { columns, toggleColumn, isVisible } = useColumnSettings(projectId);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`project_${projectId}_widths`);
    const defaults: Record<string, number> = {
      name: 350, employees: 180, status: 140, priority: 120,
      start_date: 120, end_date: 120, budget: 110, description: 400,
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const [resizing, setResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(`project_${projectId}_widths`, JSON.stringify(columnWidths));
  }, [columnWidths, projectId]);

  const onResizeStart = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(id);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const newWidth = Math.max(80, (columnWidths[resizing] || 100) + e.movementX);
      setColumnWidths((prev) => ({ ...prev, [resizing]: newWidth }));
    };
    const handleMouseUp = () => setResizing(null);
    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, columnWidths]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [expandedGroups, setExpandedGroups] = useState<ActivityStatus[]>([
    'pending', 'in_progress', 'checking', 'completed', 'stuck',
  ]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ProjectActivity>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useAuth(); // keep auth context alive

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activities.findIndex((a) => a.id === active.id);
    const newIndex = activities.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const activeActivity = activities[oldIndex];
    const overActivity = activities[newIndex];
    if (activeActivity.status !== overActivity.status) {
      await onStatusChange(activeActivity.id, overActivity.status);
    }
    try {
      const reordered = arrayMove(activities, oldIndex, newIndex);
      await projectService.reorderActivities(projectId, reordered.map((a) => a.id));
      onRefresh?.();
    } catch (error) {
      console.error(error);
    }
  };

  const nameWidth = columnWidths['name'] || 350;
  const totalVisibleColumns = columns.filter((c) => isVisible(c.id)).length + 1;

  return (
    <div className="space-y-2">
      <div
        ref={tableRef}
        className="relative overflow-x-auto border border-border/40 rounded-2xl shadow-2xl bg-card/30 backdrop-blur-md scrollbar-thin scrollbar-thumb-muted-foreground/10 mx-1"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <Table className="border-separate border-spacing-0 min-w-max">
            <TableHeader className="bg-muted/5 sticky top-0 z-[50]">
              <TableRow className="hover:bg-transparent border-b">
                {/* Name header — sticky left */}
                <TableHead
                  className="sticky left-0 z-40 bg-card border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[11px] uppercase tracking-wider font-semibold h-10 py-0"
                  style={{ width: nameWidth, minWidth: nameWidth, maxWidth: nameWidth }}
                >
                  <div className="flex items-center justify-between h-full px-2">
                    <span>Fəaliyyət Adı</span>
                    <div
                      className="w-1 h-6 cursor-col-resize hover:bg-primary/20 transition-colors rounded-full"
                      onMouseDown={(e) => onResizeStart('name', e)}
                    />
                  </div>
                </TableHead>

                {columns.filter((c) => isVisible(c.id) && c.id !== 'name').map((col) => (
                  <TableHead
                    key={col.id}
                    className="text-center text-[10px] uppercase tracking-wider font-semibold h-10 border-r py-0"
                    style={{ width: columnWidths[col.id] || 150 }}
                  >
                    <div className="flex items-center justify-center h-full relative px-2">
                      <span>{col.label}</span>
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 cursor-col-resize hover:bg-primary/20 transition-colors rounded-full"
                        onMouseDown={(e) => onResizeStart(col.id, e)}
                      />
                    </div>
                  </TableHead>
                ))}

                {/* Settings — sticky right */}
                <TableHead
                  className="sticky right-0 z-40 bg-card border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] h-10 py-0"
                  style={{ width: 80, minWidth: 80, maxWidth: 80 }}
                >
                  <div className="flex items-center justify-end px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Sütunları gizlə/göstər
                        </div>
                        {columns.map((c) => (
                          <DropdownMenuItem
                            key={c.id}
                            className="gap-2 text-xs"
                            onSelect={(e) => { e.preventDefault(); toggleColumn(c.id); }}
                          >
                            {isVisible(c.id)
                              ? <Check className="w-3 h-3 text-success" />
                              : <div className="w-3 h-3 border rounded-sm" />}
                            {c.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>

            {ACTIVITY_GROUP_ORDER.map((groupId) => {
              const groupCfg = ACTIVITY_GROUP_CONFIG[groupId];
              const groupActivities = activities.filter((a) => a.status === groupId);
              const isExpanded = expandedGroups.includes(groupId);
              if (groupActivities.length === 0 && groupId !== 'pending') return null;

              return (
                <React.Fragment key={groupId}>
                  <TableBody className="border-none">
                    <TableRow
                      className="bg-muted/5 hover:bg-muted/10 transition-colors border-b select-none cursor-pointer"
                      onClick={() => setExpandedGroups((prev) =>
                        prev.includes(groupId)
                          ? prev.filter((i) => i !== groupId)
                          : [...prev, groupId],
                      )}
                    >
                      <TableCell colSpan={totalVisibleColumns} className="py-2.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'flex items-center justify-center w-5 h-5 rounded-md transition-transform',
                            isExpanded ? 'rotate-0 text-primary' : '-rotate-90 text-muted-foreground',
                          )}>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                          <div className={cn('px-3 py-1 rounded-full text-[12px] font-semibold border', groupCfg.color)}>
                            {groupCfg.title}{' '}
                            <span className="ml-1 opacity-60 font-normal">({groupActivities.length})</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <SortableContext
                        items={groupActivities.map((a) => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <TableBody>
                          {groupActivities.map((activity) => (
                            <ProjectActivitySortableRow
                              key={activity.id}
                              activity={activity}
                              projectId={projectId}
                              columns={columns}
                              isVisible={isVisible}
                              editingId={editingId}
                              isHighlighted={highlightedActivityId === activity.id}
                              onStatusChange={onStatusChange}
                              startEditing={(a) => {
                                setEditingId(a.id);
                                setEditFormData({
                                  ...a,
                                  employee_ids: a.assigned_employees?.map((e) => e.id) || [],
                                });
                              }}
                              saveEdit={async () => {
                                if (!editingId || !editFormData.name) return;
                                setIsSubmitting(true);
                                try {
                                  await projectService.updateActivity(editingId, editFormData);
                                  setEditingId(null);
                                  onRefresh?.();
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                              cancelEditing={() => setEditingId(null)}
                              editFormData={editFormData}
                              handleEditFieldChange={(field, val) =>
                                setEditFormData((prev) => ({ ...prev, [field]: val }))
                              }
                              isSubmitting={isSubmitting}
                              availableUsers={availableUsers}
                              columnWidths={columnWidths}
                              onDelete={(id) => setDeletingId(id)}
                              canEdit={canEdit}
                            />
                          ))}
                          {canEdit && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={totalVisibleColumns} className="p-0 border-none">
                                <ProjectActivityCreateRow
                                  projectId={projectId}
                                  status={groupId}
                                  availableColumns={columns}
                                  isVisible={isVisible}
                                  onCreated={() => onRefresh?.()}
                                  availableUsers={availableUsers}
                                  canEdit={canEdit}
                                  columnWidths={columnWidths}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </SortableContext>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </Table>
        </DndContext>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fəaliyyəti silmək istədiyinizə əminsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu fəaliyyət və ona bağlı olan bütün alt fəaliyyətlər, şərhlər tamamilə silinəcək. Bu əməliyyat geri qaytarıla bilməz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingId) {
                  await onDeleteActivity(deletingId);
                  setDeletingId(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type ActivityFilter = 'all' | 'mine' | 'overdue';

interface ActivityGlobalFiltersProps {
  activeFilter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
}

export function ActivityGlobalFilters({ activeFilter, onFilterChange }: ActivityGlobalFiltersProps) {
  const filters: { id: ActivityFilter; label: string }[] = [
    { id: 'all', label: 'Hamısı' },
    { id: 'mine', label: 'Mənim' },
    { id: 'overdue', label: 'Gecikənlər' },
  ];
  return (
    <div className="flex items-center gap-1.5 p-1 bg-background/50 rounded-lg border shadow-sm">
      {filters.map((f) => (
        <Button
          key={f.id}
          variant={activeFilter === f.id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onFilterChange(f.id)}
          className={cn(
            'h-7 px-3 text-xs font-medium transition-colors',
            activeFilter === f.id ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
