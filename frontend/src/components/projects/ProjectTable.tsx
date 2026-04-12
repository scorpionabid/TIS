import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Project } from '@/services/projects';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  ExternalLink,
  Calendar,
  Target,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit,
  Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from "date-fns/locale";
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectTableProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onEditClick: (project: Project) => void;
  onArchiveClick: (project: Project) => void;
  onUnarchiveClick: (project: Project) => void;
  isAdmin: boolean;
  currentUserId?: number;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({ projects, onProjectClick, onEditClick, onArchiveClick, onUnarchiveClick, isAdmin, currentUserId }) => {
  const statusConfig = {
    active: { label: 'Aktiv', color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: Activity },
    completed: { label: 'Tamamlanıb', color: 'text-blue-600', bg: 'bg-blue-500/10', icon: CheckCircle2 },
    on_hold: { label: 'Gözləmədə', color: 'text-amber-600', bg: 'bg-amber-500/10', icon: Clock },
    cancelled: { label: 'Ləğv edilib', color: 'text-slate-600', bg: 'bg-slate-500/10', icon: AlertCircle },
    archived: { label: 'Arxivdə', color: 'text-purple-600', bg: 'bg-purple-500/10', icon: Archive },
  };

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent border-muted/60">
            <TableHead className="w-[300px] font-semibold text-xs text-muted-foreground py-4 pl-6">Layihənin Adı</TableHead>
            <TableHead className="font-semibold text-xs text-muted-foreground py-4 text-center">Status</TableHead>
            <TableHead className="font-semibold text-xs text-muted-foreground py-4 hidden lg:table-cell">Tarix Aralığı</TableHead>
            <TableHead className="font-semibold text-xs text-muted-foreground py-4 hidden sm:table-cell">Ümumi Hədəf (KPI)</TableHead>
            <TableHead className="font-semibold text-xs text-muted-foreground py-4 hidden xl:table-cell">İcraçılar</TableHead>
            <TableHead className="font-semibold text-xs text-muted-foreground py-4 w-[150px] hidden md:table-cell">Tərəqqi</TableHead>
            <TableHead className="w-[80px] py-5 pr-6"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const config = statusConfig[project.status] || statusConfig.active;
            const activities = project.activities ?? [];
            const progressValue = activities.length > 0
              ? Math.round((activities.filter(a => a.status === 'completed').length / activities.length) * 100)
              : 0;

            return (
              <TableRow 
                key={project.id} 
                className="group cursor-pointer hover:bg-primary/5 transition-all duration-200 border-muted/40"
                onClick={() => onProjectClick(project)}
              >
                <TableCell className="py-4 pl-6">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors line-clamp-1">{project.name}</span>
                    <span className="text-[10px] text-muted-foreground italic line-clamp-1">{project.description || 'Açıqlama yoxdur'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center py-4">
                  <Badge variant="outline" className={cn(config.bg, config.color, "px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md border-none inline-flex items-center gap-1")}>
                    <config.icon className="w-2.5 h-2.5" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 hidden lg:table-cell">
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary/70" />
                      <span>{(() => {
                        const cleanStartStr = project.start_date?.includes('.') ? project.start_date.split('.')[0] : project.start_date;
                        const cleanEndStr = project.end_date?.includes('.') ? project.end_date.split('.')[0] : project.end_date;
                        const start = cleanStartStr ? new Date(cleanStartStr) : null;
                        const end = cleanEndStr ? new Date(cleanEndStr) : null;
                        
                        const startFormatted = start && !isNaN(start.getTime()) ? format(start, 'dd.MM.yyyy', { locale: az }) : '...';
                        const endFormatted = end && !isNaN(end.getTime()) ? format(end, 'dd.MM.yyyy', { locale: az }) : '...';
                        
                        return `${startFormatted} - ${endFormatted}`;
                      })()}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4 hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <Target className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-foreground">{project.total_goal || '-'}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4 hidden xl:table-cell">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2.5">
                      {project.employees && project.employees.slice(0, 3).map((emp, i) => (
                        <Avatar key={i} className="border-2 border-background w-7 h-7">
                          <AvatarImage src={(emp as any).avatar || (emp as any).profile_picture} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">{emp.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ))}
                      {project.employees && project.employees.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                          +{project.employees.length - 3}
                        </div>
                      )}
                    </div>
                    {project.employees && project.employees.length > 0 && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {project.employees[0].name}
                        {project.employees.length > 1 && <span className="text-primary ml-1">+{project.employees.length - 1}</span>}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4 hidden md:table-cell">
                  <div className="space-y-1 w-full pr-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">İcra</span>
                      <span className="font-medium">{progressValue}%</span>
                    </div>
                    <Progress value={progressValue} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Əməliyyatlar</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={() => onProjectClick(project)}>
                          <ExternalLink className="w-3.5 h-3.5" /> Detallar
                        </DropdownMenuItem>
                        {(isAdmin || project.created_by === currentUserId) && (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-sm"
                            onClick={() => onEditClick(project)}
                          >
                            <Edit className="w-3.5 h-3.5" /> Redaktə et
                          </DropdownMenuItem>
                        )}
                        {(isAdmin || project.created_by === currentUserId) && project.status !== 'archived' && (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-sm text-purple-600 focus:text-purple-600"
                            onClick={() => onArchiveClick(project)}
                          >
                            <Archive className="w-3.5 h-3.5" /> Arxivləşdir
                          </DropdownMenuItem>
                        )}
                        {(isAdmin || project.created_by === currentUserId) && project.status === 'archived' && (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-sm text-emerald-600 focus:text-emerald-600"
                            onClick={() => onUnarchiveClick(project)}
                          >
                            <Archive className="w-3.5 h-3.5" /> Arxivdən çıxar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
