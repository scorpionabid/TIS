import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Trash2, Check, X } from 'lucide-react';
import type { ReportTableRow, ReportTableColumn, RowStatusMeta } from '@/types/reportTable';
import { RowStatusBadge } from './StatusBadge';
import { CellInput, isRowLocked } from './CellInput';

export interface MobileRowProps {
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
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => void;
  onRemove: (rowIdx: number) => void;
  onRowSubmit?: (rowIdx: number) => void;
  isRowSubmitting?: boolean;
  cellRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  getCellDisplayValue: (row: ReportTableRow, rowIdx: number, col: ReportTableColumn) => string;
}

export const MobileRow = React.memo(function MobileRow({
  row, rowIdx, columns, disabled, errors, canRemove, rowStatus, fixedRowLabel,
  onCellChange, onCellBlur, onKeyDown, onPaste, onRemove,
  onRowSubmit, isRowSubmitting, cellRefs, getCellDisplayValue,
}: MobileRowProps) {
  const locked = isRowLocked(rowStatus) || disabled;
  const rowHasContent = Object.values(row).some((v) => v !== null && v !== '');
  const canSubmitRow = !locked && !disabled && onRowSubmit && rowHasContent &&
    (!rowStatus || rowStatus.status === 'rejected' || rowStatus.status === 'draft');
  const canRemoveRow = canRemove && !isRowLocked(rowStatus);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const handleDeleteClick = useCallback(() => setConfirmingDelete(true), []);
  const handleDeleteConfirm = useCallback(() => {
    setConfirmingDelete(false);
    onRemove(rowIdx);
  }, [onRemove, rowIdx]);
  const handleDeleteCancel = useCallback(() => setConfirmingDelete(false), []);

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {fixedRowLabel ? (
            <span className="text-xs font-semibold text-gray-700">{fixedRowLabel}</span>
          ) : (
            <span className="text-xs font-semibold text-gray-500">Sətir {rowIdx + 1}</span>
          )}
          <RowStatusBadge status={rowStatus?.status} rejectionReason={rowStatus?.rejection_reason} size="sm" />
        </div>
        <div className="flex items-center gap-1">
          {canSubmitRow && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => onRowSubmit(rowIdx)}
              disabled={isRowSubmitting}
            >
              {isRowSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Təsdiq et
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
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  title="Bəli, sil"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteCancel}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                  title="Ləğv et"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                title="Sətiri sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>
      </div>
      {columns.map((col, colIdx) => {
        const err = errors[col.key];
        const displayValue = getCellDisplayValue(row, rowIdx, col);
        const isCalculated = col.type === 'calculated';

        return (
          <div key={col.key} className={isCalculated ? 'bg-slate-50 rounded p-1' : ''}>
            <label className="text-xs text-gray-500 mb-1 block">
              {col.required && <span className="text-red-500 mr-0.5">*</span>}
              {col.label}
              {col.type === 'number' && <span className="ml-1 text-gray-400">(rəqəm)</span>}
              {col.type === 'date' && <span className="ml-1 text-gray-400">(tarix)</span>}
              {isCalculated && <span className="ml-1 text-gray-400">(hesablama)</span>}
              {col.type === 'file' && <span className="ml-1 text-gray-400">(fayl)</span>}
              {col.type === 'signature' && <span className="ml-1 text-gray-400">(imza)</span>}
              {col.type === 'gps' && <span className="ml-1 text-gray-400">(GPS)</span>}
            </label>
            {isCalculated ? (
              <div className="h-9 px-3 py-2 text-sm text-slate-600 flex items-center border border-slate-200 rounded">
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
            {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
          </div>
        );
      })}
    </div>
  );
});
