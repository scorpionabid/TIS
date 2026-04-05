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
  Users,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle
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
  isAdmin: boolean;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({ projects, onProjectClick, isAdmin }) => {
  const statusConfig = {
    active: { label: 'Aktiv', color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: Activity },
    completed: { label: 'Tamamlanıb', color: 'text-blue-600', bg: 'bg-blue-500/10', icon: CheckCircle2 },
    on_hold: { label: 'Gözləmədə', color: 'text-amber-600', bg: 'bg-amber-500/10', icon: Clock },
    cancelled: { label: 'Ləğv edilib', color: 'text-slate-600', bg: 'bg-slate-500/10', icon: AlertCircle },
  };

  return (
    <div className="rounded-2xl border border-muted/60 bg-background/50 backdrop-blur-sm overflow-hidden shadow-xl animate-in fade-in duration-700">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent border-muted/60">
            <TableHead className="w-[300px] font-black text-[10px] uppercase tracking-widest text-muted-foreground py-5 pl-6">Layihənin Adı</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-5 text-center">Status</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-5 hidden lg:table-cell">Tarix Aralığı</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-5 hidden sm:table-cell">Ümumi Hədəf (KPI)</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-5 hidden xl:table-cell">İcraçılar</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-5 w-[150px] hidden md:table-cell">Tərəqqi</TableHead>
            <TableHead className="w-[80px] py-5 pr-6"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const config = statusConfig[project.status] || statusConfig.active;
            const progressValue = Math.floor(Math.random() * 40) + 30; // Mock

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
                  <Badge variant="outline" className={cn(config.bg, config.color, "px-2 py-0.5 text-[9px] font-black tracking-widest uppercase rounded-md border-none shadow-sm inline-flex items-center gap-1")}>
                    <config.icon className="w-2.5 h-2.5" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 hidden lg:table-cell">
                  <div className="flex flex-col gap-0.5 text-[11px] font-bold text-muted-foreground">
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
                    <span className="text-[11px] font-black text-foreground italic">{project.total_goal || '-'}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4 hidden xl:table-cell">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2.5">
                      {project.employees && project.employees.slice(0, 3).map((emp, i) => (
                        <Avatar key={i} className="border-2 border-background w-8 h-8 shadow-sm">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{emp.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ))}
                      {project.employees && project.employees.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-black text-muted-foreground shadow-sm">
                          +{project.employees.length - 3}
                        </div>
                      )}
                    </div>
                    {project.employees && project.employees.length > 0 && (
                      <span className="text-[10px] font-bold text-foreground/80 bg-muted/30 px-2 py-0.5 rounded border border-muted/50 whitespace-nowrap">
                        {project.employees[0].name}
                        {project.employees.length > 1 && <span className="text-primary ml-1">və {project.employees.length - 1} nəfər</span>}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4 hidden md:table-cell">
                  <div className="space-y-1.5 w-full pr-4">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
                       <span className="text-muted-foreground">İcra</span>
                       <span className="text-foreground">{progressValue}%</span>
                    </div>
                    <Progress value={progressValue} className="h-1.5 bg-muted rounded-full overflow-hidden border border-muted-foreground/5 shadow-inner" />
                  </div>
                </TableCell>
                <TableCell className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px] rounded-xl shadow-2xl border-primary/10 p-2">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 pt-2">Əməliyyatlar</DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer font-bold text-xs" onClick={() => onProjectClick(project)}>
                          <ExternalLink className="w-3.5 h-3.5 text-primary" /> Detallar
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer font-bold text-xs text-red-600 focus:text-red-700 focus:bg-red-50">
                            <AlertCircle className="w-3.5 h-3.5" /> Arxivlə
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
