import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Users,
  BarChart3,
  Edit,
  ChevronRight,
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

const STATUS_STRIPE: Record<string, string> = {
  active:    'bg-success',
  completed: 'bg-primary',
  on_hold:   'bg-warning',
  cancelled: 'bg-muted-foreground',
  archived:  'bg-accent-foreground',
};

export function ProjectDetailsHeader({
  project,
  onBack,
  isStatsVisible,
  toggleStats,
  isAdmin,
  onEdit,
  formatDate,
}: ProjectDetailsHeaderProps) {
  const statusCfg = PROJECT_STATUS_CONFIG[project.status as ProjectStatus];
  const stripeColor = STATUS_STRIPE[project.status] ?? 'bg-border';

  return (
    <div className="space-y-2">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground px-0.5">
        <button onClick={onBack} className="hover:text-primary transition-colors">
          Layihələr
        </button>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <span className="text-foreground font-medium truncate max-w-xs">{project.name}</span>
      </nav>

      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        {/* Status colour stripe */}
        <div className={cn('h-1 w-full', stripeColor)} />

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          {/* Left — back + title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                {statusCfg && (
                  <Badge
                    variant="outline"
                    className={cn('h-5 px-2 text-xs font-medium', statusCfg.bg, statusCfg.color, statusCfg.border)}
                  >
                    {statusCfg.label}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground/50 tabular-nums">#{project.id}</span>
              </div>
              <h1 className="truncate text-xl font-bold leading-snug text-foreground">
                {project.name}
              </h1>
            </div>
          </div>

          {/* Centre — meta info */}
          <div className="hidden lg:flex items-center divide-x divide-border/40">
            <div className="flex items-center gap-2 pr-6">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Müddət</p>
                <p className="text-xs font-semibold whitespace-nowrap tabular-nums">
                  {formatDate(project.start_date)} — {formatDate(project.end_date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-6">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="max-w-[160px]">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">İcraçılar</p>
                <p className="text-xs font-semibold truncate">
                  {project.employees?.length
                    ? project.employees.map((e: any) => e.name).join(', ')
                    : 'Təyin edilməyib'}
                </p>
              </div>
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2">
            <Button
              variant={isStatsVisible ? 'secondary' : 'outline'}
              size="sm"
              onClick={toggleStats}
              className={cn(
                'h-9 gap-1.5 rounded-lg text-xs transition-all',
                isStatsVisible && 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15',
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isStatsVisible ? 'Statistikanı gizlə' : 'Statistika'}
              </span>
            </Button>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="h-9 gap-1.5 rounded-lg border-border/60 text-xs hover:border-primary/40 hover:text-primary"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Redaktə</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
