import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye,
  Edit,
  MoreHorizontal,
  CheckSquare
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { SchoolTask } from '@/services/schoolAdmin';
import { Task } from '@/services/tasks';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaskListViewProps {
  tasks: SchoolTask[];
  onTaskStatusChange: (task: SchoolTask, newStatus: Task['status']) => void;
  onTaskEdit?: (task: SchoolTask) => void;
  onTaskView?: (task: SchoolTask) => void;
  isLoading: boolean;
  searchTerm: string;
  className?: string;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  onTaskStatusChange,
  onTaskEdit,
  onTaskView,
  isLoading,
  searchTerm,
  className
}) => {
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckSquare className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <CheckSquare className="h-4 w-4 text-blue-600" />;
      case 'review':
        return <CheckSquare className="h-4 w-4 text-purple-600" />;
      case 'cancelled':
        return <CheckSquare className="h-4 w-4 text-red-600" />;
      case 'pending':
      default:
        return <CheckSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'review': return 'warning';
      case 'cancelled': return 'destructive';
      case 'pending':
      default: return 'secondary';
    }
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'in_progress': return 'İcradadır';
      case 'review': return 'Yoxlanılır';
      case 'cancelled': return 'Ləğv edildi';
      case 'pending': return 'Gözləyir';
      default: return 'Naməlum';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'Yüksək';
      case 'medium': return 'Orta';
      case 'low': return 'Aşağı';
      default: return 'Təyin edilməyib';
    }
  };

  const getDueDateStatus = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { status: 'overdue', text: `${Math.abs(daysLeft)} gün gecikib`, color: 'red' };
    if (daysLeft === 0) return { status: 'today', text: 'Bugün bitir', color: 'orange' };
    if (daysLeft <= 3) return { status: 'urgent', text: `${daysLeft} gün qalıb`, color: 'orange' };
    return { status: 'normal', text: `${daysLeft} gün qalıb`, color: 'gray' };
  };

  const LoadingSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
          <div className="w-8 h-8 bg-muted rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
          <div className="w-20 h-6 bg-muted rounded" />
        </div>
      ))}
    </>
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="space-y-2 p-6">
            <LoadingSkeleton />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <CheckSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Tapşırıq tapılmadı</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 
              'Axtarış kriteriyasına uyğun tapşırıq tapılmadı' : 
              'Hələ ki sizə təyin edilmiş tapşırıq yoxdur'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="space-y-2 p-6">
          {tasks.map(task => {
            const dueDateStatus = getDueDateStatus(task.due_date);
            return (
              <div 
                key={task.id} 
                className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(task.status)}
                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                    {getPriorityText(task.priority)}
                  </Badge>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {task.assigned_by_name && (
                      <span>Təyin edən: {task.assigned_by_name}</span>
                    )}
                    {task.due_date && (
                      <span>Son tarix: {format(new Date(task.due_date), 'dd MMM', { locale: az })}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {dueDateStatus && (
                    <Badge 
                      variant={dueDateStatus.status === 'overdue' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {dueDateStatus.text}
                    </Badge>
                  )}
                  <Badge variant={getStatusColor(task.status) as any}>
                    {getStatusText(task.status)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onTaskView?.(task)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ətraflı bax
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTaskEdit?.(task)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Redaktə et
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};