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
import { DeadlineProgressCell } from './cells/DeadlineProgressCell';
import { ExcelTaskRowActions } from './ExcelTaskRowActions';
import {
  sourceOptions,
  priorityOptions,
  statusLabels,
  getSourceColor,
  getPriorityColor,
  getStatusColor,
} from '../config/taskFormFields';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/utils/taskFormatters';

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
  onDelegate: (task: Task) => void;
  currentUserId?: number;
  isAssignedTab?: boolean;
  onStatusChange?: (taskId: number, newStatus: Task["status"]) => void;
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
  onDelegate,
  currentUserId,
  isAssignedTab,
  onStatusChange,
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
        <div className="flex items-center justify-center">
          <Badge
            variant="outline"
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold border-0 rounded-md uppercase tracking-wider',
              task.status === 'completed' && 'bg-emerald-100 text-emerald-700',
              task.status === 'in_progress' && 'bg-blue-100 text-blue-700',
              task.status === 'pending' && 'bg-amber-100 text-amber-700',
              task.status === 'review' && 'bg-purple-100 text-purple-700',
              task.status === 'cancelled' && 'bg-slate-100 text-slate-600',
            )}
          >
            {statusLabels[task.status] || task.status}
          </Badge>
        </div>
      </td>

      {/* Təyin edən (Creator) */}
      <td className="px-2 py-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
            {task.creator?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
          </div>
          <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
            {formatUserName(task.creator?.name || '-')}
          </span>
        </div>
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

      {/* Yönləndirilib (Delegated To) */}
      <td className="px-2 py-1">
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {task.subDelegations && task.subDelegations.length > 0 ? (
            task.subDelegations.slice(0, 2).map((sd, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className="text-[9px] px-1 py-0 bg-blue-50/50 text-blue-600 border-blue-100"
              >
                {formatUserName(sd.delegatedToUser?.name || '??')}
              </Badge>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground italic">Yoxdur</span>
          )}
          {task.subDelegations && task.subDelegations.length > 2 && (
            <span className="text-[9px] text-muted-foreground">+{task.subDelegations.length - 2}</span>
          )}
        </div>
      </td>

      {/* Yaranma Tarixi (Created At) */}
      <td className="px-2 py-1">
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-medium text-slate-600">
            {task.created_at ? new Date(task.created_at).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {task.created_at ? new Date(task.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
      </td>

      {/* deadline_progress: progress bar + hover tooltip with date info + inline edit */}
      <td className="px-2 py-1">
        <DeadlineProgressCell task={task} editContext={editContext} canEdit={canEdit} />
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
        <ExcelTaskRowActions
          task={task}
          canEdit={canEdit}
          canDelete={canDelete}
          isAssignedTab={isAssignedTab}
          onEdit={onEdit}
          onDelete={onDelete}
          onDelegate={onDelegate}
          onStatusChange={onStatusChange}
        />
      </td>
    </tr>
  );
}
