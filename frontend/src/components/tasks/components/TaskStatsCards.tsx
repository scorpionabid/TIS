import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckSquare, 
  Clock, 
  Play, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

interface TaskStatsCardsProps {
  stats: TaskStats;
  className?: string;
}

export const TaskStatsCards: React.FC<TaskStatsCardsProps> = ({ 
  stats, 
  className 
}) => {
  const statsConfig = [
    {
      key: 'total',
      label: 'Ümumi',
      value: stats.total,
      icon: CheckSquare,
      color: 'text-muted-foreground',
    },
    {
      key: 'pending',
      label: 'Gözləyən',
      value: stats.pending,
      icon: Clock,
      color: 'text-gray-600',
    },
    {
      key: 'in_progress',
      label: 'Davam edir',
      value: stats.in_progress,
      icon: Play,
      color: 'text-blue-600',
    },
    {
      key: 'completed',
      label: 'Tamamlandı',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      key: 'overdue',
      label: 'Gecikmiş',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-5 gap-4 ${className || ''}`}>
      {statsConfig.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};