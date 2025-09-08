import React from 'react';
import { DataTableVirtualized } from './DataTableVirtualized';

// Re-export types for backward compatibility
export type { Column } from './DataTableVirtualized';

export interface DataTableProps<T> {
  data: T[];
  columns: import('./DataTableVirtualized').Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  selectable?: boolean;
  onRowSelect?: (selectedRows: T[]) => void;
  onRowEdit?: (row: T) => void;
  onRowDelete?: (row: T) => void;
  onBulkDelete?: (rows: T[]) => void;
  onExport?: () => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

// Backward compatible wrapper that automatically uses virtualization when needed
export function DataTable<T extends { id: string | number }>(props: DataTableProps<T>) {
  return <DataTableVirtualized {...props} />;
}