import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardService } from '@/services/dashboard';
import { translateActivityDescription } from '@/lib/activityTranslator';

interface DashboardActivityCardProps {
  title?: string;
  limit?: number;
}

export const DashboardActivityCard: React.FC<DashboardActivityCardProps> = ({
  title = 'Son Fəaliyyətlər',
  limit = 5,
}) => {
  const { data: rawData } = useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: () => dashboardService.getRecentActivity(limit),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Normalize: endpoint may return array, {data:[]}, {activities:[]}, {items:[]}, etc.
  const activities: any[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray((rawData as any)?.data)
    ? (rawData as any).data
    : Array.isArray((rawData as any)?.activities)
    ? (rawData as any).activities
    : [];

  return (
    <Card className="glass-card border-none modern-shadow rounded-[32px] flex-1 flex flex-col overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-2xl font-black flex items-center gap-3">
          <Zap size={24} className="text-amber-500" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 p-8 pt-0 overflow-y-auto custom-scrollbar">
        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Fəaliyyət tapılmadı</p>
        )}
        {(activities as any[]).map((activity: any, i: number) => (
          <div
            key={activity.id ?? i}
            className="flex items-start gap-4 p-5 rounded-[24px] bg-muted/20 border border-transparent hover:border-primary/10 transition-all hover:bg-muted/30"
          >
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black leading-tight text-slate-800 dark:text-slate-100">
                {translateActivityDescription(activity.description ?? activity.action ?? activity.title ?? '—')}
              </p>
              <p className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-tighter">
                {activity.time ?? (activity.created_at
                  ? new Date(activity.created_at).toLocaleString('az-AZ', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
                  : '')}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
