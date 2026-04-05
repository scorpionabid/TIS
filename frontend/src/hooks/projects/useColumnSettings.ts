import { useState, useEffect } from 'react';

export type ProjectColumn = 
  | 'name' 
  | 'employee' 
  | 'status' 
  | 'priority' 
  | 'date' 
  | 'hours' 
  | 'category' 
  | 'goal_percentage'
  | 'goal_target';

interface ColumnSetting {
  id: ProjectColumn;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnSetting[] = [
  { id: 'name', label: 'Fəaliyyət Adı', visible: true },
  { id: 'employee', label: 'Məsul Şəxs', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Prioritet', visible: true },
  { id: 'date', label: 'Tarix Aralığı', visible: true },
  { id: 'hours', label: 'Müddət (s)', visible: false },
  { id: 'category', label: 'Kateqoriya', visible: false },
  { id: 'goal_percentage', label: 'Hədəf Payı (%)', visible: true },
  { id: 'goal_target', label: 'Hədəf', visible: true },
];

export function useColumnSettings(projectId: number) {
  const storageKey = `project_${projectId}_column_settings`;
  
  const [columns, setColumns] = useState<ColumnSetting[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_COLUMNS;
      }
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columns));
  }, [columns, storageKey]);

  const toggleColumn = (columnId: ProjectColumn) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const isVisible = (columnId: ProjectColumn) => {
    return columns.find(col => col.id === columnId)?.visible ?? false;
  };

  return {
    columns,
    toggleColumn,
    isVisible,
    resetToDefault: () => setColumns(DEFAULT_COLUMNS)
  };
}
