/**
 * ExcelTaskRow Component
 *
 * Single editable row in the Excel-like task table
 */

import { useMemo } from 'react';
import { Task } from '@/services/tasks';
import { InlineEditContext } from './types';
import { TextCell } from './cells/TextCell';
import { DropdownCell } from './cells/DropdownCell';
import { DateCell } from './cells/DateCell';
import { TimeCell } from './cells/TimeCell';
import { ProgressCell } from './cells/ProgressCell';
import { MultiSelectCell } from './cells/MultiSelectCell';
import {
  sourceOptions,
  priorityOptions,
  statusLabels,
  getSourceColor,
  getPriorityColor,
  getStatusColor,
} from '../config/taskFormFields';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, Edit, Trash2, Clock, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to format user names
function formatUserName(name: string): string {
  if (!name) return '';

  // If name contains @, extract username before @
  if (name.includes('@')) {
    const username = name.split('@')[0];
    // Capitalize first letter and handle dots/underscores
    return username
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  // Otherwise, just return the name as is
  return name;
}

interface ExcelTaskRowProps {
  task: Task;
  rowNumber: number;
  editContext: InlineEditContext;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canEdit: boolean;
  canDelete: boolean;
  availableUsers?: Array<{ id: number; name: string; email?: string }>;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (taskId: number) => void;
}

export function ExcelTaskRow({
  task,
  rowNumber,
  editContext,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  availableUsers = [],
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}: ExcelTaskRowProps) {
  const { startEdit, saveEdit, cancelEdit, isEditing, isSaving } = editContext;

  // Status options based on current status transitions
  const statusOptions = [
    { label: statusLabels.pending, value: 'pending', color: getStatusColor('pending') },
    { label: statusLabels.in_progress, value: 'in_progress', color: getStatusColor('in_progress') },
    { label: statusLabels.review, value: 'review', color: getStatusColor('review') },
    { label: statusLabels.completed, value: 'completed', color: getStatusColor('completed') },
    { label: statusLabels.cancelled, value: 'cancelled', color: getStatusColor('cancelled') },
  ];

  const priorityOptionsWithColors = priorityOptions.map((opt) => ({
    ...opt,
    color: getPriorityColor(opt.value),
  }));

  const sourceOptionsWithColors = sourceOptions.map((opt) => ({
    ...opt,
    color: getSourceColor(opt.value),
  }));

  // Filter to only show ORIGINAL assignees (not delegation-created ones)
  const originalAssignments = useMemo(() => {
    return (task.assignments || []).filter(a => {
      // Exclude delegation-created assignments (delegated-to users belong to my-delegations page)
      if (a.assignment_metadata?.is_delegated) return false;
      // Exclude cancelled/rejected terminal states
      if (['cancelled', 'rejected'].includes(a.assignment_status || '')) return false;
      return true;
    });
  }, [task.assignments]);

  // Get assignee names from original assignments
  const assigneeNames = originalAssignments
    .map((a) => a.assignedUser?.name || a.assigned_user?.name)
    .filter(Boolean)
    .map((name) => formatUserName(name!))
    .join(', ') || '-';

  // Merge users from original assignments into availableUsers so MultiSelectCell
  // can resolve names even if the assigned user isn't in the assignable users list
  const mergedUsers = useMemo(() => {
    const usersMap = new Map<number, { id: number; name: string; email?: string }>();
    availableUsers.forEach(u => usersMap.set(u.id, u));
    originalAssignments.forEach(a => {
      const user = a.assignedUser || (a as any).assigned_user;
      if (user?.id && !usersMap.has(user.id)) {
        usersMap.set(user.id, { id: user.id, name: user.name, email: user.email });
      }
    });
    return Array.from(usersMap.values());
  }, [availableUsers, originalAssignments]);

  // ── Deadline progress hesablaması ──────────────────────────
  const deadlineInfo = useMemo(() => {
    if (!task.deadline) return null;

    const now = new Date();
    const deadline = new Date(task.deadline);

    // Append deadline_time if available
    if (task.deadline_time) {
      const [h, m] = task.deadline_time.split(':');
      deadline.setHours(Number(h), Number(m), 0);
    } else {
      deadline.setHours(23, 59, 59);
    }

    const createdAt = task.created_at ? new Date(task.created_at) : new Date();
    const startedAt = task.started_at ? new Date(task.started_at) : createdAt;

    const totalMs = deadline.getTime() - startedAt.getTime();
    const elapsedMs = now.getTime() - startedAt.getTime();
    const remainingMs = deadline.getTime() - now.getTime();

    // Already completed/cancelled - no need to show
    if (['completed', 'cancelled'].includes(task.status)) return null;

    const isPast = remainingMs < 0;
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    // Progress percentage (how much time has elapsed)
    const usedPercent = totalMs > 0
      ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)))
      : (isPast ? 100 : 0);

    let color: 'green' | 'yellow' | 'red';
    let label: string;

    if (isPast) {
      color = 'red';
      label = `${Math.abs(remainingDays)}g gecikdi`;
    } else if (remainingDays <= 2) {
      color = 'red';
      label = remainingDays === 0 ? 'Bu gün' : `${remainingDays}g qaldı`;
    } else if (remainingDays <= 7) {
      color = 'yellow';
      label = `${remainingDays}g qaldı`;
    } else {
      color = 'green';
      label = `${remainingDays}g qaldı`;
    }

    return { usedPercent, color, label, isPast, remainingDays };
  }, [task.deadline, task.deadline_time, task.started_at, task.created_at, task.status]);

  return (
    <tr
      className={cn(
        'border-b hover:bg-muted/30 transition-colors',
        isSaving && 'opacity-50 pointer-events-none',
        isSelected && 'bg-primary/5'
      )}
    >
      {/* Selection Checkbox (visible in selection mode) */}
      {isSelectionMode && (
        <td className="px-2 py-2 text-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection?.(task.id)}
            aria-label={`Tapşırığı seç ${task.title}`}
          />
        </td>
      )}

      {/* Row Number */}
      <td className="px-4 py-2 text-center text-sm text-muted-foreground font-medium">
        {rowNumber}
      </td>

      {/* Title */}
      <td className="px-2 py-1">
        <TextCell
          value={task.title}
          isEditing={isEditing(task.id, 'title')}
          onEdit={() => canEdit && startEdit(task.id, 'title', task.title)}
          onSave={(value) => saveEdit(task.id, { title: value })}
          onCancel={cancelEdit}
          placeholder="Tapşırıq adı"
          maxLength={255}
        />
      </td>

      {/* Source */}
      <td className="px-2 py-1">
        <DropdownCell
          value={task.source}
          options={sourceOptionsWithColors}
          isEditing={isEditing(task.id, 'source')}
          onEdit={() => canEdit && startEdit(task.id, 'source', task.source)}
          onSave={(value) => saveEdit(task.id, { source: value as Task['source'] })}
          onCancel={cancelEdit}
          placeholder="Seçin"
          showBadge
        />
      </td>

      {/* Priority */}
      <td className="px-2 py-1">
        <DropdownCell
          value={task.priority}
          options={priorityOptionsWithColors}
          isEditing={isEditing(task.id, 'priority')}
          onEdit={() => canEdit && startEdit(task.id, 'priority', task.priority)}
          onSave={(value) => saveEdit(task.id, { priority: value as Task['priority'] })}
          onCancel={cancelEdit}
          showBadge
        />
      </td>

      {/* Status */}
      <td className="px-2 py-1">
        <DropdownCell
          value={task.status}
          options={statusOptions}
          isEditing={isEditing(task.id, 'status')}
          onEdit={() => canEdit && startEdit(task.id, 'status', task.status)}
          onSave={(value) => saveEdit(task.id, { status: value as Task['status'] })}
          onCancel={cancelEdit}
          showBadge
        />
      </td>

      {/* Assignees */}
      <td className="px-2 py-1">
        <MultiSelectCell
          selectedIds={originalAssignments.map(a => a.assigned_user_id).filter(Boolean) as number[] || []}
          options={mergedUsers}
          isEditing={isEditing(task.id, 'assignees')}
          onEdit={() => canEdit && startEdit(task.id, 'assignees', task.assignments)}
          onSave={(ids) => saveEdit(task.id, { assigned_user_ids: ids } as any)}
          onCancel={cancelEdit}
          placeholder="Məsul şəxs seçin"
        />
      </td>

      {/* deadline_progress: progress bar + hover tooltip with date info + inline edit */}
      <td className="px-2 py-1">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex flex-col gap-1 min-w-[130px] cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => canEdit && startEdit(task.id, 'deadline', task.deadline)}
              >
                {deadlineInfo ? (
                  <>
                    {/* Progress bar */}
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
                    {/* Label */}
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
                {/* Header */}
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
                {/* Body */}
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
      </td>


      {/* Progress */}
      <td className="px-2 py-1">
        <ProgressCell
          value={task.progress}
          isEditing={isEditing(task.id, 'progress')}
          onEdit={() => canEdit && startEdit(task.id, 'progress', task.progress)}
          onSave={(value) => saveEdit(task.id, { progress: value })}
          onCancel={cancelEdit}
        />
      </td>

      {/* Actions */}
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onView(task)}
            title="Ətraflı bax"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(task)}
              title="Redaktə et"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(task)}
              title="Sil"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
