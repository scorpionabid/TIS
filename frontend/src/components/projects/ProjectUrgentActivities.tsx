import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { projectService, ProjectActivity } from '@/services/projects';
import { format, differenceInDays } from 'date-fns';
import { az } from 'date-fns/locale';
import { 
  Loader2, 
  AlertCircle, 
  Clock, 
  Calendar as CalendarIcon,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProjectUrgentActivitiesProps {
  onActivityClick?: (activity: ProjectActivity) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Gözləyir', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'İcrada', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  checking: { label: 'Yoxlamada', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  completed: { label: 'Tamamlanıb', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  stuck: { label: 'Problem', color: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    const clean = dateString.includes('.') ? dateString.split('.')[0] : dateString;
    const date = new Date(clean);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd.MM.yyyy', { locale: az });
  } catch {
    return '-';
  }
};

const getDaysInfo = (endDate: string) => {
  const clean = endDate.includes('.') ? endDate.split('.')[0] : endDate;
  const end = new Date(clean);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return differenceInDays(end, now);
};

function ActivityRow({ 
  activity, 
  type,
  onProjectOpen 
}: { 
  activity: ProjectActivity; 
  type: 'overdue' | 'upcoming';
  onProjectOpen?: (id: number) => void;
}) {
  const days = activity.end_date ? getDaysInfo(activity.end_date) : null;
  const isOverdue = type === 'overdue';

  return (
    <TableRow
      className={cn(
        "group transition-all cursor-pointer border-b",
        isOverdue 
          ? "hover:bg-red-50/60 dark:hover:bg-red-950/20" 
          : "hover:bg-orange-50/60 dark:hover:bg-orange-950/20"
      )}
      onClick={() => onActivityClick?.(activity)}
    >
      {/* Activity Name */}
      <TableCell className="py-3 pl-4">
        <div className="flex flex-col gap-0.5">
          <span className={cn(
            "font-semibold text-sm group-hover:text-primary transition-colors",
            isOverdue && "text-red-700/90 dark:text-red-400"
          )}>
            {activity.name}
          </span>
          {activity.description && (
            <span className="text-[11px] text-muted-foreground line-clamp-1 opacity-70">
              {activity.description}
            </span>
          )}
        </div>
      </TableCell>

      {/* Project Name */}
      <TableCell className="py-3">
        <Badge
          variant="outline"
          className="text-[11px] font-semibold bg-background border-border/70 text-foreground/80 whitespace-nowrap"
        >
          {(activity as any).project?.name || `Layihə #${activity.project_id}`}
        </Badge>
      </TableCell>

      {/* Assigned Employees */}
      <TableCell className="py-3">
        <div className="flex flex-col gap-0.5">
          {activity.assigned_employees && activity.assigned_employees.length > 0 ? (
            activity.assigned_employees.slice(0, 2).map(emp => (
              <span key={emp.id} className="text-[11px] font-medium text-muted-foreground">
                {emp.name}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground/50 italic">Təyin edilməyib</span>
          )}
          {activity.assigned_employees && activity.assigned_employees.length > 2 && (
            <span className="text-[10px] text-muted-foreground/60">
              +{activity.assigned_employees.length - 2} daha
            </span>
          )}
        </div>
      </TableCell>

      {/* End Date */}
      <TableCell className="py-3">
        <div className="flex flex-col items-start gap-1">
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            isOverdue ? "text-red-600" : "text-orange-600"
          )}>
            <CalendarIcon className="w-3 h-3 opacity-70" />
            {formatDate(activity.end_date)}
          </div>
          {days !== null && (
            <Badge
              className={cn(
                "text-[9px] font-black px-1.5 py-0 h-4 tracking-wide",
                isOverdue
                  ? "bg-red-100 text-red-700 border-red-200 border"
                  : "bg-orange-100 text-orange-700 border-orange-200 border"
              )}
            >
              {isOverdue ? `${Math.abs(days)} gün gecikir` : `${days} gün qalır`}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="py-3 text-center">
        <Badge
          className={cn(
            "text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider",
            statusConfig[activity.status]?.color || statusConfig.pending.color
          )}
        >
          {statusConfig[activity.status]?.label || 'Naməlum'}
        </Badge>
      </TableCell>

      {/* Action */}
      <TableCell className="py-3 text-right pr-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
        >
          <ArrowRight className="w-3.5 h-3.5 text-primary" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function SectionHeader({ 
  title, 
  count, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  count: number; 
  icon: any; 
  color: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-2.5 border-b", color)}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-black uppercase tracking-wider">{title}</span>
      <Badge className="text-[10px] font-black px-2 py-0 h-5 rounded-full bg-current/10 border-current/20 border">
        {count}
      </Badge>
    </div>
  );
}

export const ProjectUrgentActivities: React.FC<ProjectUrgentActivitiesProps> = ({
  onActivityClick
}) => {
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const data = await projectService.getUrgentActivities();
        setActivities(data);
      } catch (error) {
        console.error('Urgent activities fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivities();
  }, []);

  // Server already filters by 7-day window & role.
  // We just split into overdue vs upcoming client-side for display.
  const { overdue, upcoming } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdue: ProjectActivity[] = [];
    const upcoming: ProjectActivity[] = [];

    activities.forEach(a => {
      if (!a.end_date) return;
      const clean = a.end_date.includes('.') ? a.end_date.split('.')[0] : a.end_date;
      const end = new Date(clean);
      end.setHours(0, 0, 0, 0);

      if (end < now) overdue.push(a);
      else upcoming.push(a);
    });

    return { overdue, upcoming };
  }, [activities]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
        <p className="text-sm text-muted-foreground">Tapşırıqlar yüklənir...</p>
      </div>
    );
  }

  if (overdue.length === 0 && upcoming.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed rounded-2xl bg-muted/20"
      >
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-foreground">Hamısı qaydasındadır!</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Gecikmiş və ya yaxınlaşan (1 həftə) tapşırıq yoxdur.
          </p>
        </div>
      </motion.div>
    );
  }

  const tableHeader = (
    <TableHeader className="bg-muted/30 sticky top-0 z-10">
      <TableRow className="hover:bg-transparent border-b">
        <TableHead className="w-[35%] font-bold text-foreground pl-4">Tapşırıq</TableHead>
        <TableHead className="w-[18%] font-bold text-foreground">Layihə</TableHead>
        <TableHead className="w-[17%] font-bold text-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 opacity-60" />
            İcraçı
          </div>
        </TableHead>
        <TableHead className="w-[16%] font-bold text-foreground">Son Tarix</TableHead>
        <TableHead className="w-[10%] font-bold text-foreground text-center">Status</TableHead>
        <TableHead className="w-[4%]" />
      </TableRow>
    </TableHeader>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary Banner */}
      <div className="flex items-center gap-3 flex-wrap">
        {overdue.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <TrendingDown className="w-4 h-4" />
            <span>{overdue.length} tapşırıq gecikir</span>
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <Clock className="w-4 h-4" />
            <span>{upcoming.length} tapşırıq bu həftə bitir</span>
          </div>
        )}
      </div>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-red-200/70 dark:border-red-800/40 overflow-hidden shadow-sm">
          <SectionHeader
            title="Gecikənlər"
            count={overdue.length}
            icon={AlertCircle}
            color="bg-red-50/80 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200/70 dark:border-red-800/40"
          />
          <Table>
            {tableHeader}
            <TableBody>
              {overdue.map(a => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  type="overdue"
                  onProjectOpen={onActivityClick}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-orange-200/70 dark:border-orange-800/40 overflow-hidden shadow-sm">
          <SectionHeader
            title="Bu həftə bitir"
            count={upcoming.length}
            icon={Clock}
            color="bg-orange-50/80 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200/70 dark:border-orange-800/40"
          />
          <Table>
            {tableHeader}
            <TableBody>
              {upcoming.map(a => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  type="upcoming"
                  onProjectOpen={onActivityClick}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </motion.div>
  );
};
