import React from 'react';
import {
  Plus,
  Target,
  Users,
  MoreVertical,
  ExternalLink,
  Calendar,
  Edit,
  Archive,
  Trash2,
} from 'lucide-react';
import type { Project } from '@/services/projects';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PROJECT_STATUS_CONFIG, formatProjectDate, type ProjectStatus } from '@/utils/projectStatus';

interface ProjectListProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onEditClick: (project: Project) => void;
  onArchiveClick: (project: Project) => void;
  onUnarchiveClick: (project: Project) => void;
  onDeleteClick: (project: Project) => void;
  onCreateClick?: () => void;
  isAdmin: boolean;
  currentUserId?: number;
}

const STATUS_STRIPE: Record<string, string> = {
  active:    'bg-success',
  completed: 'bg-primary',
  on_hold:   'bg-warning',
  cancelled: 'bg-muted-foreground/40',
  archived:  'bg-border',
};

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onProjectClick,
  onEditClick,
  onArchiveClick,
  onUnarchiveClick,
  onDeleteClick,
  onCreateClick,
  isAdmin,
  currentUserId,
}) => {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">Layihə tapılmadı</h3>
        <p className="mb-6 max-w-xs text-sm text-muted-foreground leading-relaxed">
          {isAdmin
            ? 'Yeni bir strateji hədəf yaradaraq komandanı birləşdirin.'
            : 'Sizə təyin edilmiş aktiv layihə tapılmadı.'}
        </p>
        {isAdmin && onCreateClick && (
          <Button onClick={onCreateClick} className="gap-2 rounded-xl px-6 font-semibold">
            <Plus className="w-4 h-4" /> Yeni Layihə
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((project, index) => (
        <motion.div
          key={project.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, duration: 0.3 }}
        >
          <ProjectCard
            project={project}
            onClick={() => onProjectClick(project)}
            onEditClick={() => onEditClick(project)}
            onArchiveClick={() => onArchiveClick(project)}
            onUnarchiveClick={() => onUnarchiveClick(project)}
            onDeleteClick={() => onDeleteClick(project)}
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
  onDeleteClick: () => void;
  isAdmin: boolean;
  currentUserId?: number;
}> = ({
  project,
  onClick,
  onEditClick,
  onArchiveClick,
  onUnarchiveClick,
  onDeleteClick,
  isAdmin,
  currentUserId,
}) => {
  const config = PROJECT_STATUS_CONFIG[project.status as ProjectStatus] ?? PROJECT_STATUS_CONFIG.active;
  const stripeColor = STATUS_STRIPE[project.status] ?? 'bg-border';
  const activities = project.activities ?? [];
  const progressValue =
    activities.length > 0
      ? Math.round((activities.filter((a) => a.status === 'completed').length / activities.length) * 100)
      : 0;

  const canManage = isAdmin || project.created_by === currentUserId;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* Status colour stripe */}
      <div className={cn('h-1 w-full shrink-0', stripeColor)} />

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', config.bg)}>
              <config.icon className={cn('w-3.5 h-3.5', config.color)} />
            </div>
            <span className={cn('text-xs font-semibold', config.color)}>{config.label}</span>
          </div>

          {/* Dropdown — stop click propagation */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Əməliyyatlar</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onClick}>
                  <ExternalLink className="w-3.5 h-3.5" /> Detallar
                </DropdownMenuItem>
                {canManage && (
                  <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onEditClick}>
                    <Edit className="w-3.5 h-3.5" /> Redaktə et
                  </DropdownMenuItem>
                )}
                {canManage && project.status !== 'archived' && (
                  <DropdownMenuItem className="gap-2 text-sm cursor-pointer text-muted-foreground" onClick={onArchiveClick}>
                    <Archive className="w-3.5 h-3.5" /> Arxivləşdir
                  </DropdownMenuItem>
                )}
                {canManage && project.status === 'archived' && (
                  <DropdownMenuItem className="gap-2 text-sm cursor-pointer text-success" onClick={onUnarchiveClick}>
                    <Archive className="w-3.5 h-3.5" /> Arxivdən çıxar
                  </DropdownMenuItem>
                )}
                {canManage && (
                  <DropdownMenuItem className="gap-2 text-sm cursor-pointer text-destructive" onClick={onDeleteClick}>
                    <Trash2 className="w-3.5 h-3.5" /> Sil
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title + description */}
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {project.description || 'Açıqlama yoxdur'}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">İcra</span>
            <span className="font-semibold tabular-nums">{progressValue}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn('h-full rounded-full', stripeColor)}
              initial={{ width: 0 }}
              animate={{ width: `${progressValue}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          {project.total_goal && (
            <p className="text-right text-[10px] text-muted-foreground">{project.total_goal}</p>
          )}
        </div>

        {/* Date row */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{formatProjectDate(project.start_date)} — {formatProjectDate(project.end_date)}</span>
        </div>

        {/* Footer — team + cta */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            {project.employees && project.employees.length > 0 ? (
              <>
                <div className="flex -space-x-2">
                  {project.employees.slice(0, 4).map((emp, i) => (
                    <Avatar key={i} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={(emp as any).avatar || (emp as any).profile_picture} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {project.employees.length > 4 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground">
                      +{project.employees.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {project.employees[0].name}
                  {project.employees.length > 1 && (
                    <span className="text-primary"> +{project.employees.length - 1}</span>
                  )}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <Users className="w-3 h-3" /> Təyin edilməyib
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-primary"
          >
            Bax <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
