/**
 * useColumnManagement Hook
 * Manages column CRUD operations and reordering
 */

import { useCallback, useEffect, useState } from 'react';
import type { ReportTableColumn } from '@/types/reportTable';
import type { UseColumnManagementReturn } from '../types';

export function useColumnManagement(
  columns: ReportTableColumn[],
  setColumns: (columns: ReportTableColumn[]) => void
): UseColumnManagementReturn {

  const [localColumns, setLocalColumns] = useState<ReportTableColumn[]>(columns);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  const addColumn = useCallback((): void => {
    const idx = localColumns.length + 1;
    const newColumn: ReportTableColumn = {
      key: `col_${idx}`,
      label: '',
      type: 'text',
    };
    setLocalColumns((prev) => {
      const next = [...prev, newColumn];
      setColumns(next);
      return next;
    });
  }, [localColumns.length, setColumns]);

  const removeColumn = useCallback((index: number): void => {
    setLocalColumns((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setColumns(next);
      return next;
    });
  }, [setColumns]);

  const updateColumn = useCallback((
    index: number,
    field: keyof ReportTableColumn,
    value: unknown
  ): void => {
    setLocalColumns((prev) => {
      const next = prev.map((col, i) => (i === index ? { ...col, [field]: value } : col));
      setColumns(next);
      return next;
    });
  }, [setColumns]);

  const reorderColumns = useCallback((oldIndex: number, newIndex: number): void => {
    setLocalColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      setColumns(next);
      return next;
    });
  }, [setColumns]);

  const importColumns = useCallback((newColumns: ReportTableColumn[]): void => {
    const cloned = newColumns.map((c) => ({ ...c }));
    setLocalColumns(cloned);
    setColumns(cloned);
  }, [setColumns]);

  const validateColumns = useCallback(() => {
    const errors: string[] = [];
    const columnErrors: Record<number, string[]> = {};

    if (localColumns.length === 0) {
      errors.push('Ən azı bir sütun əlavə edilməlidir');
    }

    localColumns.forEach((col, idx) => {
      const colErrors: string[] = [];

      if (!col.key.trim()) {
        colErrors.push('Açar ad tələb olunur');
      } else if (!/^[a-z0-9_]+$/.test(col.key)) {
        colErrors.push('Açar ad yalnız kiçik hərflər, rəqəmlər və _ ola bilər');
      }

      if (!col.label.trim()) {
        colErrors.push('Etiket tələb olunur');
      }

      if (col.type === 'select' && (!col.options || col.options.length === 0)) {
        colErrors.push('Seçim tipi üçün variantlar tələb olunur');
      }

      if (col.type === 'calculated' && (!col.formula || !col.formula.trim())) {
        colErrors.push('Hesablama tipi üçün formula tələb olunur');
      }

      if (colErrors.length > 0) {
        columnErrors[idx] = colErrors;
      }
    });

    if (Object.keys(columnErrors).length > 0) {
      errors.push(`${Object.keys(columnErrors).length} sütunda xətalar var`);
    }

    return {
      valid: errors.length === 0 && Object.keys(columnErrors).length === 0,
      errors,
      columnErrors,
    };
  }, [localColumns]);

  return {
    columns: localColumns,
    addColumn,
    removeColumn,
    updateColumn,
    reorderColumns,
    importColumns,
    validateColumns,
  };
}
