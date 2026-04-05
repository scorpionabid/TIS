import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Target, 
  Users, 
  MoreVertical, 
  ExternalLink, 
  Activity, 
  CheckCircle2, 
  BarChart3,
  Clock
} from 'lucide-react';
import { Project } from '@/services/projects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProjectListProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onCreateClick?: () => void;
  isAdmin: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onProjectClick, onCreateClick, isAdmin }) => {
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
          <ProjectCard project={project} onClick={() => onProjectClick(project)} />
        </motion.div>
      ))}
    </div>
  );
};

const ProjectCard: React.FC<{ project: Project; onClick: () => void }> = ({ project, onClick }) => {
  const statusConfig = {
    active: { label: 'Aktiv', color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Activity },
    completed: { label: 'Tamamlanıb', color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2 },
    on_hold: { label: 'Gözləmədə', color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
    cancelled: { label: 'Ləğv edilib', color: 'text-slate-600', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Target },
  };

  const config = statusConfig[project.status] || statusConfig.active;
  const progressValue = Math.floor(Math.random() * 40) + 30; // Mock progress for visual

  return (
    <Card 
      className="group hover:shadow-2xl transition-all duration-500 border-muted/60 cursor-pointer overflow-hidden relative bg-background/50 backdrop-blur-sm hover:-translate-y-2"
      onClick={onClick}
    >
      {/* Decorative Gradient Overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
      
      <CardHeader className="pb-4 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline" className={cn(config.bg, config.color, config.border, "px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-lg flex items-center gap-1.5 shadow-sm")}>
            <config.icon className="w-3 h-3" />
            {config.label}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/5 hover:text-primary">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[56px]">
          {project.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-xs leading-relaxed font-medium text-muted-foreground/80 mt-2 italic capitalize">
          {project.description || 'Bu layihə üçün əlavə açıqlama təyin edilməyib.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pb-6 relative z-10">
        <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground">
          <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-full border border-muted/60">
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

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">İcra Vəziyyəti</span>
            </div>
            <span className="text-sm font-black text-foreground tabular-nums">{progressValue}%</span>
          </div>
          <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden border border-muted-foreground/5 shadow-inner">
             <motion.div 
               className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]"
               initial={{ width: 0 }}
               animate={{ width: `${progressValue}%` }}
               transition={{ duration: 1.5, ease: "easeOut" }}
             />
          </div>
          <p className="text-[10px] text-right text-muted-foreground font-bold italic">{project.total_goal || 'Hədəf təyin edilməyib'}</p>
        </div>
      </CardContent>

      <CardFooter className="pt-4 flex justify-between items-center bg-muted/20 border-t border-muted/30 px-6 py-5 relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2.5">
              {project.employees && project.employees.slice(0, 3).map((emp, i) => (
                <Avatar key={i} className="border-2 border-background w-8 h-8 shadow-sm transition-transform hover:scale-110 hover:z-20 cursor-pointer">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{emp.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
              {project.employees && project.employees.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-black text-muted-foreground shadow-sm">
                  +{project.employees.length - 3}
                </div>
              )}
            </div>
            {project.employees && project.employees.length > 0 ? (
              <span className="text-[11px] font-black text-foreground/80 tracking-tight leading-none bg-background/50 px-2 py-1 rounded-md border border-muted/50">
                {project.employees[0].name}
                {project.employees.length > 1 && <span className="text-primary ml-1">və {project.employees.length - 1} nəfər</span>}
              </span>
            ) : (
               <Badge variant="outline" className="text-[10px] text-muted-foreground italic font-medium gap-1 bg-transparent border-none">
                 <Users className="w-3.5 h-3.5" /> Təyin edilməyib
               </Badge>
            )}
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-11 px-5 gap-2 text-xs font-black uppercase tracking-tighter hover:bg-primary hover:text-white transition-all rounded-xl border border-primary/20 shadow-md flex items-center"
        >
          <span>Detallar</span> <ExternalLink className="w-4 h-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};
