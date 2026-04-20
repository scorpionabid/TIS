import React from 'react';
import {
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  X,
  Check,
  Lock,
  GripHorizontal,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectActivity } from '@/services/projects';
import type { AssignableUser } from '@/services/tasks';
import type { ColumnSetting } from '@/hooks/projects/useColumnSettings';
import {
  ACTIVITY_STATUS_CONFIG,
  ACTIVITY_PRIORITY_CONFIG,
  type ActivityStatus,
  type ActivityPriority,
} from '@/utils/projectStatus';
import { ProjectActivityCreateRow } from './ProjectActivityCreateRow';

export interface SortableRowProps {
  activity: ProjectActivity;
  projectId: number;
  columns: ColumnSetting[];
  isVisible: (id: string) => boolean;
  editingId: number | null;
  isHighlighted?: boolean;
  onStatusChange: (id: number, status: ProjectActivity['status']) => void;
  startEditing: (activity: ProjectActivity) => void;
  saveEdit: () => void;
  cancelEditing: () => void;
  editFormData: Partial<ProjectActivity>;
  handleEditFieldChange: (field: keyof ProjectActivity, value: unknown) => void;
  isSubmitting: boolean;
  availableUsers?: AssignableUser[];
  columnWidths: Record<string, number>;
  onDelete: (id: number) => void;
  canEdit?: boolean;
}

export function getDeadlineStatus(
  endDate: string | null,
  status: string,
): 'overdue' | 'near' | null {
  if (!endDate || status === 'completed' || status === 'checking') return null;
  const diffDays = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'near';
  return null;
}

export const ProjectActivitySortableRow = React.memo(function ProjectActivitySortableRow({
  activity,
  projectId,
  columns,
  isVisible,
  editingId,
  isHighlighted,
  onStatusChange,
  startEditing,
  saveEdit,
  cancelEditing,
  editFormData,
  handleEditFieldChange,
  isSubmitting,
  availableUsers,
  columnWidths,
  onDelete,
  canEdit,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const nameWidth = columnWidths['name'] || 300;
  const isEditing = editingId === activity.id;
  const statusCfg = ACTIVITY_STATUS_CONFIG[activity.status as ActivityStatus];
  const priorityCfg = ACTIVITY_PRIORITY_CONFIG[activity.priority as ActivityPriority];

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        'group border-b border-muted/20 transition-all select-none',
        isEditing ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/5',
        isHighlighted && 'bg-yellow-100/40 ring-1 ring-yellow-400/50 z-40 animate-pulse duration-[3000ms]',
        isDragging && 'opacity-50 ring-2 ring-primary bg-accent z-50 relative',
      )}
    >
      {/* Name — sticky left */}
      <TableCell
        className="sticky left-0 z-20 bg-card border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-default py-1"
        style={{ width: nameWidth, minWidth: nameWidth, maxWidth: nameWidth }}
        {...attributes}
        {...listeners}
      >
        <div
          className="flex items-center gap-2 px-2 overflow-hidden"
          onClick={(e) => {
            if (activity.is_editable) {
              e.stopPropagation();
              startEditing(activity);
            }
          }}
        >
          {!activity.is_editable && <Lock className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
          <span className={cn('text-[12px] font-semibold tracking-tight truncate', !activity.is_editable && 'text-muted-foreground/70')}>
            {isEditing ? (
              <Input
                autoFocus
                value={editFormData.name}
                onChange={(e) => handleEditFieldChange('name', e.target.value)}
                className="h-7 text-xs font-semibold py-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              activity.name
            )}
          </span>
        </div>
      </TableCell>

      {/* Employees */}
      {isVisible('employees') && (
        <TableCell className="p-0 border-r" style={{ width: columnWidths['employees'] || 150 }}>
          {isEditing ? (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <ProjectActivityCreateRow
                projectId={projectId}
                status={activity.status}
                availableColumns={columns}
                isVisible={isVisible}
                onCreated={() => {}}
                availableUsers={availableUsers}
                canEdit
                isJustSelector
                multiSelectorValue={editFormData.employee_ids || []}
                onMultiSelectorChange={(vals: number[]) => handleEditFieldChange('employee_ids', vals)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1 gap-0.5" onClick={() => startEditing(activity)}>
              {activity.assigned_employees?.length
                ? activity.assigned_employees.map((e) => (
                    <div key={e.id} className="text-[10px] font-medium text-muted-foreground">{e.name}</div>
                  ))
                : <span className="text-[10px] italic text-muted-foreground/40">-</span>}
            </div>
          )}
        </TableCell>
      )}

      {/* Status */}
      {isVisible('status') && statusCfg && (
        <TableCell className="p-0 border-r" style={{ width: columnWidths['status'] || 120 }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn(
                'w-full h-8 flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:brightness-95',
                statusCfg.color,
                statusCfg.textColor,
                !activity.is_editable && 'opacity-70 cursor-not-allowed',
              )}>
                {statusCfg.label}
              </div>
            </DropdownMenuTrigger>
            {activity.is_editable && (
              <DropdownMenuContent align="center" className="w-[160px]">
                {Object.entries(ACTIVITY_STATUS_CONFIG).map(([id, cfg]) => (
                  <DropdownMenuItem key={id} onClick={() => onStatusChange(activity.id, id as ActivityStatus)} className="gap-2">
                    <div className={cn('w-3 h-3 rounded-full', cfg.color)} />
                    {cfg.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </TableCell>
      )}

      {/* Priority */}
      {isVisible('priority') && (
        <TableCell className="p-0 border-r" style={{ width: columnWidths['priority'] || 100 }}>
          <div className="flex justify-center h-8 items-center" onClick={() => startEditing(activity)}>
            {isEditing ? (
              <select
                value={editFormData.priority}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleEditFieldChange('priority', e.target.value)}
                className="text-xs bg-transparent border-none focus:ring-0"
              >
                <option value="low">Aşağı</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksək</option>
                <option value="critical">Kritik</option>
              </select>
            ) : priorityCfg ? (
              <Badge variant="outline" className={cn('text-xs px-1.5 py-0 border-none', priorityCfg.color)}>
                {priorityCfg.label}
              </Badge>
            ) : null}
          </div>
        </TableCell>
      )}

      {/* Start Date */}
      {isVisible('start_date') && (
        <TableCell className="p-0 border-r text-center" style={{ width: columnWidths['start_date'] || 120 }}>
          {isEditing ? (
            <Input
              type="date"
              value={editFormData.start_date?.split('T')[0] || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleEditFieldChange('start_date', e.target.value)}
              className="h-7 text-[10px] border-none text-center bg-transparent"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-8" onClick={() => startEditing(activity)}>
              <span className="text-[10px] font-medium leading-tight">
                {activity.start_date ? format(new Date(activity.start_date), 'dd.MM.yyyy', { locale: az }) : '-'}
              </span>
            </div>
          )}
        </TableCell>
      )}

      {/* End Date */}
      {isVisible('end_date') && (
        <TableCell
          className={cn(
            'p-0 border-r text-center transition-colors',
            !isEditing && getDeadlineStatus(activity.end_date, activity.status) === 'overdue' && 'bg-destructive/5',
            !isEditing && getDeadlineStatus(activity.end_date, activity.status) === 'near' && 'bg-warning/5',
          )}
          style={{ width: columnWidths['end_date'] || 120 }}
        >
          {isEditing ? (
            <Input
              type="date"
              value={editFormData.end_date?.split('T')[0] || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleEditFieldChange('end_date', e.target.value)}
              className="h-7 text-[10px] border-none text-center bg-transparent"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-8 cursor-pointer" onClick={() => startEditing(activity)}>
              <span className={cn(
                'text-[10px] font-medium leading-tight',
                getDeadlineStatus(activity.end_date, activity.status) === 'overdue' && 'text-destructive',
                getDeadlineStatus(activity.end_date, activity.status) === 'near' && 'text-warning',
              )}>
                {activity.end_date ? format(new Date(activity.end_date), 'dd.MM.yyyy', { locale: az }) : '-'}
              </span>
            </div>
          )}
        </TableCell>
      )}

      {/* Duration */}
      {isVisible('duration') && (
        <TableCell
          className="text-center text-[11px] font-medium text-muted-foreground border-r"
          style={{ width: columnWidths['duration'] || 80 }}
          onClick={() => startEditing(activity)}
        >
          {(() => {
            if (!activity.start_date || !activity.end_date) return '-';
            const diff = Math.ceil(
              (new Date(activity.end_date).getTime() - new Date(activity.start_date).getTime()) / (1000 * 60 * 60 * 24),
            ) + 1;
            return `${diff} gün`;
          })()}
        </TableCell>
      )}

      {/* Budget */}
      {isVisible('budget') && (
        <TableCell
          className="text-center font-medium text-success text-[11px] border-r"
          style={{ width: columnWidths['budget'] || 100 }}
          onClick={() => startEditing(activity)}
        >
          {activity.budget ? `${Number(activity.budget).toLocaleString()} ₼` : '-'}
        </TableCell>
      )}

      {/* Expected Outcome */}
      {isVisible('expected_outcome') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['expected_outcome'] || 180 }} onClick={() => startEditing(activity)}>
          <div className="line-clamp-1">{activity.expected_outcome || '-'}</div>
        </TableCell>
      )}

      {/* KPI Metrics */}
      {isVisible('kpi_metrics') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['kpi_metrics'] || 150 }} onClick={() => startEditing(activity)}>
          <div className="line-clamp-1">{activity.kpi_metrics || '-'}</div>
        </TableCell>
      )}

      {/* Risks */}
      {isVisible('risks') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-destructive/70 italic border-r" style={{ width: columnWidths['risks'] || 150 }} onClick={() => startEditing(activity)}>
          <div className="line-clamp-1">{activity.risks || '-'}</div>
        </TableCell>
      )}

      {/* Dependency */}
      {isVisible('dependency') && (
        <TableCell className="text-center text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['dependency'] || 100 }} onClick={() => startEditing(activity)}>
          {activity.parent_id || '-'}
        </TableCell>
      )}

      {/* Location / Platform */}
      {isVisible('location_platform') && (
        <TableCell className="text-center text-[11px] font-medium border-r" style={{ width: columnWidths['location_platform'] || 160 }} onClick={() => startEditing(activity)}>
          {activity.location_platform || '-'}
        </TableCell>
      )}

      {/* Monitoring Mechanism */}
      {isVisible('monitoring_mechanism') && (
        <TableCell className="text-center text-[11px] border-r" style={{ width: columnWidths['monitoring_mechanism'] || 200 }} onClick={() => startEditing(activity)}>
          {activity.monitoring_mechanism || '-'}
        </TableCell>
      )}

      {/* Description */}
      {isVisible('description') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['description'] || 300 }} onClick={() => startEditing(activity)}>
          <div className="line-clamp-1">{activity.description || '-'}</div>
        </TableCell>
      )}

      {/* Notes */}
      {isVisible('notes') && (
        <TableCell className="text-left py-1 px-4 text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['notes'] || 300 }} onClick={() => startEditing(activity)}>
          <div className="line-clamp-1">{activity.notes || '-'}</div>
        </TableCell>
      )}

      {/* Actions — sticky right */}
      <TableCell
        className="sticky right-0 z-20 bg-card border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] py-0"
        style={{ width: 80, minWidth: 80, maxWidth: 80 }}
      >
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-success"
                onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                disabled={isSubmitting}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground"
                onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <div className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-colors cursor-grab">
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}
          {canEdit && !editingId && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});
