import React, { useEffect, useState } from 'react';
import { projectService, ProjectActivityLog } from '@/services/projects';
import { Loader2, Clock, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface ActivityHistoryProps {
  activityId: number;
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({ activityId }) => {
  const [logs, setLogs] = useState<ProjectActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const data = await projectService.getActivityLogs(activityId);
        setLogs(data);
      } catch (error) {
        console.error('Logs fetch failed', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [activityId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground italic text-sm">
        Hələlik heç bir tarixçə qeydə alınmayıb.
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {logs.map((log) => (
        <div key={log.id} className="relative flex items-start gap-6 group">
          <div className="absolute left-0 mt-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-primary/20 shadow-sm z-10 group-hover:border-primary transition-colors">
            <Clock className="h-4 w-4 text-primary/70" />
          </div>
          <div className="flex-1 ml-12 pt-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{log.user.name}</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                  {log.type === 'created' ? 'Yaradıldı' : 'Yeniləndi'}
                </span>
              </div>
              <time className="text-[10px] text-muted-foreground">
                  {(() => {
                    const cleanDateString = log.created_at.includes('.') 
                      ? log.created_at.split('.')[0] 
                      : log.created_at;
                    const date = new Date(cleanDateString);
                    return !isNaN(date.getTime()) 
                      ? format(date, "d MMMM, HH:mm", { locale: az })
                      : log.created_at;
                  })()}
              </time>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {log.message || (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-primary/80 lowercase">{log.field}:</span>
                  <span className="line-through opacity-50">{log.old_value || '---'}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-medium text-foreground">{log.new_value}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
