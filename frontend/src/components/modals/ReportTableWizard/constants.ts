/**
 * ReportTableWizard Constants
 */

import type { ColumnType } from '@/types/reportTable';

export const COLUMN_TYPES: { value: ColumnType; label: string; icon?: string; description?: string }[] = [
  { value: 'text', label: 'Mətn', icon: 'Type', description: 'Sərbəst mətn daxiletmə' },
  { value: 'number', label: 'Rəqəm', icon: 'Hash', description: 'Rəqəmsal dəyərlər' },
  { value: 'date', label: 'Tarix', icon: 'Calendar', description: 'Tarix seçimi' },
  { value: 'select', label: 'Seçim', icon: 'List', description: 'Dropdown siyahı' },
  { value: 'boolean', label: 'Bəli/Xeyr', icon: 'CheckSquare', description: 'Checkbox' },
  { value: 'calculated', label: 'Hesablama', icon: 'Calculator', description: 'Excel formula ilə' },
  { value: 'file', label: 'Fayl', icon: 'FileUp', description: 'Fayl yükləmə' },
  { value: 'signature', label: 'İmza', icon: 'PenTool', description: 'Elektron imza' },
  { value: 'gps', label: 'GPS', icon: 'MapPin', description: 'GPS koordinat' },
];

export const MAX_ROWS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 100, 200];

export const DEFAULT_FORM_DATA = {
  title: '',
  description: '',
  notes: '',
  columns: [],
  max_rows: 50,
  target_institutions: [],
  deadline: '',
};
