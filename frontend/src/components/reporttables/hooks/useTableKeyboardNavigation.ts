import React, { useCallback } from 'react';
import type { ReportTableRow, ReportTableColumn } from '@/types/reportTable';

interface UseTableKeyboardNavigationParams {
  columns: ReportTableColumn[];
  displayRowsLength: number;
  maxRows: number;
  focusCell: (rowIdx: number, colIdx: number) => void;
  handleCellChange: (rowIdx: number, colKey: string, value: string) => void;
  addRowRef: React.MutableRefObject<(() => void) | undefined>;
  rows: ReportTableRow[];
  createEmptyRow: () => ReportTableRow;
}

export function useTableKeyboardNavigation({
  columns,
  displayRowsLength,
  maxRows,
  focusCell,
  handleCellChange,
  addRowRef,
  rows,
  createEmptyRow,
}: UseTableKeyboardNavigationParams) {
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    const totalRows = displayRowsLength;
    const totalCols = columns.length;

    switch (e.key) {
      // Tab is handled by a native capture-phase listener in EditableTable
      // to bypass Radix UI's Sheet/Dialog focus trap.

      case 'Enter':
        e.preventDefault();
        if (rowIdx + 1 < totalRows) {
          focusCell(rowIdx + 1, colIdx);
        } else if (totalRows < maxRows) {
          addRowRef.current?.();
          setTimeout(() => focusCell(rowIdx + 1, colIdx), 0);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (rowIdx > 0) {
          focusCell(rowIdx - 1, colIdx);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (rowIdx + 1 < totalRows) {
          focusCell(rowIdx + 1, colIdx);
        } else if (totalRows < maxRows) {
          addRowRef.current?.();
          setTimeout(() => focusCell(rowIdx + 1, colIdx), 0);
        }
        break;

      case 'ArrowLeft':
        if ((e.target as HTMLInputElement).selectionStart === 0) {
          e.preventDefault();
          if (colIdx > 0) {
            focusCell(rowIdx, colIdx - 1);
          }
        }
        break;

      case 'ArrowRight': {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          if (colIdx + 1 < totalCols) {
            focusCell(rowIdx, colIdx + 1);
          }
        }
        break;
      }

      case 'Home':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          focusCell(0, 0);
        } else {
          focusCell(rowIdx, 0);
        }
        break;

      case 'End':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          focusCell(totalRows - 1, totalCols - 1);
        } else {
          focusCell(rowIdx, totalCols - 1);
        }
        break;

      case 'PageUp': {
        e.preventDefault();
        const upRows = Math.min(5, rowIdx);
        if (upRows > 0) {
          focusCell(rowIdx - upRows, colIdx);
        }
        break;
      }

      case 'PageDown': {
        e.preventDefault();
        const downRows = Math.min(5, totalRows - rowIdx - 1);
        if (downRows > 0) {
          focusCell(rowIdx + downRows, colIdx);
        } else if (totalRows < maxRows) {
          addRowRef.current?.();
          setTimeout(() => focusCell(rowIdx + 1, colIdx), 0);
        }
        break;
      }

      case 'Escape':
        e.preventDefault();
        (e.target as HTMLInputElement).blur();
        break;

      case 'Delete':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleCellChange(rowIdx, columns[colIdx].key, '');
        }
        break;

      case 'F2':
        e.preventDefault();
        (e.target as HTMLInputElement).select();
        break;

      case 's':
      case 'S':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        break;

      case 'd':
      case 'D':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (rowIdx > 0) {
            const fillCol = columns[colIdx];
            if (fillCol && fillCol.type !== 'calculated') {
              const currentRows = rows.length > 0 ? rows : [createEmptyRow()];
              const valueAbove = currentRows[rowIdx - 1]?.[fillCol.key];
              if (valueAbove !== undefined && valueAbove !== '') {
                handleCellChange(rowIdx, fillCol.key, String(valueAbove));
              }
            }
          }
        }
        break;
    }
  }, [columns, displayRowsLength, maxRows, focusCell, handleCellChange, addRowRef, rows, createEmptyRow]);

  return { handleKeyDown };
}
