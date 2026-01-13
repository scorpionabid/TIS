/**
 * ExcelTaskTable Component
 *
 * Main Excel-like table container for tasks with inline editing
 */

import { Task } from '@/services/tasks';
import { SortDirection, SortField } from '@/hooks/tasks/useTasksData';
import { excelColumns } from './columns';
import { useInlineEdit } from './hooks/useInlineEdit';
import { ExcelTaskRow } from './ExcelTaskRow';
import { ExcelCreateRow } from './ExcelCreateRow';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExcelTaskTableProps {
  tasks: Task[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onCreateTask: () => void;
  canEditTaskItem: (task: Task) => boolean;
  canDeleteTaskItem: (task: Task) => boolean;
  showCreateButton: boolean;
  page: number;
  perPage: number;
}

export function ExcelTaskTable({
  tasks,
  sortField,
  sortDirection,
  onSort,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onCreateTask,
  canEditTaskItem,
  canDeleteTaskItem,
  showCreateButton,
  page,
  perPage,
}: ExcelTaskTableProps) {
  const editContext = useInlineEdit();

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

  return (
    <div className="rounded-md border bg-background overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-muted/50">
          <tr className="border-b">
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
              />
            ))
          )}
          {showCreateButton && (
            <ExcelCreateRow
              onCreateClick={onCreateTask}
              colSpan={excelColumns.length}
            />
          )}
        </tbody>
      </table>
    </div>
  );
}
