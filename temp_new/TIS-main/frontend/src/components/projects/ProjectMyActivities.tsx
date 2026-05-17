import React, { useState, useEffect } from 'react';
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
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { Loader2, ExternalLink, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectMyActivitiesProps {
  onActivityClick: (activity: ProjectActivity) => void;
}

const statusConfig = {
  pending: { label: 'Gözləyir', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'İcrada', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  checking: { label: 'Yoxlamada', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  completed: { label: 'Tamamlanıb', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  stuck: { label: 'Problem', color: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export const ProjectMyActivities: React.FC<ProjectMyActivitiesProps> = ({ onActivityClick }) => {
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyActivities = async () => {
      try {
        setIsLoading(true);
        const data = await projectService.getMyActivities();
        setActivities(data);
      } catch (error) {
        console.error('Fetch my activities error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyActivities();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const cleanDateString = dateString.includes('.') ? dateString.split('.')[0] : dateString;
      const date = new Date(cleanDateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd.MM.yyyy', { locale: az });
    } catch (e) {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
        <p className="text-sm text-muted-foreground">Fəaliyyətlər yüklənir...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/30">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Sizə təyin edilmiş fəaliyyət yoxdur</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
          Yeni fəaliyyətlər təyin edildikdə burada görünəcək.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[35%] font-bold text-foreground">Fəaliyyət</TableHead>
            <TableHead className="w-[20%] font-bold text-foreground">Layihə adı</TableHead>
            <TableHead className="w-[12%] font-bold text-foreground">Başlama</TableHead>
            <TableHead className="w-[12%] font-bold text-foreground">Bitmə Tarixi</TableHead>
            <TableHead className="w-[15%] font-bold text-foreground text-center">Status</TableHead>
            <TableHead className="w-[6%] text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => {
             const isOverdue = activity.status !== 'completed' && activity.end_date && new Date(activity.end_date) < new Date();
             const isNear = !isOverdue && activity.status !== 'completed' && activity.end_date && 
                            Math.ceil((new Date(activity.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3;

             return (
               <TableRow 
                 key={activity.id} 
                 className="group hover:bg-muted/30 transition-colors cursor-pointer"
                 onClick={() => onActivityClick(activity)}
               >
                 <TableCell className="py-4">
                   <div className="flex flex-col gap-1">
                     <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                       {activity.name}
                     </span>
                     {activity.description && (
                       <span className="text-xs text-muted-foreground line-clamp-1">
                         {activity.description}
                       </span>
                     )}
                   </div>
                 </TableCell>
                 <TableCell>
                   <Badge variant="outline" className="font-medium bg-white text-slate-600 border-slate-200">
                     {activity.project?.name || 'Naməlum Layihə'}
                   </Badge>
                 </TableCell>
                 <TableCell>
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                     <CalendarIcon className="w-3 h-3 opacity-50" />
                     {formatDate(activity.start_date as any)}
                   </div>
                 </TableCell>
                 <TableCell className={cn(
                   isOverdue && "bg-red-50/50",
                   isNear && "bg-orange-50/50"
                 )}>
                   <div className={cn(
                     "flex items-center gap-1.5 text-xs font-medium",
                     isOverdue ? "text-red-600" : isNear ? "text-orange-600" : "text-muted-foreground"
                   )}>
                     <CalendarIcon className="w-3 h-3 opacity-50" />
                     {formatDate(activity.end_date as any)}
                   </div>
                 </TableCell>
                 <TableCell className="text-center">
                   <Badge 
                     className={cn(
                       "text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider",
                       statusConfig[activity.status as keyof typeof statusConfig]?.color || statusConfig.pending.color
                     )}
                   >
                     {statusConfig[activity.status as keyof typeof statusConfig]?.label || 'Naməlum'}
                   </Badge>
                 </TableCell>
                 <TableCell className="text-right">
                   <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                     <ExternalLink className="w-4 h-4 text-primary" />
                   </Button>
                 </TableCell>
               </TableRow>
             );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
