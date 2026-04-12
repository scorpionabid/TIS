import React from 'react';
import {
  Plus,
  Target,
  Users,
  MoreVertical,
  ExternalLink,
  Activity,
  CheckCircle2,
  BarChart3,
  Clock,
  Edit,
  Archive
} from 'lucide-react';
import { Project } from '@/services/projects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectListProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onEditClick: (project: Project) => void;
  onArchiveClick: (project: Project) => void;
  onUnarchiveClick: (project: Project) => void;
  onCreateClick?: () => void;
  isAdmin: boolean;
  currentUserId?: number;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onProjectClick, onEditClick, onArchiveClick, onUnarchiveClick, onCreateClick, isAdmin, currentUserId }) => {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center border-2 border-dashed rounded-3xl bg-muted/20 border-muted-foreground/10 animate-in fade-in duration-700">
        <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
          <Target className="w-12 h-12 text-primary animate-pulse" />
        </div>
        <h3 className="text-2xl font-black mb-3 tracking-tight">Hələ ki layihə yoxdur</h3>
        <p className="text-muted-foreground max-w-sm mb-8 text-sm font-medium italic leading-relaxed">
          {isAdmin 
            ? "Yeni bir strateji hədəf yaradaraq komandanı birləşdirin və fəaliyyət planını başlayın." 
            : "Sizə təyin edilmiş hər hansı bir aktiv layihə tapılmadı."}
        </p>
        {isAdmin && onCreateClick && (
          <Button onClick={onCreateClick} className="gap-3 rounded-xl px-8 h-12 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Plus className="w-5 h-5" /> Yeni Layihə Strategiyası
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {projects.map((project, index) => (
        <motion.div
          key={project.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <ProjectCard
            project={project}
            onClick={() => onProjectClick(project)}
            onEditClick={() => onEditClick(project)}
            onArchiveClick={() => onArchiveClick(project)}
            onUnarchiveClick={() => onUnarchiveClick(project)}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
        </motion.div>
      ))}
    </div>
  );
};

const ProjectCard: React.FC<{
  project: Project;
  onClick: () => void;
  onEditClick: () => void;
  onArchiveClick: () => void;
  onUnarchiveClick: () => void;
  isAdmin: boolean;
  currentUserId?: number;
}> = ({ project, onClick, onEditClick, onArchiveClick, onUnarchiveClick, isAdmin, currentUserId }) => {
  const statusConfig = {
    active: { label: 'Aktiv', color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Activity },
    completed: { label: 'Tamamlanıb', color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2 },
    on_hold: { label: 'Gözləmədə', color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
    cancelled: { label: 'Ləğv edilib', color: 'text-slate-600', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Target },
    archived: { label: 'Arxivdə', color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Archive },
  };

  const config = statusConfig[project.status] || statusConfig.active;
  const activities = project.activities ?? [];
  const progressValue = activities.length > 0
    ? Math.round((activities.filter(a => a.status === 'completed').length / activities.length) * 100)
    : 0;

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-300 border-border cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline" className={cn(config.bg, config.color, config.border, "px-3 py-1 text-[10px] font-semibold uppercase rounded-lg flex items-center gap-1.5")}>
            <config.icon className="w-3 h-3" />
            {config.label}
          </Badge>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-muted">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Əməliyyatlar</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={onClick}>
                  <ExternalLink className="w-3.5 h-3.5" /> Detallar
                </DropdownMenuItem>
                {(isAdmin || project.created_by === currentUserId) && (
                  <DropdownMenuItem className="gap-2 cursor-pointer text-sm" onClick={onEditClick}>
                    <Edit className="w-3.5 h-3.5" /> Redaktə et
                  </DropdownMenuItem>
                )}
                {(isAdmin || project.created_by === currentUserId) && project.status !== 'archived' && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-sm text-purple-600 focus:text-purple-600"
                    onClick={onArchiveClick}
                  >
                    <Archive className="w-3.5 h-3.5" /> Arxivləşdir
                  </DropdownMenuItem>
                )}
                {(isAdmin || project.created_by === currentUserId) && project.status === 'archived' && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-sm text-emerald-600 focus:text-emerald-600"
                    onClick={onUnarchiveClick}
                  >
                    <Archive className="w-3.5 h-3.5" /> Arxivdən çıxar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardTitle className="text-base font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[48px]">
          {project.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-xs leading-relaxed mt-1">
          {project.description || 'Bu layihə üçün əlavə açıqlama təyin edilməyib.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md border border-border/60">
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

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">İcra vəziyyəti</span>
            </div>
            <span className="text-xs font-semibold tabular-nums">{progressValue}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressValue}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-[11px] text-right text-muted-foreground">{project.total_goal || 'Hədəf təyin edilməyib'}</p>
        </div>
      </CardContent>

      <CardFooter className="pt-3 flex justify-between items-center bg-muted/20 border-t px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {project.employees && project.employees.slice(0, 3).map((emp, i) => (
              <Avatar key={i} className="border-2 border-background w-7 h-7">
                <AvatarImage src={(emp as any).avatar || (emp as any).profile_picture} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">{emp.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            {project.employees && project.employees.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                +{project.employees.length - 3}
              </div>
            )}
          </div>
          {project.employees && project.employees.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {project.employees[0].name}
              {project.employees.length > 1 && <span className="text-primary"> +{project.employees.length - 1}</span>}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Təyin edilməyib
            </span>
          )}
        </div>

        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          Detallar <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
};
