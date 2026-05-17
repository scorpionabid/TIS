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
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProjectActivity } from "@/services/projects";
import { Card, CardContent } from "@/components/ui/card";
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
  GripVertical,
  Zap,
  MessageSquare,
  MessageCircle,
  CornerDownRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { az } from "date-fns/locale";
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

// ── Mətn render köməkçiləri ───────────────────────────────────────────────
function renderContent(text: string | null | undefined): string {
  if (!text) return '';
  if (/<[a-zA-Z]/.test(text)) return text;
  return legacyMarkdownToHtml(text);
}

function legacyMarkdownToHtml(text: string): string {
  if (!text) return '';
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = safe.split('\n');
  const out: string[] = [];
  let listTag: 'ul' | 'ol' | null = null;
  const closeList = () => { if (listTag) { out.push(`</${listTag}>`); listTag = null; } };
  for (const line of lines) {
    const bm = line.match(/^- (.*)$/);
    const nm = line.match(/^\d+\. (.*)$/);
    if (bm) {
      if (listTag === 'ol') closeList();
      if (!listTag) { out.push('<ul style="list-style-type:disc;padding-left:1.1rem;margin:2px 0">'); listTag = 'ul'; }
      out.push(`<li>${bm[1]}</li>`);
    } else if (nm) {
      if (listTag === 'ul') closeList();
      if (!listTag) { out.push('<ol style="list-style-type:decimal;padding-left:1.1rem;margin:2px 0">'); listTag = 'ol'; }
      out.push(`<li>${nm[1]}</li>`);
    } else {
      closeList();
      out.push(line.length ? `${line}<br>` : '<br>');
    }
  }
  closeList();
  return out.join('')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n<>]+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/<br>$/, '');
}

const COLUMNS = [
  {
    id: "pending",
    title: "Gözləyir",
    color: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/10",
    icon: Clock,
  },
  {
    id: "in_progress",
    title: "İcradadır",
    color: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/10",
    icon: Zap,
  },
  {
    id: "stuck",
    title: "Problem var",
    color: "bg-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/10",
    icon: AlertTriangle,
  },
  {
    id: "checking",
    title: "Yoxlanılır",
    color: "bg-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/10",
    icon: Eye,
  },
  {
    id: "completed",
    title: "Tamamlandı",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/10",
    icon: CheckCircle,
  },
] as const;

type ColumnId = typeof COLUMNS[number]["id"];

interface ProjectActivityKanbanProps {
  activities: ProjectActivity[];
  onDeleteActivity?: (activityId: number) => void;
  onStatusChange: (activityId: number, newStatus: ProjectActivity["status"]) => Promise<void>;
  canEdit: boolean;
}

export function ProjectActivityKanban({
  activities,
  onDeleteActivity,
  onStatusChange,
  canEdit,
}: ProjectActivityKanbanProps) {
  const [activeActivity, setActiveActivity] = useState<ProjectActivity | null>(null);

  const activitiesByStatus = useMemo(() => {
    const grouped: Record<string, ProjectActivity[]> = {
      pending: [],
      in_progress: [],
      stuck: [],
      checking: [],
      completed: [],
    };
    activities.forEach((activity) => {
      if (grouped[activity.status]) {
        grouped[activity.status].push(activity);
      }
    });
    return grouped;
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activity = activities.find((a) => a.id === active.id);
    if (activity) setActiveActivity(activity);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveActivity(null);

    if (!over) return;

    const activityId = active.id as number;
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    let targetStatus: ColumnId | null = null;
    const column = COLUMNS.find((c) => c.id === over.id);
    if (column) {
      targetStatus = column.id;
    } else {
      const overActivity = activities.find((a) => a.id === over.id);
      if (overActivity) targetStatus = overActivity.status as ColumnId;
    }

    if (targetStatus && targetStatus !== activity.status) {
      await onStatusChange(activityId, targetStatus);
    }
  };

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              activities={activitiesByStatus[column.id]}
              onDelete={onDeleteActivity}
              canEdit={canEdit}
            />
          ))}
        </div>
        <DragOverlay>
          {activeActivity ? (
            <ActivityCard activity={activeActivity} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}



function KanbanColumn({ column, activities, onDelete, canEdit }: any) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const Icon = column.icon;
  
  return (
    <div 
      ref={setNodeRef}
      className={cn("flex flex-col h-full min-w-[260px] xs:min-w-[280px] max-w-[320px] w-[85vw] sm:w-auto rounded-xl border border-muted/40 transition-colors", column.bgColor)}
    >
      <div className="p-4 flex items-center justify-between border-b border-muted/20">
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", column.color)} />
          <h3 className="font-bold text-sm tracking-tight">{column.title}</h3>
        </div>
        <Badge variant="secondary" className="bg-background/50 backdrop-blur-sm text-[10px] h-5">
          {activities.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-3 min-h-[150px]">
        <SortableContext items={activities.map((a: any) => a.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {activities.map((activity: any) => (
              <SortableActivityCard 
                key={activity.id} 
                activity={activity} 
                onDelete={onDelete}
                canEdit={canEdit}
              />
            ))}
          </div>
        </SortableContext>
        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 italic">
            <Icon className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">Boşdur</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function SortableActivityCard({ activity, onDelete, canEdit }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn("touch-none", isDragging && "opacity-0")}>
      <ActivityCard 
        activity={activity} 
        onDelete={onDelete ? () => onDelete(activity.id) : undefined}
        canEdit={canEdit}
        dragHandleProps={{ ...attributes, ...listeners }} 
      />
    </div>
  );
}

function ActivityCard({ activity, onDelete, canEdit, dragHandleProps, isDragOverlay }: any) {
  const priorityColors = {
    low: "bg-blue-500/10 text-blue-600 border-blue-200",
    medium: "bg-amber-500/10 text-amber-600 border-amber-200",
    high: "bg-orange-500/10 text-orange-600 border-orange-200",
    critical: "bg-red-500/10 text-red-600 border-red-200",
  };

  return (
    <Card className={cn(
      "group relative border-muted/60 hover:shadow-lg transition-all duration-200",
      activity.parent_id && "bg-[#f5f8fe]/80 dark:bg-[#141b2d]/40 border-l-2 border-l-primary/30",
      isDragOverlay && "shadow-2xl ring-2 ring-primary/20 cursor-grabbing"
    )}>
      <CardContent className={cn("p-3 rounded-xl", activity.parent_id ? "bg-[#f5f8fe]/40 dark:bg-[#141b2d]/10" : "bg-card")}>
        <div className="flex items-start gap-2">
          <div {...dragHandleProps} className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-primary transition-colors">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            {activity.parent_id && activity.parentName && (
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground/75 font-semibold mb-1.5 bg-muted/50 px-1.5 py-0.5 rounded w-fit max-w-full">
                <CornerDownRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                <span className="truncate">Əsas: <span dangerouslySetInnerHTML={{ __html: renderContent(activity.parentName) }} /></span>
              </div>
            )}
            <div className="flex items-start justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="font-bold text-xs leading-tight line-clamp-2 pr-4 cursor-pointer hover:text-primary transition-colors" dangerouslySetInnerHTML={{ __html: renderContent(activity.name) }} />
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 max-w-[280px] bg-popover text-popover-foreground border shadow-xl rounded-lg">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-wider text-primary">
                      {activity.parent_id ? "Alt fəaliyyət" : "Fəaliyyət"}
                    </div>
                    <div className="text-xs font-bold whitespace-normal" dangerouslySetInnerHTML={{ __html: renderContent(activity.name) }} />
                  </div>
                </TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem className="text-xs text-muted-foreground italic">
                     Detallara Cədvəldən baxın
                  </DropdownMenuItem>
                  {onDelete && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs text-destructive cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Sil
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Fəaliyyəti silmək?</AlertDialogTitle>
                            <AlertDialogDescription dangerouslySetInnerHTML={{ __html: `"${renderContent(activity.name)}" fəaliyyəti sistemdən silinəcək.` }} />
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Xeyr</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={onDelete}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Bəli, Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {activity.description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 cursor-pointer" dangerouslySetInnerHTML={{ __html: renderContent(activity.description) }} />
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 max-w-[280px] bg-popover text-popover-foreground border shadow-xl rounded-lg">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Təsvir</div>
                    <div className="text-xs whitespace-normal" dangerouslySetInnerHTML={{ __html: renderContent(activity.description) }} />
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant="outline" className={cn("text-[8px] font-bold tracking-tighter px-1.5 py-0", priorityColors[activity.priority as keyof typeof priorityColors])}>
                {activity.priority.toUpperCase()}
              </Badge>
              {activity.planned_hours > 0 && (
                <Badge variant="secondary" className="text-[8px] font-medium px-1.5 py-0 bg-secondary/50">
                  <Clock className="w-2.5 h-2.5 mr-1" /> {activity.planned_hours}s
                </Badge>
              )}
              {activity.comments_count > 0 && (
                <Badge variant="outline" className="text-[8px] font-medium px-1.5 py-0 border-primary/20 text-primary">
                  <MessageSquare className="w-2.5 h-2.5 mr-1" /> {activity.comments_count}
                </Badge>
              )}
              {(activity.sub_activities?.length ?? 0) > 0 && (
                <Badge variant="outline" className="text-[8px] font-medium px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">
                  ↳ {activity.sub_activities!.length} alt
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-muted/40">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Calendar className="h-2.5 w-2.5" />
                {(() => {
                  const cleanDateStr = activity.end_date?.includes('.') ? activity.end_date.split('.')[0] : activity.end_date;
                  const date = cleanDateStr ? new Date(cleanDateStr) : null;
                  return date && !isNaN(date.getTime()) ? format(date, "dd.MM.yyyy", { locale: az }) : "-";
                })()}
              </div>
              <div className="flex flex-col items-end gap-1 min-w-[80px]">
                {activity.assigned_employees && activity.assigned_employees.length > 0 ? (
                  activity.assigned_employees.map(emp => (
                    <div key={emp.id} className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 shadow-sm leading-none whitespace-nowrap">
                      {emp.name}
                    </div>
                  ))
                ) : (
                  <div className="text-[9px] text-muted-foreground/50 italic">Təyin edilməyib</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
