import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Play, 
  Pause, 
  CheckCircle 
} from 'lucide-react';
import { TaskCard } from './TaskCard';
import { SchoolTask } from '@/services/schoolAdmin';
import { Task } from '@/services/tasks';

interface GroupedTasks {
  pending: SchoolTask[];
  in_progress: SchoolTask[];
  completed: SchoolTask[];
  on_hold: SchoolTask[];
}

interface TaskBoardViewProps {
  groupedTasks: GroupedTasks;
  onTaskStatusChange: (task: SchoolTask, newStatus: Task['status']) => void;
  onTaskEdit?: (task: SchoolTask) => void;
  onTaskView?: (task: SchoolTask) => void;
  isLoading: boolean;
  className?: string;
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({
  groupedTasks,
  onTaskStatusChange,
  onTaskEdit,
  onTaskView,
  isLoading,
  className
}) => {
  const columns = [
    {
      key: 'pending',
      title: 'Gözləyən',
      icon: Clock,
      iconColor: 'text-gray-500',
      badgeVariant: 'secondary' as const,
      tasks: groupedTasks.pending,
    },
    {
      key: 'in_progress',
      title: 'Davam edir',
      icon: Play,
      iconColor: 'text-blue-600',
      badgeVariant: 'primary' as const,
      tasks: groupedTasks.in_progress,
    },
    {
      key: 'on_hold',
      title: 'Gözləyir',
      icon: Pause,
      iconColor: 'text-orange-600',
      badgeVariant: 'warning' as const,
      tasks: groupedTasks.on_hold,
    },
    {
      key: 'completed',
      title: 'Tamamlandı',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      badgeVariant: 'success' as const,
      tasks: groupedTasks.completed,
    },
  ];

  const LoadingSkeleton = () => (
    <>
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className || ''}`}>
      {columns.map((column) => {
        const Icon = column.icon;
        return (
          <div key={column.key} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Icon className={`h-4 w-4 ${column.iconColor}`} />
                {column.title}
              </h3>
              <Badge variant={column.badgeVariant}>{column.tasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <LoadingSkeleton />
              ) : (
                column.tasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onStatusChange={onTaskStatusChange}
                    onEdit={onTaskEdit}
                    onView={onTaskView}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};