import { Task } from '@/services/tasks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, Clock, Share2, PlayCircle, CheckCircle2, MoreHorizontal } from 'lucide-react';

interface ExcelTaskRowActionsProps {
  task: Task;
  canEdit: boolean;
  canDelete: boolean;
  isAssignedTab?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDelegate: (task: Task) => void;
  onStatusChange?: (taskId: number, newStatus: Task['status']) => void;
}

export function ExcelTaskRowActions({
  task,
  canEdit,
  canDelete,
  isAssignedTab,
  onEdit,
  onDelete,
  onDelegate,
  onStatusChange,
}: ExcelTaskRowActionsProps) {
  const assignmentStatus = task.user_assignment?.status;
  const canUpdate = task.user_assignment?.can_update;

  const primaryAction = (() => {
    if (isAssignedTab && onStatusChange && ['pending', 'accepted'].includes(assignmentStatus ?? '') && canUpdate) {
      return (
        <Button
          variant="default"
          size="sm"
          className="h-8 px-3 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-1.5"
          onClick={() => onStatusChange(task.id, 'in_progress')}
        >
          <PlayCircle className="h-3.5 w-3.5" />
          İcra et
        </Button>
      );
    }
    if (isAssignedTab && onStatusChange && assignmentStatus === 'in_progress' && canUpdate) {
      return (
        <Button
          variant="default"
          size="sm"
          className="h-8 px-3 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
          onClick={() => onStatusChange(task.id, 'completed')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Tamamla
        </Button>
      );
    }
    if (canEdit) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-[11px] font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
          onClick={() => onEdit(task)}
        >
          <Edit className="h-3.5 w-3.5 text-slate-500" />
          Düzəliş
        </Button>
      );
    }
    return null;
  })();

  return (
    <div className="flex items-center gap-1">
      {primaryAction}

      {task.status !== 'completed' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {isAssignedTab && task.user_assignment?.can_delegate && (
              <DropdownMenuItem
                onClick={() => onDelegate(task)}
                className="text-blue-600 focus:text-blue-700"
              >
                <Share2 className="mr-2 h-4 w-4" />
                <span>Yönləndir</span>
              </DropdownMenuItem>
            )}

            {canEdit && isAssignedTab && canUpdate && (
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Düzəliş et</span>
              </DropdownMenuItem>
            )}

            {canDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(task)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Sil</span>
              </DropdownMenuItem>
            )}

            {isAssignedTab && onStatusChange && assignmentStatus === 'in_progress' && (
              <DropdownMenuItem
                onClick={() => onStatusChange(task.id, 'pending')}
                className="text-slate-600"
              >
                <Clock className="mr-2 h-4 w-4" />
                <span>Ləğv et (Gözləyir)</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
