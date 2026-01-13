/**
 * ExcelTaskRow Component
 *
 * Single editable row in the Excel-like task table
 */

import { Task } from '@/services/tasks';
import { InlineEditContext } from './types';
import { TextCell } from './cells/TextCell';
import { DropdownCell } from './cells/DropdownCell';
import { DateCell } from './cells/DateCell';
import { TimeCell } from './cells/TimeCell';
import { ProgressCell } from './cells/ProgressCell';
import {
  sourceOptions,
  priorityOptions,
  statusLabels,
  getSourceColor,
  getPriorityColor,
  getStatusColor,
} from '../config/taskFormFields';
import { formatUserName } from '../TasksTable';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExcelTaskRowProps {
  task: Task;
  rowNumber: number;
  editContext: InlineEditContext;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canEdit: boolean;
  canDelete: boolean;
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

  // Get assignee names
  const assigneeNames = task.assignments
    ?.map((a) => a.assignedUser?.name || a.assigned_user?.name)
    .filter(Boolean)
    .map((name) => formatUserName(name!))
    .join(', ') || '-';

  return (
    <tr
      className={cn(
        'border-b hover:bg-muted/30 transition-colors',
        isSaving && 'opacity-50 pointer-events-none'
      )}
    >
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

      {/* Department - For now, display only */}
      <td className="px-4 py-2 text-sm text-muted-foreground">
        -
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

      {/* Assignees - Read-only for now */}
      <td className="px-4 py-2 text-sm truncate max-w-[200px]" title={assigneeNames}>
        {assigneeNames}
      </td>

      {/* Description */}
      <td className="px-2 py-1 max-w-[300px]">
        <div
          className="px-3 py-2 text-sm truncate cursor-pointer hover:bg-muted/50 rounded"
          title={task.description}
        >
          {task.description || 'Təsvir yoxdur'}
        </div>
      </td>

      {/* Started At */}
      <td className="px-2 py-1">
        <DateCell
          value={task.started_at}
          isEditing={isEditing(task.id, 'started_at')}
          onEdit={() => canEdit && startEdit(task.id, 'started_at', task.started_at)}
          onSave={(value) => saveEdit(task.id, { started_at: value } as any)}
          onCancel={cancelEdit}
        />
      </td>

      {/* Deadline */}
      <td className="px-2 py-1">
        <DateCell
          value={task.deadline}
          isEditing={isEditing(task.id, 'deadline')}
          onEdit={() => canEdit && startEdit(task.id, 'deadline', task.deadline)}
          onSave={(value) => saveEdit(task.id, { deadline: value })}
          onCancel={cancelEdit}
        />
      </td>

      {/* Deadline Time */}
      <td className="px-2 py-1">
        <TimeCell
          value={task.deadline_time}
          isEditing={isEditing(task.id, 'deadline_time')}
          onEdit={() => canEdit && startEdit(task.id, 'deadline_time', task.deadline_time)}
          onSave={(value) => saveEdit(task.id, { deadline_time: value })}
          onCancel={cancelEdit}
        />
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
