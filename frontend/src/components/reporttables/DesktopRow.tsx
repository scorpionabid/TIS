import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Layers, Trash2, Check, X, AlertCircle } from 'lucide-react';
import type { ReportTableRow, ReportTableColumn, RowStatusMeta } from '@/types/reportTable';
import { RowStatusBadge } from './StatusBadge';
import { colMinWidth } from '@/utils/tableValidation';
import { CellInput, isRowLocked } from './CellInput';

export interface DesktopRowProps {
  row: ReportTableRow;
  rowIdx: number;
  columns: ReportTableColumn[];
  disabled: boolean;
  errors: Record<string, string>;
  canRemove: boolean;
  rowStatus: RowStatusMeta | undefined;
  fixedRowLabel?: string | null;
  onCellChange: (rowIdx: number, colKey: string, value: string) => void;
  onCellBlur: (rowIdx: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, rowIdx: number, colIdx: number) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => void;
  onRemove: (rowIdx: number) => void;
  onDuplicate: (rowIdx: number) => void;
  onRowSubmit?: (rowIdx: number) => void;
  isRowSubmitting?: boolean;
  cellRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  getCellDisplayValue: (row: ReportTableRow, rowIdx: number, col: ReportTableColumn) => string;
  freezeFirstCol: boolean;
}

export const DesktopRow = React.memo(function DesktopRow({
  row, rowIdx, columns, disabled, errors, canRemove, rowStatus, fixedRowLabel,
  onCellChange, onCellBlur, onKeyDown, onPaste, onRemove, onDuplicate,
  onRowSubmit, isRowSubmitting, cellRefs, getCellDisplayValue, freezeFirstCol,
}: DesktopRowProps) {
  const locked = isRowLocked(rowStatus) || disabled;
  const rowHasContent = Object.values(row).some((v) => v !== null && v !== '');
  const canSubmitRow = !locked && !disabled && onRowSubmit && rowHasContent &&
    (!rowStatus || rowStatus.status === 'rejected' || rowStatus.status === 'draft');
  const canRemoveRow = canRemove && !isRowLocked(rowStatus);

  // Inline two-step confirmation for row deletion
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const handleDeleteClick = useCallback(() => setConfirmingDelete(true), []);
  const handleDeleteConfirm = useCallback(() => {
    setConfirmingDelete(false);
    onRemove(rowIdx);
  }, [onRemove, rowIdx]);
  const handleDeleteCancel = useCallback(() => setConfirmingDelete(false), []);

  const statusColor = rowStatus?.status === 'approved'
    ? 'bg-emerald-50'
    : rowStatus?.status === 'submitted'
    ? 'bg-amber-50'
    : rowStatus?.status === 'rejected'
    ? 'bg-red-50/40'
    : '';

  const isRejectedWithReason = rowStatus?.status === 'rejected' && !!rowStatus?.rejection_reason;

  return (
    <>
      <tr className={`border-b border-gray-200 hover:bg-gray-50 ${statusColor}`}>
        <td className={`px-2 py-2 text-center text-gray-500${freezeFirstCol ? ' sticky left-0 z-20 bg-white' : ''}`}>
          {fixedRowLabel ? (
            <span className="text-xs font-medium text-gray-700">{fixedRowLabel}</span>
          ) : (
            <span className="text-gray-400">{rowIdx + 1}</span>
          )}
        </td>
        {columns.map((col, colIdx) => {
          const err = errors[col.key];
          const displayValue = getCellDisplayValue(row, rowIdx, col);
          const isCalculated = col.type === 'calculated';

          return (
            <td
              key={col.key}
              data-cell-pos={`${rowIdx}-${colIdx}`}
              className={[
                'px-1 py-1',
                freezeFirstCol && colIdx === 0 ? 'sticky left-10 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]' : '',
                freezeFirstCol && colIdx === 0 ? (isCalculated ? 'bg-slate-50' : 'bg-white') : (isCalculated ? 'bg-slate-50' : ''),
              ].filter(Boolean).join(' ')}>
              {isCalculated ? (
                <div className="h-9 px-3 py-2 text-sm text-slate-600 flex items-center">
                  <span className={displayValue.startsWith('#ERROR') ? 'text-red-500' : ''}>
                    {displayValue}
                  </span>
                </div>
              ) : (
                <CellInput
                  col={col}
                  value={String(row[col.key] ?? '')}
                  onChange={(v) => onCellChange(rowIdx, col.key, v)}
                  onBlur={() => onCellBlur(rowIdx)}
                  onKeyDown={(e) => onKeyDown(e, rowIdx, colIdx)}
                  onPaste={(e) => onPaste(e, rowIdx, colIdx)}
                  disabled={locked}
                  error={!!err}
                  inputRef={(el) => { cellRefs.current[`${rowIdx}-${colIdx}`] = el; }}
                />
              )}
              {err && <p className="text-xs text-red-500 mt-0.5 px-1">{err}</p>}
            </td>
          );
        })}
        <td className="px-2 py-2 text-center whitespace-nowrap">
          <div className="flex items-center gap-1 justify-center">
            <RowStatusBadge status={rowStatus?.status} rejectionReason={rowStatus?.rejection_reason} size="sm" />
            {canSubmitRow && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => onRowSubmit(rowIdx)}
                disabled={isRowSubmitting}
              >
                {isRowSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Təsdiq et
              </Button>
            )}
            {!locked && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDuplicate(rowIdx)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-blue-500"
                title="Kopyala"
              >
                <Layers className="h-4 w-4" />
              </Button>
            )}
            {!locked && canRemoveRow && (
              confirmingDelete ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteConfirm}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Bəli, sil"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteCancel}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    title="Ləğv et"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  title="Sətiri sil"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )
            )}
            {locked && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="h-8 w-8 p-0 text-gray-200"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Rejection reason — shown below the rejected row */}
      {isRejectedWithReason && (
        <tr className="bg-red-50/60 border-b border-red-100">
          <td colSpan={columns.length + 2} className="px-4 pb-2 pt-0">
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-100 border border-red-200 rounded px-3 py-1.5 mt-0.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold">Rədd səbəbi:</span>
              <span>{rowStatus!.rejection_reason}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

// Re-export for convenience
export { colMinWidth };
