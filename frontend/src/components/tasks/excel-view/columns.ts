/**
 * Excel Table Column Configuration
 *
 * Defines the 12 columns for the Excel-like task interface
 */

import { ExcelColumn } from './types';

export const excelColumns: ExcelColumn[] = [
  {
    id: 'row_number',
    label: '№',
    width: 'w-[60px]',
    sortable: false,
    editable: false,
    type: 'readonly',
  },
  {
    id: 'title',
    label: 'Tapşırıq Adı',
    width: 'w-[250px]',
    sortable: true,
    editable: true,
    type: 'text',
  },
  {
    id: 'source',
    label: 'Daxil olduğu yer',
    width: 'w-[140px]',
    sortable: true,
    editable: true,
    type: 'dropdown',
  },
  {
    id: 'priority',
    label: 'Prioritet',
    width: 'w-[120px]',
    sortable: true,
    editable: true,
    type: 'dropdown',
  },
  {
    id: 'status',
    label: 'Status',
    width: 'w-[130px]',
    sortable: true,
    editable: true,
    type: 'dropdown',
  },
  {
    id: 'assignees',
    label: 'Məsul Şəxs',
    width: 'w-[200px]',
    sortable: false,
    editable: true,
    type: 'multiselect',
  },
  // description column removed by user request
  // started_at is hidden from UI (set by backend)
  {
    id: 'deadline',
    label: 'Son Tarix',
    width: 'w-[140px]',
    sortable: true,
    editable: true,
    type: 'date',
  },
  {
    id: 'deadline_time',
    label: 'Son Saat',
    width: 'w-[110px]',
    sortable: false,
    editable: true,
    type: 'time',
  },
  {
    id: 'deadline_progress',
    label: 'Vaxt',
    width: 'w-[120px]',
    sortable: false,
    editable: false,
    type: 'readonly',
  },
  {
    id: 'progress',
    label: 'İrəliləyiş (%)',
    width: 'w-[140px]',
    sortable: true,
    editable: true,
    type: 'number',
  },
  {
    id: 'actions',
    label: 'Əməliyyat',
    width: 'w-[100px]',
    sortable: false,
    editable: false,
    type: 'readonly',
  },
];

/**
 * Get column by ID
 */
export function getColumnById(id: string): ExcelColumn | undefined {
  return excelColumns.find((col) => col.id === id);
}

/**
 * Get editable columns
 */
export function getEditableColumns(): ExcelColumn[] {
  return excelColumns.filter((col) => col.editable);
}

/**
 * Get column index by ID
 */
export function getColumnIndex(id: string): number {
  return excelColumns.findIndex((col) => col.id === id);
}
