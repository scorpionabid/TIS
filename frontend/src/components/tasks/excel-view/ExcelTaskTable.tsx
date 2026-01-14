/**
 * ExcelTaskTable Component
 *
 * Main Excel-like table container for tasks with inline editing
 */

import { useState, useCallback } from 'react';
import { Task } from '@/services/tasks';
import { SortDirection, SortField } from '@/hooks/tasks/useTasksData';
import { excelColumns, getColumnIndex } from './columns';
import { useInlineEdit } from './hooks/useInlineEdit';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useBulkEdit } from './hooks/useBulkEdit';
import { ExcelTaskRow } from './ExcelTaskRow';
import { ExcelCreateRow } from './ExcelCreateRow';
import { BulkEditToolbar } from './BulkEditToolbar';
import { CellPosition, ColumnId } from './types';
import { ArrowUp, ArrowDown, ArrowUpDown, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ExcelTaskTableProps {
  tasks: Task[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  canEditTaskItem: (task: Task) => boolean;
  canDeleteTaskItem: (task: Task) => boolean;
  showCreateButton: boolean;
  page: number;
  perPage: number;
  availableUsers?: Array<{ id: number; name: string; email?: string; role?: string; role_display?: string }>;
  onRefresh?: () => Promise<void>;
  onTaskCreated: () => Promise<void>;
  originScope: 'region' | 'sector' | null;
}

export function ExcelTaskTable({
  tasks,
  sortField,
  sortDirection,
  onSort,
  onViewTask,
  onEditTask,
  onDeleteTask,
  canEditTaskItem,
  canDeleteTaskItem,
  showCreateButton,
  page,
  perPage,
  availableUsers = [],
  onRefresh,
  onTaskCreated,
  originScope,
}: ExcelTaskTableProps) {
  const { toast } = useToast();
  const editContext = useInlineEdit();
  const [currentCell, setCurrentCell] = useState<CellPosition | null>(null);

  // Bulk edit functionality
  const bulkEditContext = useBulkEdit({ tasks, onRefresh });

  // Handle cell navigation
  const handleNavigate = useCallback((position: CellPosition) => {
    setCurrentCell(position);
    // Focus the cell element if possible
    const cellElement = document.querySelector(
      `[data-row="${position.rowIndex}"][data-col="${position.columnIndex}"]`
    ) as HTMLElement;
    cellElement?.focus();
  }, []);

  // Handle starting edit from keyboard
  const handleStartEdit = useCallback(
    (position: CellPosition) => {
      if (!currentCell || !tasks[position.rowIndex]) return;

      const task = tasks[position.rowIndex];
      const editableColumns = excelColumns.filter((col) => col.editable);
      const column = editableColumns.find((col) => getColumnIndex(col.id) === position.columnIndex);

      if (column && canEditTaskItem(task)) {
        const currentValue = (task as any)[column.id];
        editContext.startEdit(task.id, column.id as ColumnId, currentValue);
      }
    },
    [currentCell, tasks, canEditTaskItem, editContext]
  );

  // Setup keyboard navigation
  useKeyboardNavigation({
    totalRows: tasks.length,
    isEditing: editContext.editingCell !== null,
    currentCell,
    onNavigate: handleNavigate,
    onStartEdit: handleStartEdit,
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  // Calculate row numbers based on pagination
  const startRowNumber = (page - 1) * perPage + 1;

  // Sortable columns mapping
  const sortableColumnMap: Record<string, SortField> = {
    title: 'title',
    source: 'title', // No direct sort for source, fallback to title
    priority: 'priority',
    status: 'status',
    started_at: 'deadline', // Map to deadline for now
    deadline: 'deadline',
    progress: 'title', // No direct sort for progress
  };

  // Handle bulk update with toast notifications
  const handleBulkUpdate = useCallback(
    async (data: any) => {
      try {
        await bulkEditContext.bulkUpdate(data);
        toast({
          title: 'Uğurla yeniləndi',
          description: `${bulkEditContext.selectedCount} tapşırıq yeniləndi.`,
        });
      } catch (error) {
        console.error('[ExcelTaskTable] Bulk update failed', error);
        toast({
          title: 'Xəta baş verdi',
          description: error instanceof Error ? error.message : 'Toplu yeniləmə zamanı xəta baş verdi.',
          variant: 'destructive',
        });
      }
    },
    [bulkEditContext, toast]
  );

  return (
    <div className="rounded-md border bg-background">
      {/* Bulk Edit Toolbar */}
      {bulkEditContext.isSelectionMode && (
        <BulkEditToolbar
          selectedCount={bulkEditContext.selectedCount}
          isUpdating={bulkEditContext.isBulkUpdating}
          onBulkUpdate={handleBulkUpdate}
          onClearSelection={bulkEditContext.clearSelection}
          onExitSelectionMode={bulkEditContext.exitSelectionMode}
        />
      )}

      {/* Action Bar */}
      {!bulkEditContext.isSelectionMode && (
        <div className="flex items-center justify-between p-2 border-b bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={bulkEditContext.enterSelectionMode}
            className="gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Toplu Seçim
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-muted/50">
          <tr className="border-b">
            {/* Select All Checkbox */}
            {bulkEditContext.isSelectionMode && (
              <th className="px-2 py-3 text-center w-[50px]">
                <Checkbox
                  checked={bulkEditContext.selectedCount === tasks.length && tasks.length > 0}
                  onCheckedChange={bulkEditContext.toggleAll}
                  aria-label="Hamısını seç"
                />
              </th>
            )}
            {excelColumns.map((column) => {
              const sortFieldForColumn = sortableColumnMap[column.id];
              const isSortable = column.sortable && sortFieldForColumn;

              return (
                <th
                  key={column.id}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider',
                    column.width,
                    isSortable && 'cursor-pointer hover:bg-muted/70 transition-colors group'
                  )}
                  onClick={() => isSortable && onSort(sortFieldForColumn)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {isSortable && getSortIcon(sortFieldForColumn)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={excelColumns.length} className="px-4 py-12 text-center text-muted-foreground">
                Heç bir tapşırıq tapılmadı
              </td>
            </tr>
          ) : (
            tasks.map((task, index) => (
              <ExcelTaskRow
                key={task.id}
                task={task}
                rowNumber={startRowNumber + index}
                editContext={editContext}
                onView={onViewTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                canEdit={canEditTaskItem(task)}
                canDelete={canDeleteTaskItem(task)}
                availableUsers={availableUsers}
                availableDepartments={availableDepartments}
                isSelectionMode={bulkEditContext.isSelectionMode}
                isSelected={bulkEditContext.selectedIds.has(task.id)}
                onToggleSelection={bulkEditContext.toggleSelection}
              />
            ))
          )}
          {!bulkEditContext.isSelectionMode && (
            <ExcelCreateRow
              availableUsers={availableUsers}
              onTaskCreated={onTaskCreated}
              originScope={originScope}
              showCreateButton={showCreateButton}
            />
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
