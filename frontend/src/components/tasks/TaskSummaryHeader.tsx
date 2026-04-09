import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskSummaryHeaderProps {
  statistics?: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
  isLoading?: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function TaskSummaryHeader({ 
  statistics, 
  isLoading, 
  isVisible, 
  onToggleVisibility 
}: TaskSummaryHeaderProps) {
  if (!isVisible) return null;

  const stats = [
    {
      label: 'Aktiv',
      value: (statistics?.in_progress ?? 0) + (statistics?.pending ?? 0),
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      trend: '+5% həftəlik',
      trendUp: true,
      percent: Math.round(((statistics?.in_progress ?? 0) / (statistics?.total ?? 1)) * 100)
    },
    {
      label: 'Tamamlanan',
      value: statistics?.completed ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-500',
      trend: '+12% həftəlik',
      trendUp: true,
      percent: Math.round(((statistics?.completed ?? 0) / (statistics?.total ?? 1)) * 100)
    },
    {
      label: 'Gecikmiş',
      value: statistics?.overdue ?? 0,
      icon: AlertCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-500',
      trend: '-8% həftəlik',
      trendUp: false,
      percent: Math.round(((statistics?.overdue ?? 0) / (statistics?.total ?? 1)) * 100)
    },
    {
      label: 'Ümumi',
      value: statistics?.total ?? 0,
      icon: Calendar,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-500',
      trend: 'Gözləyən: ' + (statistics?.pending ?? 0),
      trendUp: true,
      percent: 100
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {stats.map((stat) => (
        <Card key={stat.label} className={cn(
          "relative overflow-hidden border-b-4",
          stat.borderColor
        )}>
          <CardContent className="p-4 pt-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {isLoading ? '...' : stat.value}
                </h3>
              </div>
              <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-4">
               {stat.label !== 'Ümumi' ? (
                 <>
                   {stat.trendUp ? (
                     <TrendingUp className="h-3 w-3 text-emerald-500" />
                   ) : (
                     <TrendingDown className="h-3 w-3 text-rose-500" />
                   )}
                   <span className={cn(
                     "text-[10px] font-bold",
                     stat.trendUp ? "text-emerald-500" : "text-rose-500"
                   )}>
                     {stat.trend}
                   </span>
                 </>
               ) : (
                 <span className="text-[10px] font-bold text-slate-500 italic">
                   {stat.trend}
                 </span>
               )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-1000", stat.color.replace('text', 'bg'))}
                  style={{ width: `${stat.percent}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground min-w-[24px]">
                {stat.percent}%
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
