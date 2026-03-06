/**
 * Virtualized Table component for Report Tables
 * Uses react-window for efficient rendering of large datasets
 */

import React, { memo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { ReportTableRow, ReportTableColumn, RowStatuses, RowStatusMeta } from '@/types/reportTable';
import type { TableCellProps } from './EditableTable';
import { colMinWidth, isRowLocked } from '@/utils/tableValidation';
import { RowStatusBadge } from './StatusBadge';

interface VirtualizedTableBodyProps {
  rows: ReportTableRow[];
  columns: ReportTableColumn[];
  rowStatuses: RowStatuses;
  editingRowIndex: number | null;
  cellRefs: React.MutableRefObject<(HTMLInputElement | HTMLSelectElement | null)[][]>;
  isSubmitting: boolean;
  pendingSubmit: number | null;
  focusCell: { row: number; col: number } | null;
  isStableTable: boolean;
  onCellChange: (rowIndex: number, columnKey: string, value: string) => void;
  onNavigate: (row: number, col: number) => void;
  onStartEdit: (row: number) => void;
  onFinishEdit: () => void;
  onDeleteRow: (index: number) => void;
  onSubmitRow: (index: number) => void;
  renderCell: (props: TableCellProps) => React.ReactNode;
  listRef?: React.Ref<List>;
  containerHeight?: number;
  rowHeight?: number;
}

interface VirtualRowData {
  rows: ReportTableRow[];
  columns: ReportTableColumn[];
  rowStatuses: RowStatuses;
  editingRowIndex: number | null;
  cellRefs: React.MutableRefObject<(HTMLInputElement | HTMLSelectElement | null)[][]>;
  isSubmitting: boolean;
  pendingSubmit: number | null;
  focusCell: { row: number; col: number } | null;
  isStableTable: boolean;
  onCellChange: (rowIndex: number, columnKey: string, value: string) => void;
  onNavigate: (row: number, col: number) => void;
  onStartEdit: (row: number) => void;
  onFinishEdit: () => void;
  onDeleteRow: (index: number) => void;
  onSubmitRow: (index: number) => void;
  renderCell: (props: TableCellProps) => React.ReactNode;
}

const VirtualRow = memo(function VirtualRow({
  index,
  style,
  data,
}: ListChildComponentProps<VirtualRowData>) {
  const {
    rows,
    columns,
    rowStatuses,
    editingRowIndex,
    cellRefs,
    isSubmitting,
    pendingSubmit,
    focusCell,
    isStableTable,
    onCellChange,
    onNavigate,
    onStartEdit,
    onFinishEdit,
    onDeleteRow,
    onSubmitRow,
    renderCell,
  } = data;

  const row = rows[index];
  const meta = rowStatuses[index];
  const isLocked = isRowLocked(meta);
  const isEditing = editingRowIndex === index;
  const isPendingSubmit = pendingSubmit === index;

  // Calculate total width based on column min-widths
  const totalWidth = columns.reduce((acc, col) => {
    const minW = colMinWidth(col.type).match(/\d+/)?.[0];
    return acc + (parseInt(minW || '100', 10) + 16); // +16 for padding
  }, 200); // +200 for action buttons

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        minWidth: totalWidth,
      }}
      className="border-b border-gray-100 hover:bg-gray-50/50"
      data-testid={`table-row-${index}`}
    >
      {/* Row number */}
      <div className="w-12 px-2 py-2 text-xs text-gray-400 shrink-0 text-center">
        {index + 1}
      </div>

      {/* Row status badge */}
      <div className="w-28 px-2 py-2 shrink-0 flex items-center">
        <RowStatusBadge meta={meta} size="sm" />
      </div>

      {/* Cells */}
      {columns.map((col, colIndex) => (
        <div
          key={col.key}
          className={`px-2 py-1 shrink-0 ${colMinWidth(col.type)}`}
        >
          {renderCell({
            column: col,
            row,
            rowIndex: index,
            colIndex,
            isEditing,
            isLocked,
            isPendingSubmit,
            focusCell,
            onChange: (value) => onCellChange(index, col.key, value),
            onNavigate,
            onStartEdit,
            onFinishEdit,
            ref: (el) => {
              if (!cellRefs.current[index]) cellRefs.current[index] = [];
              cellRefs.current[index][colIndex] = el;
            },
          })}
        </div>
      ))}

      {/* Actions */}
      {!isStableTable && (
        <div className="px-2 py-2 w-32 shrink-0">
          <div className="flex items-center gap-1">
            {!isLocked && !isSubmitting && (
              <button
                onClick={() => onDeleteRow(index)}
                className="p-1 hover:bg-red-50 text-red-500 rounded"
                title="Sətri sil"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            )}
            {isPendingSubmit ? (
              <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            ) : meta?.status === 'submitted' ? (
              <span className="text-xs text-amber-600">Gözləyir</span>
            ) : meta?.status === 'approved' ? (
              <span className="text-xs text-emerald-600">Təsdiqləndi</span>
            ) : meta?.status === 'rejected' ? (
              <span className="text-xs text-red-600">Rədd edildi</span>
            ) : (
              <button
                onClick={() => onSubmitRow(index)}
                disabled={isSubmitting}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
              >
                Göndər
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Virtualized table body component
 * Renders only visible rows for performance with large datasets
 */
export const VirtualizedTableBody = memo(function VirtualizedTableBody({
  rows,
  columns,
  rowStatuses,
  editingRowIndex,
  cellRefs,
  isSubmitting,
  pendingSubmit,
  focusCell,
  isStableTable,
  onCellChange,
  onNavigate,
  onStartEdit,
  onFinishEdit,
  onDeleteRow,
  onSubmitRow,
  renderCell,
  listRef,
  containerHeight = 600,
  rowHeight = 44,
}: VirtualizedTableBodyProps) {
  const itemData: VirtualRowData = {
    rows,
    columns,
    rowStatuses,
    editingRowIndex,
    cellRefs,
    isSubmitting,
    pendingSubmit,
    focusCell,
    isStableTable,
    onCellChange,
    onNavigate,
    onStartEdit,
    onFinishEdit,
    onDeleteRow,
    onSubmitRow,
    renderCell,
  };

  return (
    <List
      ref={listRef}
      height={containerHeight}
      itemCount={rows.length}
      itemSize={rowHeight}
      itemData={itemData}
      width="100%"
      overscanCount={5}
    >
      {VirtualRow}
    </List>
  );
});

/**
 * Hook to determine if virtualization should be used
 * Based on row count threshold
 */
export function useVirtualizationThreshold(
  rowCount: number,
  threshold = 100
): boolean {
  return rowCount >= threshold;
}
