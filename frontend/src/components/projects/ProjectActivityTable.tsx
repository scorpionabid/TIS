import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContextOptimized";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectActivity, projectService } from "@/services/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  X,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Check,
  Download,
  Lock,
  Settings2,
  GripHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { az } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useColumnSettings, ProjectColumn } from "@/hooks/projects/useColumnSettings";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { ProjectActivityCreateRow } from "./ProjectActivityCreateRow";

interface SortableRowProps {
  activity: ProjectActivity;
  projectId: number;
  columns: any[];
  isVisible: (id: string) => boolean;
  editingId: number | null;
  isHighlighted?: boolean;
  onStatusChange: (id: number, status: ProjectActivity["status"]) => void;
  startEditing: (activity: ProjectActivity) => void;
  saveEdit: () => void;
  cancelEditing: () => void;
  editFormData: Partial<ProjectActivity>;
  handleEditFieldChange: (field: keyof ProjectActivity, value: any) => void;
  isSubmitting: boolean;
  availableUsers?: any[];
  isLoading?: boolean;
  columnWidths: Record<string, number>;
}

const getDeadlineStatus = (endDate: string | null, status: string) => {
  if (!endDate || status === 'completed' || status === 'checking') return null;
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'near';
  return null;
};

function SortableRow({ 
  activity, 
  projectId, 
  columns, 
  isVisible, 
  editingId, 
  isHighlighted, 
  onStatusChange,
  startEditing,
  saveEdit,
  cancelEditing,
  editFormData,
  handleEditFieldChange,
  isSubmitting,
  availableUsers,
  columnWidths
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const nameWidth = columnWidths['name'] || 300;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border-b border-muted/20 transition-all select-none",
        editingId === activity.id ? "bg-primary/5 border-primary/20" : "hover:bg-muted/5",
        isHighlighted && "bg-yellow-100/40 ring-1 ring-yellow-400/50 z-40 animate-pulse duration-[3000ms]",
        isDragging && "opacity-50 ring-2 ring-primary bg-accent z-50 relative"
      )}
    >
      <TableCell 
        className="sticky left-0 z-20 bg-card border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-default py-1"
        style={{ width: nameWidth, minWidth: nameWidth, maxWidth: nameWidth }}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2 px-2 overflow-hidden" 
             onClick={(e) => {
               if (activity.is_editable) {
                 e.stopPropagation();
                 startEditing(activity);
               }
             }}
        >
          {!activity.is_editable && <Lock className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
          <span className={cn(
            "text-[12px] font-semibold tracking-tight truncate",
            !activity.is_editable && "text-muted-foreground/70"
          )}>
            {editingId === activity.id ? (
              <Input 
                autoFocus
                value={editFormData.name} 
                onChange={(e) => handleEditFieldChange('name', e.target.value)} 
                className="h-7 text-xs font-semibold py-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : activity.name}
          </span>
        </div>
      </TableCell>

      {isVisible('employees') && (
        <TableCell className="p-0 border-r" style={{ width: columnWidths['employees'] || 150 }}>
          {editingId === activity.id ? (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
               <ProjectActivityCreateRow projectId={projectId} status={activity.status} availableColumns={columns} isVisible={isVisible} onCreated={() => {}} availableUsers={availableUsers} canEdit={true} isJustSelector multiSelectorValue={editFormData.employee_ids || []} onMultiSelectorChange={(vals) => handleEditFieldChange('employee_ids', vals)} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1 gap-0.5" onClick={() => startEditing(activity)}>
              {activity.assigned_employees?.length ? activity.assigned_employees.map(e => <div key={e.id} className="text-[10px] font-medium text-muted-foreground">{e.name}</div>) : <span className="text-[10px] italic text-muted-foreground/40">-</span>}
            </div>
          )}
        </TableCell>
      )}

      {isVisible('status') && (
        <TableCell className="p-0 border-r" style={{ width: columnWidths['status'] || 120 }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn(
                "w-full h-8 flex items-center justify-center text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all hover:brightness-95", 
                STATUS_CONFIG[activity.status].color, 
                STATUS_CONFIG[activity.status].textColor,
                !activity.is_editable && "opacity-70 cursor-not-allowed"
              )}>
                {STATUS_CONFIG[activity.status].label}
              </div>
            </DropdownMenuTrigger>
            {activity.is_editable && (
              <DropdownMenuContent align="center" className="w-[150px]">
                {Object.entries(STATUS_CONFIG).map(([id, cfg]) => <DropdownMenuItem key={id} onClick={() => onStatusChange(activity.id, id as any)} className="gap-2"><div className={cn("w-3 h-3 rounded-full", cfg.color)} />{cfg.label}</DropdownMenuItem>)}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </TableCell>
      )}

      {isVisible('priority') && (
        <TableCell className="p-0 border-r" style={{ width: columnWidths['priority'] || 100 }}>
          <div className="flex justify-center h-8 items-center" onClick={() => startEditing(activity)}>
            {editingId === activity.id ? (
              <select value={editFormData.priority} onClick={(e) => e.stopPropagation()} onChange={(e) => handleEditFieldChange('priority', e.target.value)} className="text-[10px] bg-transparent border-none focus:ring-0 uppercase font-black"><option value="low">Aşağı</option><option value="medium">Orta</option><option value="high">Yüksək</option><option value="critical">Kritik</option></select>
            ) : (
              <Badge variant="outline" className={cn("text-[9px] uppercase font-black px-1.5 py-0 border-none", PRIORITY_CONFIG[activity.priority].color)}>{PRIORITY_CONFIG[activity.priority].label}</Badge>
            )}
          </div>
        </TableCell>
      )}

      {isVisible('start_date') && (
        <TableCell className="p-0 border-r text-center" style={{ width: columnWidths['start_date'] || 120 }}>
          {editingId === activity.id ? (
            <Input type="date" value={editFormData.start_date?.split('T')[0] || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => handleEditFieldChange('start_date', e.target.value)} className="h-7 text-[10px] border-none text-center bg-transparent" />
          ) : (
            <div className="flex flex-col items-center justify-center h-8" onClick={() => startEditing(activity)}>
              <span className={cn("text-[10px] font-medium leading-tight", getDeadlineStatus(activity.start_date, activity.status) === 'overdue' && "text-red-500")}>
                {activity.start_date ? format(new Date(activity.start_date), "dd.MM.yyyy", { locale: az }) : '-'}
              </span>
            </div>
          )}
        </TableCell>
      )}

      {isVisible('end_date') && (
        <TableCell 
          className={cn(
            "p-0 border-r text-center transition-colors", 
            !editingId && getDeadlineStatus(activity.end_date, activity.status) === 'overdue' && "bg-red-50/50",
            !editingId && getDeadlineStatus(activity.end_date, activity.status) === 'near' && "bg-orange-50/50"
          )} 
          style={{ width: columnWidths['end_date'] || 120 }}
        >
          {editingId === activity.id ? (
            <Input type="date" value={editFormData.end_date?.split('T')[0] || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => handleEditFieldChange('end_date', e.target.value)} className="h-7 text-[10px] border-none text-center bg-transparent" />
          ) : (
            <div className="flex flex-col items-center justify-center h-8 cursor-pointer" onClick={() => startEditing(activity)}>
              <span className={cn(
                "text-[10px] font-black leading-tight underline decoration-1 decoration-transparent transition-all", 
                getDeadlineStatus(activity.end_date, activity.status) === 'overdue' && "text-red-600 decoration-red-600/30",
                getDeadlineStatus(activity.end_date, activity.status) === 'near' && "text-orange-500 decoration-orange-500/30"
              )}>
                {activity.end_date ? format(new Date(activity.end_date), "dd.MM.yyyy", { locale: az }) : '-'}
              </span>
            </div>
          )}
        </TableCell>
      )}

      {isVisible('duration') && (
        <TableCell className="text-center text-[11px] font-bold text-primary/80 border-r" style={{ width: columnWidths['duration'] || 80 }} onClick={() => startEditing(activity)}>
          {(() => {
            if (!activity.start_date || !activity.end_date) return '-';
            const s = new Date(activity.start_date);
            const e = new Date(activity.end_date);
            const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return `${diff} gün`;
          })()}
        </TableCell>
      )}

      {isVisible('budget') && <TableCell className="text-center font-bold text-emerald-600 text-[11px] border-r" style={{ width: columnWidths['budget'] || 100 }} onClick={() => startEditing(activity)}>{activity.budget ? `${Number(activity.budget).toLocaleString()} ₼` : '-'}</TableCell>}
      
      {isVisible('expected_outcome') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['expected_outcome'] || 180 }} onClick={() => startEditing(activity)}>
           <div className="line-clamp-1">{activity.expected_outcome || '-'}</div>
        </TableCell>
      )}

      {isVisible('kpi_metrics') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['kpi_metrics'] || 150 }} onClick={() => startEditing(activity)}>
           <div className="line-clamp-1">{activity.kpi_metrics || '-'}</div>
        </TableCell>
      )}

      {isVisible('risks') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-red-500/80 italic border-r" style={{ width: columnWidths['risks'] || 150 }} onClick={() => startEditing(activity)}>
           <div className="line-clamp-1">{activity.risks || '-'}</div>
        </TableCell>
      )}

      {isVisible('dependency') && (
        <TableCell className="text-center text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['dependency'] || 100 }} onClick={() => startEditing(activity)}>
           {activity.parent_id || '-'}
        </TableCell>
      )}

      {isVisible('location_platform') && (
        <TableCell className="text-center text-[11px] font-medium border-r" style={{ width: columnWidths['location_platform'] || 160 }} onClick={() => startEditing(activity)}>
           {activity.location_platform || '-'}
        </TableCell>
      )}

      {isVisible('monitoring_mechanism') && (
        <TableCell className="text-center text-[11px] border-r" style={{ width: columnWidths['monitoring_mechanism'] || 200 }} onClick={() => startEditing(activity)}>
           {activity.monitoring_mechanism || '-'}
        </TableCell>
      )}

      {isVisible('description') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['description'] || 300 }} onClick={() => startEditing(activity)}>
           <div className="line-clamp-1">{activity.description || '-'}</div>
        </TableCell>
      )}

      {isVisible('notes') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['notes'] || 300 }} onClick={() => startEditing(activity)}>
           <div className="line-clamp-1">{activity.notes || '-'}</div>
        </TableCell>
      )}

      <TableCell 
        className="sticky right-0 z-20 bg-card border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] py-0"
        style={{ width: 80, minWidth: 80, maxWidth: 80 }}
      >
        <div className="flex items-center justify-center gap-1">
          {editingId === activity.id ? (
            <>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={(e) => { e.stopPropagation(); saveEdit(); }} disabled={isSubmitting}><Check className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={(e) => { e.stopPropagation(); cancelEditing(); }}><X className="w-3.5 h-3.5" /></Button>
            </>
          ) : (
            <div className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-colors cursor-grab">
               <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

const STATUS_CONFIG: any = {
  pending: { label: "Gözləyir", color: "bg-amber-100", textColor: "text-amber-700" },
  in_progress: { label: "İcradadır", color: "bg-blue-100", textColor: "text-blue-700" },
  checking: { label: "Yoxlanılır", color: "bg-purple-100", textColor: "text-purple-700" },
  completed: { label: "Tamamlandı", color: "bg-emerald-100", textColor: "text-emerald-700" },
  stuck: { label: "Problem var", color: "bg-red-100", textColor: "text-red-700" },
};

const PRIORITY_CONFIG: any = {
  low: { label: "Aşağı", color: "text-blue-600" },
  medium: { label: "Orta", color: "text-amber-600" },
  high: { label: "Yüksək", color: "text-orange-600" },
  critical: { label: "Kritik", color: "text-red-600" },
};

export function ProjectActivityTable({
  projectId,
  activities,
  onEditActivity,
  onDeleteActivity,
  onStatusChange,
  onRefresh,
  canEdit,
  highlightedActivityId,
  isLoading,
  availableUsers
}: any) {
  const { columns, toggleColumn, isVisible } = useColumnSettings(projectId);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`project_${projectId}_widths`);
    const defaults = { name: 350, employees: 180, status: 140, priority: 120, start_date: 120, end_date: 120, budget: 110, description: 400 };
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
      const prevWidth = columnWidths[resizing] || 100;
      const newWidth = Math.max(80, prevWidth + e.movementX);
      setColumnWidths(prev => ({ ...prev, [resizing]: newWidth }));
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [expandedGroups, setExpandedGroups] = useState<string[]>(['pending', 'in_progress', 'checking', 'completed', 'stuck']);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ProjectActivity>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activities.findIndex((a: any) => a.id === active.id);
    const newIndex = activities.findIndex((a: any) => a.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const activeActivity = activities[oldIndex];
      const overActivity = activities[newIndex];
      const newActivities = arrayMove(activities, oldIndex, newIndex);
      if (activeActivity.status !== overActivity.status) {
        await onStatusChange(activeActivity.id, overActivity.status);
      }
      try {
        await projectService.reorderActivities(projectId, newActivities.map((a: any) => a.id));
        onRefresh?.();
      } catch (error) { console.error(error); }
    }
  };

  const getFilteredActivities = (items: ProjectActivity[]) => {
    return items;
  };

  const groups = [
    { id: "pending", title: "Gözləyən İşlər", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
    { id: "in_progress", title: "İcradakı İşlər", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
    { id: "checking", title: "Yoxlama Mərhələsi", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
    { id: "completed", title: "Tamamlanmış İşlər", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
    { id: "stuck", title: "Problemli İşlər", color: "bg-red-500/10 text-red-600 border-red-200" },
  ];

  const nameWidth = columnWidths['name'] || 350;

  return (
    <div className="space-y-2">
      <div ref={tableRef} className="relative overflow-x-auto border rounded-xl shadow-xl bg-card scrollbar-thin scrollbar-thumb-muted-foreground/10 mx-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
          <Table className="border-separate border-spacing-0 min-w-max">
            <TableHeader className="bg-muted/5 sticky top-0 z-[50]">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead 
                  className="sticky left-0 z-40 bg-card border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[11px] uppercase tracking-wider font-bold h-10 py-0" 
                  style={{ width: nameWidth, minWidth: nameWidth, maxWidth: nameWidth }}
                >
                  <div className="flex items-center justify-between h-full px-2">
                    <span>Fəaliyyət Adı</span>
                    <div className="w-1 h-6 cursor-col-resize hover:bg-primary/20 transition-colors rounded-full" onMouseDown={(e) => onResizeStart('name', e)} />
                  </div>
                </TableHead>

                {columns.filter(c => isVisible(c.id) && c.id !== 'name').map(col => (
                  <TableHead key={col.id} className="text-center text-[10px] uppercase tracking-wider font-bold h-10 border-r py-0" style={{ width: columnWidths[col.id] || 150 }}>
                     <div className="flex items-center justify-center h-full relative px-2">
                        <span>{col.label}</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 cursor-col-resize hover:bg-primary/20 transition-colors rounded-full" onMouseDown={(e) => onResizeStart(col.id, e)} />
                     </div>
                  </TableHead>
                ))}

                <TableHead 
                  className="sticky right-0 z-40 bg-card border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] h-10 py-0"
                  style={{ width: 80, minWidth: 80, maxWidth: 80 }}
                >
                   <div className="flex items-center justify-end px-2">
                      <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Settings2 className="w-4 h-4" /></Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="w-56">
                            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase">Sütunları gizlə/göstər</div>
                            {columns.map(c => (
                              <DropdownMenuItem key={c.id} className="gap-2 text-xs" onSelect={(e) => { e.preventDefault(); toggleColumn(c.id); }}>
                                {isVisible(c.id) ? <Check className="w-3 h-3 text-emerald-500" /> : <div className="w-3 h-3 border rounded-sm" />} {c.label}
                              </DropdownMenuItem>
                            ))}
                         </DropdownMenuContent>
                      </DropdownMenu>
                   </div>
                </TableHead>
              </TableRow>
            </TableHeader>

            {groups.map((group) => {
              const groupActivities = getFilteredActivities(activities.filter(a => a.status === group.id));
              const isExpanded = expandedGroups.includes(group.id);
              if (groupActivities.length === 0 && group.id !== 'pending') return null;

              const totalVisibleColumns = columns.filter(c => isVisible(c.id)).length + 1; // +1 for actions column

              return (
                <React.Fragment key={group.id}>
                  <TableBody className="border-none">
                    <TableRow className="bg-muted/5 hover:bg-muted/10 transition-colors border-b select-none cursor-pointer" onClick={() => {
                        setExpandedGroups(prev => prev.includes(group.id) ? prev.filter(i => i !== group.id) : [...prev, group.id]);
                    }}>
                      <TableCell colSpan={totalVisibleColumns} className="py-2.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex items-center justify-center w-5 h-5 rounded-md transition-transform", isExpanded ? "rotate-0 text-primary" : "-rotate-90 text-muted-foreground")}>
                             <ChevronDown className="w-4 h-4" />
                          </div>
                          <div className={cn("px-3 py-1 rounded-full text-[12px] font-bold border", group.color)}>
                            {group.title} <span className="ml-1 opacity-60 font-medium">({groupActivities.length})</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                       <SortableContext items={groupActivities.map(a => a.id)} strategy={verticalListSortingStrategy}>
                         <TableBody>
                           {groupActivities.map((activity) => (
                             <SortableRow 
                                key={activity.id}
                                activity={activity}
                                projectId={projectId}
                                columns={columns}
                                isVisible={isVisible}
                                editingId={editingId}
                                isHighlighted={highlightedActivityId === activity.id}
                                onStatusChange={onStatusChange}
                                startEditing={(a) => { setEditingId(a.id); setEditFormData({ ...a, employee_ids: a.assigned_employees?.map(e => e.id) || [] }); }}
                                saveEdit={async () => {
                                   if (!editingId || !editFormData.name) return;
                                   setIsSubmitting(true);
                                   try {
                                      await projectService.updateActivity(editingId, editFormData);
                                      setEditingId(null);
                                      onRefresh?.();
                                   } catch(e) { console.error(e); } finally { setIsSubmitting(false); }
                                }}
                                cancelEditing={() => setEditingId(null)}
                                editFormData={editFormData}
                                handleEditFieldChange={(field, val) => setEditFormData(prev => ({...prev, [field]: val}))}
                                isSubmitting={isSubmitting}
                                availableUsers={availableUsers}
                                columnWidths={columnWidths}
                             />
                           ))}
                           {canEdit && (
                              <TableRow className="hover:bg-transparent">
                                 <TableCell colSpan={totalVisibleColumns} className="p-0 border-none">
                                    <ProjectActivityCreateRow 
                                      projectId={projectId} 
                                      status={group.id as any} 
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
    </div>
  );
}
