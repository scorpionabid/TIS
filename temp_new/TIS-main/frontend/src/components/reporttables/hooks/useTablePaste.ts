import React, { useCallback } from 'react';
import { toast } from 'sonner';
import type { ReportTableRow, ReportTableColumn } from '@/types/reportTable';
import { parseTSV } from '@/utils/tsvParser';

interface UseTablePasteParams {
  rows: ReportTableRow[];
  maxRows: number;
  columns: ReportTableColumn[];
  onChange: (rows: ReportTableRow[]) => void;
  createEmptyRow: () => ReportTableRow;
}

export function useTablePaste({
  rows,
  maxRows,
  columns,
  onChange,
  createEmptyRow,
}: UseTablePasteParams) {
  const handleCellPaste = useCallback((
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIdx: number,
    startColIdx: number
  ) => {
    const text = e.clipboardData.getData('text/plain');

    if (!text.includes('\t') && !text.includes('\n')) return;

    e.preventDefault();
    const pastedData = parseTSV(text);
    if (pastedData.length === 0) return;

    const current = rows.length > 0 ? rows : [createEmptyRow()];
    const newRows = [...current];

    pastedData.forEach((pastedRow, ri) => {
      const targetRow = startRowIdx + ri;
      if (targetRow >= maxRows) return;
      while (newRows.length <= targetRow) newRows.push(createEmptyRow());
      pastedRow.forEach((cell, ci) => {
        const targetCol = startColIdx + ci;
        if (targetCol < columns.length) {
          newRows[targetRow] = { ...newRows[targetRow], [columns[targetCol].key]: cell.trim() };
        }
      });
    });

    onChange(newRows);
    toast.info(`${pastedData.length} sətir yapışdırıldı.`);
  }, [rows, maxRows, columns, onChange, createEmptyRow]);

  return { handleCellPaste };
}
