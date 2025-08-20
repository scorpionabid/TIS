import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Users, 
  Tag, 
  CheckSquare, 
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  Play,
  AlertTriangle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { SchoolTask } from '@/services/schoolAdmin';
import { Task } from '@/services/tasks';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: SchoolTask;
  onStatusChange: (task: SchoolTask, newStatus: Task['status']) => void;
  onEdit?: (task: SchoolTask) => void;
  onView?: (task: SchoolTask) => void;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onStatusChange, 
  onEdit, 
  onView,
  className 
}) => {
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

  const dueDateStatus = getDueDateStatus(task.due_date);
  
  return (
    <Card className={cn("hover:shadow-md transition-shadow cursor-pointer", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Task Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {task.description}
                </p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(task)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ətraflı bax
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Redaktə et
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {task.status !== 'completed' && (
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'completed')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tamamlandı olaraq işarələ
                  </DropdownMenuItem>
                )}
                {task.status === 'pending' && (
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'in_progress')}>
                    <Play className="h-4 w-4 mr-2" />
                    Başla
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Task Metadata */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
              {getPriorityText(task.priority)}
            </Badge>
            
            {task.category && (
              <Badge variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {task.category}
              </Badge>
            )}
          </div>

          {/* Progress */}
          {task.completion_rate !== undefined && task.completion_rate > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tamamlanma</span>
                <span className="font-medium">{task.completion_rate}%</span>
              </div>
              <Progress value={task.completion_rate} className="h-2" />
            </div>
          )}

          {/* Due Date */}
          {dueDateStatus && (
            <div className={cn(
              "text-xs flex items-center gap-1",
              dueDateStatus.color === 'red' && "text-red-600",
              dueDateStatus.color === 'orange' && "text-orange-600",
              dueDateStatus.color === 'gray' && "text-gray-600"
            )}>
              <Clock className="h-3 w-3" />
              {dueDateStatus.text}
            </div>
          )}

          {/* Assignees */}
          {task.assigned_to_names && task.assigned_to_names.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{task.assigned_to_names.slice(0, 2).join(', ')}</span>
              {task.assigned_to_names.length > 2 && (
                <span>+{task.assigned_to_names.length - 2}</span>
              )}
            </div>
          )}

          {/* Subtasks */}
          {task.subtasks_count && task.subtasks_count > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                <span>Alt tapşırıqlar</span>
              </div>
              <span>{task.completed_subtasks_count || 0}/{task.subtasks_count}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};