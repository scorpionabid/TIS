import React from 'react';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Briefcase, 
  BarChart3 as DashboardIcon, 
  Edit,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PROJECT_STATUS_CONFIG, type ProjectStatus } from '@/utils/projectStatus';

interface ProjectDetailsHeaderProps {
  project: any;
  onBack: () => void;
  isStatsVisible: boolean;
  toggleStats: () => void;
  isAdmin: boolean;
  onEdit: () => void;
  formatDate: (date?: string) => string;
}


export function ProjectDetailsHeader({
  project,
  onBack,
  isStatsVisible,
  toggleStats,
  isAdmin,
  onEdit,
  formatDate
}: ProjectDetailsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60 font-medium">
         <span className="cursor-pointer hover:text-primary transition-colors" onClick={onBack}>Layihələr</span>
         <ChevronRight className="w-3 h-3" />
         <span className="text-foreground font-bold truncate max-w-[200px]">{project.name}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6 bg-card/40 backdrop-blur-md border border-border/40 p-4 rounded-2xl shadow-xl hover:bg-card/60 transition-all duration-500">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-5 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-10 w-10 shrink-0 rounded-xl hover:bg-primary/5 hover:text-primary group/back border border-transparent hover:border-primary/20 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover/back:-translate-x-1" />
          </Button>

          <div className="flex flex-col min-w-0">
             <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={cn(
                  'text-xs h-5 px-2 font-medium shrink-0',
                  PROJECT_STATUS_CONFIG[project.status as ProjectStatus]?.bg,
                  PROJECT_STATUS_CONFIG[project.status as ProjectStatus]?.color,
                  PROJECT_STATUS_CONFIG[project.status as ProjectStatus]?.border,
                )}>
                  {PROJECT_STATUS_CONFIG[project.status as ProjectStatus]?.label ?? project.status}
                </Badge>
                <span className="text-xs text-muted-foreground/50">#{project.id}</span>
             </div>
             <h1 className="text-2xl font-bold text-foreground truncate leading-tight cursor-default">
               {project.name}
             </h1>
          </div>
        </div>

        {/* Center Section: Info Cards */}
        <div className="flex items-center gap-8 px-6">
           {/* Date Info */}
           <div className="flex items-center gap-3 group/info">
              <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center border border-border/20 group-hover/info:bg-primary/5 group-hover/info:border-primary/20 transition-all duration-300">
                <CalendarIcon className="w-4 h-4 text-muted-foreground group-hover/info:text-primary transition-colors" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground leading-none mb-1">Müddət</span>
                <span className="text-[12px] font-black whitespace-nowrap leading-none tabular-nums">
                  {formatDate(project.start_date)} — {formatDate(project.end_date)}
                </span>
              </div>
           </div>

           {/* Responsible Person */}
           <div className="flex items-center gap-3 group/info">
              <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center border border-border/20 group-hover/info:bg-primary/5 group-hover/info:border-primary/20 transition-all duration-300">
                 <Briefcase className="w-4 h-4 text-muted-foreground group-hover/info:text-primary transition-colors" />
              </div>
              <div className="flex flex-col min-w-0 max-w-[150px]">
                <span className="text-xs text-muted-foreground leading-none mb-1">İcraçı</span>
                <span className="text-[12px] font-black truncate leading-none">
                  {project.employees && project.employees.length > 0 
                    ? project.employees.map((e: any) => e.name).join(', ') 
                    : 'Təyin edilməyib'}
                </span>
              </div>
           </div>
        </div>
        
        {/* Right Section: Actions */}
        <div className="flex items-center gap-3 pl-4 border-l border-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleStats}
            className={cn(
              "h-10 gap-2 rounded-xl px-4 transition-all duration-300 font-bold",
              isStatsVisible ? "text-primary bg-primary/5 border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "text-muted-foreground hover:bg-muted border border-transparent"
            )}
          >
            <DashboardIcon className="w-4.5 h-4.5" />
            <span className="text-xs font-medium">{isStatsVisible ? 'Statistikanı gizlə' : 'Statistika'}</span>
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-10 gap-2 rounded-xl px-4 border-border/60 hover:border-primary hover:text-primary hover:bg-primary/5 shadow-sm transition-all duration-300 font-bold"
            >
              <Edit className="w-4 h-4" />
              <span className="text-xs font-medium">Redaktə et</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
