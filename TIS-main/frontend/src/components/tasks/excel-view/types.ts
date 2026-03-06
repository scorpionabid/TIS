/**
 * Excel View Types
 *
 * Type definitions for the Excel-like task table interface
 */

import { Task, UpdateTaskData } from '@/services/tasks';

/**
 * Column identifiers for the Excel table
 */
export type ColumnId =
  | 'row_number'
  | 'title'
  | 'source'
  | 'department'
  | 'priority'
  | 'status'
  | 'assignees'
  | 'started_at'
  | 'deadline'
  | 'deadline_time'
  | 'deadline_progress'
  | 'progress'
  | 'actions';

/**
 * Column configuration
 */
export interface ExcelColumn {
  id: ColumnId;
  label: string;
  width: string;
  sortable: boolean;
  editable: boolean;
  type: 'text' | 'dropdown' | 'date' | 'time' | 'number' | 'multiselect' | 'textarea' | 'readonly';
}

/**
 * Cell editing state
 */
export interface CellEditState {
  taskId: number;
  columnId: ColumnId;
  value: any;
  originalValue: any;
}

/**
 * Inline edit context
 */
export interface InlineEditContext {
  editingCell: CellEditState | null;
  startEdit: (taskId: number, columnId: ColumnId, value: any) => void;
  saveEdit: (taskId: number, data: Partial<UpdateTaskData>) => Promise<void>;
  cancelEdit: () => void;
  isEditing: (taskId: number, columnId: ColumnId) => boolean;
  isSaving: boolean;
}

/**
 * Keyboard navigation directions
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'enter' | 'tab';

/**
 * Cell position for navigation
 */
export interface CellPosition {
  rowIndex: number;
  columnIndex: number;
}

/**
 * New task draft for inline creation
 */
export interface NewTaskDraft {
  title: string;
  source?: Task['source'];
  department_id?: number;
  priority: Task['priority'];
  status: Task['status'];
  assigned_user_ids: number[];
  description?: string;
  started_at?: string;
  deadline?: string;
  deadline_time?: string;
  progress: number;
}

/**
 * Excel table configuration
 */
export interface ExcelTableConfig {
  columns: ExcelColumn[];
  showCreateRow: boolean;
  enableKeyboardNav: boolean;
  autoSaveDelay: number; // milliseconds
}
