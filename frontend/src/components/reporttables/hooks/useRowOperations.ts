import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { ReportTableRow, ReportTableColumn } from '@/types/reportTable';

interface UseRowOperationsParams {
  rows: ReportTableRow[];
  maxRows: number;
  columns: ReportTableColumn[];
  onChange: (rows: ReportTableRow[]) => void;
  rowErrors: Record<number, Record<string, string>>;
  setRowErrors: React.Dispatch<React.SetStateAction<Record<number, Record<string, string>>>>;
  createEmptyRow: () => ReportTableRow;
}

export function useRowOperations({
  rows,
  maxRows,
  onChange,
  rowErrors,
  setRowErrors,
  createEmptyRow,
}: UseRowOperationsParams) {
  const addRowRef = useRef<() => void>();

  const handleAddRow = useCallback(() => {
    const current = rows.length > 0 ? rows : [createEmptyRow()];
    if (current.length >= maxRows) {
      toast.warning(`Maksimum ${maxRows} sətir əlavə edilə bilər.`);
      return;
    }
    onChange([...current, createEmptyRow()]);
  }, [rows, maxRows, onChange, createEmptyRow]);

  useEffect(() => {
    addRowRef.current = handleAddRow;
  }, [handleAddRow]);

  const handleRemoveRow = useCallback((idx: number) => {
    const current = rows.length > 0 ? rows : [createEmptyRow()];
    if (current.length <= 1) return;
    onChange(current.filter((_, i) => i !== idx));
    setRowErrors((prev) => {
      const updated: Record<number, Record<string, string>> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < idx) updated[ki] = v;
        else if (ki > idx) updated[ki - 1] = v;
      });
      return updated;
    });
  }, [rows, onChange, createEmptyRow, setRowErrors]);

  const handleDuplicateRow = useCallback((idx: number) => {
    const current = rows.length > 0 ? rows : [createEmptyRow()];
    if (current.length >= maxRows) {
      toast.warning(`Maksimum ${maxRows} sətir əlavə edilə bilər.`);
      return;
    }
    const copy = { ...current[idx] };
    const newRows = [
      ...current.slice(0, idx + 1),
      copy,
      ...current.slice(idx + 1),
    ];
    onChange(newRows);
  }, [rows, maxRows, onChange, createEmptyRow]);

  return { handleAddRow, handleRemoveRow, handleDuplicateRow, addRowRef };
}
