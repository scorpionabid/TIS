import { Task } from '@/services/tasks';
import { InlineEditContext } from '../types';
import { useDeadlineProgress } from '@/hooks/tasks/excel-view/useDeadlineProgress';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Edit, Clock, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeadlineProgressCellProps {
  task: Task;
  editContext: InlineEditContext;
  canEdit: boolean;
}

export function DeadlineProgressCell({ task, editContext, canEdit }: DeadlineProgressCellProps) {
  const { startEdit } = editContext;
  const deadlineInfo = useDeadlineProgress(task);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex flex-col gap-1 min-w-[130px] cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => canEdit && startEdit(task.id, 'deadline', task.deadline)}
          >
            {deadlineInfo ? (
              <>
                <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'absolute left-0 top-0 h-full rounded-full transition-all',
                      deadlineInfo.color === 'green' && 'bg-emerald-500',
                      deadlineInfo.color === 'yellow' && 'bg-amber-400',
                      deadlineInfo.color === 'red' && 'bg-rose-500',
                    )}
                    style={{ width: `${deadlineInfo.usedPercent}%` }}
                  />
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-[11px] font-medium',
                  deadlineInfo.color === 'green' && 'text-emerald-600',
                  deadlineInfo.color === 'yellow' && 'text-amber-600',
                  deadlineInfo.color === 'red' && 'text-rose-600',
                )}>
                  {deadlineInfo.isPast
                    ? <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    : deadlineInfo.remainingDays <= 2
                      ? <Clock className="h-3 w-3 flex-shrink-0" />
                      : <CheckCircle2 className="h-3 w-3 flex-shrink-0" />}
                  <span>{deadlineInfo.label}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Tarix yox</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="p-0 overflow-hidden rounded-lg border shadow-lg w-[220px]"
        >
          <div className="bg-popover text-popover-foreground">
            <div className={cn(
              'px-3 py-2 text-xs font-semibold flex items-center gap-2',
              !deadlineInfo && 'bg-muted/50',
              deadlineInfo?.color === 'green' && 'bg-emerald-50 text-emerald-800',
              deadlineInfo?.color === 'yellow' && 'bg-amber-50 text-amber-800',
              deadlineInfo?.color === 'red' && 'bg-rose-50 text-rose-800',
            )}>
              <Calendar className="h-3.5 w-3.5" />
              Son Tarix Məlumatı
            </div>
            <div className="px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tarix:</span>
                <span className="font-medium">
                  {task.deadline
                    ? new Date(task.deadline).toLocaleDateString('az-AZ', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })
                    : '—'}
                </span>
              </div>
              {task.deadline_time && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Saat:</span>
                  <span className="font-medium">{task.deadline_time}</span>
                </div>
              )}
              {deadlineInfo && (
                <div className={cn(
                  'flex items-center justify-between text-xs font-semibold pt-1 border-t mt-1',
                  deadlineInfo.color === 'green' && 'text-emerald-700',
                  deadlineInfo.color === 'yellow' && 'text-amber-700',
                  deadlineInfo.color === 'red' && 'text-rose-700',
                )}>
                  <span>Vəziyyət:</span>
                  <span>{deadlineInfo.label}</span>
                </div>
              )}
              {canEdit && task.deadline !== undefined && (
                <div className="pt-2 border-t mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 justify-start gap-1.5 px-2 text-[11px] text-primary hover:bg-primary/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(task.id, 'deadline', task.deadline);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                    Son tarixi redaktə et
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
