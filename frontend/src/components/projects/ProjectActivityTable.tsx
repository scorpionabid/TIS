import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectActivity } from "@/services/projects";
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
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Plus,
  Paperclip,
  ArrowRight,
  ListTree
} from "lucide-react";
import { format } from "date-fns";
import { az } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useColumnSettings, ProjectColumn } from "@/hooks/projects/useColumnSettings";
import { 
  Settings2, 
  Check, 
  Layers, 
  FileText, 
  Link as LinkIcon 
} from "lucide-react";
import {
  Checkbox
} from "@/components/ui/checkbox";
import {
  Separator
} from "@/components/ui/separator";

interface ProjectActivityTableProps {
  projectId: number;
  activities: ProjectActivity[];
  onEditActivity: (activity: ProjectActivity) => void;
  onDeleteActivity?: (activity: ProjectActivity) => void;
  onStatusChange: (activityId: number, newStatus: ProjectActivity["status"]) => Promise<void>;
  canEdit: boolean;
}

const STATUS_CONFIG = {
  pending: { label: "Gözləyir", color: "bg-amber-500", textColor: "text-white" },
  in_progress: { label: "İcradadır", color: "bg-blue-500", textColor: "text-white" },
  checking: { label: "Yoxlanılır", color: "bg-purple-500", textColor: "text-white" },
  completed: { label: "Tamamlandı", color: "bg-emerald-500", textColor: "text-white" },
  stuck: { label: "Problem var", color: "bg-red-500", textColor: "text-white" },
};

const PRIORITY_CONFIG = {
  low: { label: "Aşağı", color: "bg-blue-100 text-blue-700 font-bold" },
  medium: { label: "Orta", color: "bg-amber-100 text-amber-700 font-bold" },
  high: { label: "Yüksək", color: "bg-orange-100 text-orange-700 font-bold" },
  critical: { label: "Kritik", color: "bg-red-100 text-red-700 font-bold" },
};

export function ProjectActivityTable({
  projectId,
  activities,
  onEditActivity,
  onDeleteActivity,
  onStatusChange,
  canEdit,
}: ProjectActivityTableProps) {
  const { columns, toggleColumn, isVisible } = useColumnSettings(projectId);

  // Calculate visible columns count for colSpan
  const visibleColumnsCount = columns.filter(c => c.visible).length + 2; // +1 for Name (always visible), +1 for Actions
  // Group activities by status for typical Monday.com look
  const groups = [
    { id: "pending", title: "Gözləyən İşlər", color: "border-amber-500" },
    { id: "in_progress", title: "İcradakı İşlər", color: "border-blue-500" },
    { id: "checking", title: "Yoxlama Mərhələsi", color: "border-purple-500" },
    { id: "completed", title: "Tamamlanmış İşlər", color: "border-emerald-500" },
    { id: "stuck", title: "Problemli İşlər", color: "border-red-500" },
  ];

  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(groups.map(g => g.id));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <div className="space-y-8 pb-12 overflow-x-auto">
      {groups.map((group) => {
        const groupActivities = activities.filter(a => a.status === group.id);
        if (groupActivities.length === 0 && group.id !== "pending") return null;

        const isExpanded = expandedGroups.includes(group.id);

        return (
          <div key={group.id} className={cn("border-l-4 rounded-r-lg bg-card shadow-sm overflow-hidden", group.color)}>
            <div 
              className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleGroup(group.id)}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <h3 className="font-bold text-sm tracking-tight">{group.title}</h3>
              <Badge variant="secondary" className="ml-2 h-5 text-[10px]">{groupActivities.length}</Badge>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Table className="w-full min-w-[1000px]">
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="w-[300px] text-[11px] uppercase tracking-wider font-bold">Fəaliyyət Adı</TableHead>
                        
                        {isVisible('employee') && (
                          <TableHead className="w-[100px] text-center text-[11px] uppercase tracking-wider font-bold hidden sm:table-cell">Məsul Şəxs</TableHead>
                        )}
                        
                        {isVisible('status') && (
                          <TableHead className="w-[120px] text-center text-[11px] uppercase tracking-wider font-bold">Status</TableHead>
                        )}
                        
                        {isVisible('priority') && (
                          <TableHead className="w-[120px] text-center text-[11px] uppercase tracking-wider font-bold hidden md:table-cell">Prioritet</TableHead>
                        )}
                        
                        {isVisible('date') && (
                          <TableHead className="w-[150px] text-center text-[11px] uppercase tracking-wider font-bold hidden lg:table-cell">Tarix Aralığı</TableHead>
                        )}
                        
                        {isVisible('category') && (
                          <TableHead className="w-[120px] text-center text-[11px] uppercase tracking-wider font-bold hidden xl:table-cell">Kateqoriya</TableHead>
                        )}

                        {isVisible('goal_percentage') && (
                          <TableHead className="w-[100px] text-center text-[11px] uppercase tracking-wider font-bold hidden sm:table-cell">Hədəf Payı</TableHead>
                        )}

                        {isVisible('goal_target') && (
                          <TableHead className="w-[150px] text-center text-[11px] uppercase tracking-wider font-bold hidden lg:table-cell">Hədəf</TableHead>
                        )}
                        
                        <TableHead className="w-[50px] text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                                <Settings2 className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2">
                              <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Sütunları tənzimlə</div>
                              <Separator className="my-1" />
                              {columns.map((col) => (
                                <DropdownMenuItem 
                                  key={col.id} 
                                  className="flex items-center justify-between cursor-pointer"
                                  onSelect={(e) => { e.preventDefault(); toggleColumn(col.id); }}
                                >
                                  <span className="text-xs">{col.label}</span>
                                  {col.visible ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <div className="w-4 h-4 border rounded-sm" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupActivities.map((activity) => (
                        <TableRow key={activity.id} className="group hover:bg-muted/20 border-b border-muted/30">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tracking-tight">{activity.name}</span>
                              <div className="flex items-center gap-1.5">
                                {activity.comments_count > 0 && (
                                  <Badge variant="outline" className="h-4 px-1 border-primary/20 text-primary bg-primary/5 gap-1 text-[9px]">
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    <span>{activity.comments_count}</span>
                                  </Badge>
                                )}
                                {activity.attachments && activity.attachments.length > 0 && (
                                  <Badge variant="outline" className="h-4 px-1 border-blue-200 text-blue-600 bg-blue-50 gap-1 text-[9px]">
                                    <Paperclip className="w-2.5 h-2.5" />
                                    <span>{activity.attachments.length}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {isVisible('employee') && (
                            <TableCell className="text-center hidden sm:table-cell">
                              <div className="flex items-center gap-2 justify-center">
                                {activity.employee ? (
                                  <>
                                    <Avatar className="h-7 w-7 border shadow-sm">
                                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.employee.name}`} />
                                      <AvatarFallback>{activity.employee.name.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] font-bold text-foreground/80 whitespace-nowrap bg-muted/30 px-2 py-0.5 rounded border border-muted/50">
                                      {activity.employee.name}
                                    </span>
                                  </>
                                ) : (
                                  <div className="h-7 w-7 rounded-full border border-dashed flex items-center justify-center text-muted-foreground bg-muted/50">
                                    ?
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          )}

                          {isVisible('status') && (
                            <TableCell className="p-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <div className={cn(
                                    "w-full h-10 flex items-center justify-center text-[11px] font-bold cursor-pointer transition-transform active:scale-95 shadow-sm",
                                    STATUS_CONFIG[activity.status].color,
                                    STATUS_CONFIG[activity.status].textColor
                                  )}>
                                    {STATUS_CONFIG[activity.status].label}
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-[150px]">
                                  {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
                                    <DropdownMenuItem 
                                      key={id} 
                                      onClick={() => onStatusChange(activity.id, id as any)}
                                      className="gap-2"
                                    >
                                      <div className={cn("w-3 h-3 rounded-full", cfg.color)} />
                                      {cfg.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}

                          {isVisible('priority') && (
                            <TableCell className="text-center hidden md:table-cell">
                              <Badge variant="outline" className={cn("text-[10px] uppercase font-black px-2 py-0.5", PRIORITY_CONFIG[activity.priority].color)}>
                                {PRIORITY_CONFIG[activity.priority].label}
                              </Badge>
                            </TableCell>
                          )}

                          {isVisible('date') && (
                            <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                              <div className="flex items-center justify-center gap-1.5 bg-muted/20 py-1 px-2 rounded-md border border-muted/10">
                                <Calendar className="w-3 h-3 text-primary/60" />
                                <span>{(() => {
                                  const cleanStartStr = activity.start_date?.includes('.') ? activity.start_date.split('.')[0] : activity.start_date;
                                  const cleanEndStr = activity.end_date?.includes('.') ? activity.end_date.split('.')[0] : activity.end_date;
                                  const start = cleanStartStr ? new Date(cleanStartStr) : null;
                                  const end = cleanEndStr ? new Date(cleanEndStr) : null;
                                  
                                  const startFormatted = start && !isNaN(start.getTime()) ? format(start, "dd.MM.yyyy", { locale: az }) : "...";
                                  const endFormatted = end && !isNaN(end.getTime()) ? format(end, "dd.MM.yyyy", { locale: az }) : "...";
                                  
                                  return `${startFormatted} - ${endFormatted}`;
                                })()}</span>
                              </div>
                            </TableCell>
                          )}

                          {isVisible('hours') && (
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 text-xs">
                                <span className="font-bold text-primary">{activity.actual_hours || 0}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-muted-foreground">{activity.planned_hours}</span>
                              </div>
                            </TableCell>
                          )}

                          {isVisible('category') && (
                             <TableCell className="text-center text-xs italic text-muted-foreground hidden xl:table-cell">
                                {activity.category || '-'}
                             </TableCell>
                          )}

                          {isVisible('goal_percentage') && (
                            <TableCell className="text-center hidden sm:table-cell">
                              <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary bg-primary/5">
                                {activity.goal_contribution_percentage ? `${activity.goal_contribution_percentage}%` : '0%'}
                              </Badge>
                            </TableCell>
                          )}

                          {isVisible('goal_target') && (
                            <TableCell className="text-center text-[11px] font-medium text-muted-foreground italic hidden lg:table-cell">
                               {activity.goal_target || '-'}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 shadow-xl border-primary/10">
                                <DropdownMenuItem onClick={() => onEditActivity(activity)}>
                                  <Edit className="w-4 h-4 mr-2" /> Redaktə
                                </DropdownMenuItem>
                                {onDeleteActivity && (
                                  <DropdownMenuItem onClick={() => onDeleteActivity(activity)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" /> Sil
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Progress Summary Row (Monday Style) */}
                      <TableRow className="bg-muted/5 font-bold h-12">
                        <TableCell className="text-xs uppercase text-muted-foreground pl-4">Cəmi / Tərəqqi</TableCell>
                        
                        {isVisible('employee') && <TableCell className="hidden sm:table-cell" />}
                        
                        {isVisible('status') && (
                          <TableCell className="p-1 px-4">
                            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted shadow-inner border border-muted-foreground/10">
                              <div 
                                className={cn("h-full", STATUS_CONFIG[group.id].color)} 
                                style={{ width: `${groupActivities.length > 0 ? (groupActivities.filter(a => a.status === 'completed').length / groupActivities.length) * 100 || 20 : 0}%` }}
                              />
                            </div>
                          </TableCell>
                        )}
                        
                        {isVisible('priority') && <TableCell className="hidden md:table-cell" />}
                        
                        {isVisible('date') && <TableCell className="hidden lg:table-cell" />}
                        
                        {isVisible('category') && <TableCell className="hidden xl:table-cell" />}
                        
                        {isVisible('goal_percentage') && <TableCell className="hidden sm:table-cell" />}
                        
                        {isVisible('goal_target') && <TableCell className="hidden lg:table-cell" />}
                        
                        <TableCell />
                      </TableRow>

                      {/* Quick Add Row */}
                      {canEdit && (
                        <TableRow className="border-b border-muted/30 hover:bg-transparent">
                           <TableCell colSpan={visibleColumnsCount} className="p-0">
                              <Button 
                                variant="ghost" 
                                className="w-full justify-start h-10 text-muted-foreground hover:text-primary text-xs gap-2 rounded-none pl-4 transition-colors font-medium border-t border-dashed"
                                onClick={() => {/* Will open modal with prefilled status */}}
                              >
                                <Plus className="w-3.5 h-3.5" /> Yeni fəaliyyət əlavə et...
                              </Button>
                           </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
