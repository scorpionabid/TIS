import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Keyboard, Plus, AlertCircle, Sigma, Columns, HelpCircle, Filter, X as XIcon } from 'lucide-react';
import type { ReportTableRow, ReportTableColumn, RowStatuses } from '@/types/reportTable';
import { validateRow, hasValidationErrors, colMinWidth, colTypeLabel } from '@/utils/tableValidation';

import { DesktopRow } from './DesktopRow';
import { MobileRow } from './MobileRow';
import { useTableKeyboardNavigation } from './hooks/useTableKeyboardNavigation';
import { useCalculatedColumns } from './hooks/useCalculatedColumns';
import { useRowOperations } from './hooks/useRowOperations';
import { useTablePaste } from './hooks/useTablePaste';

// ─── EditableTable Component ──────────────────────────────────────────────────

interface EditableTableProps {
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  maxRows: number;
  onChange: (rows: ReportTableRow[]) => void;
  disabled: boolean;
  /** Hide keyboard shortcuts / excel navigation banner (parent can show via tooltip elsewhere) */
  hideKeyboardHelp?: boolean;
  /** Prevent structural changes (add/remove rows) while still allowing editable rows */
  lockStructure?: boolean;
  /** Fixed rows for stable tables - when set, rows are predefined and cannot be added/removed */
  fixedRows?: { id: string; label: string }[] | null;
  /** Callback replaces DOM querySelector anti-pattern */
  onValidationChange?: (hasErrors: boolean) => void;
  /** Per-row approval status from backend */
  rowStatuses?: RowStatuses;
  /** Called when user clicks "Təsdiq et" for a single row */
  onRowSubmit?: (rowIndex: number) => void;
  /** Whether a specific row's submit button is loading */
  isRowSubmitting?: (rowIndex: number) => boolean;
  /** Called after a row is removed, so parent can immediately persist */
  onRowRemoved?: () => void;
}

export const EditableTable = React.memo(function EditableTable({
  columns,
  rows,
  maxRows,
  onChange,
  disabled,
  hideKeyboardHelp,
  lockStructure,
  fixedRows,
  onValidationChange,
  rowStatuses,
  onRowSubmit,
  isRowSubmitting,
  onRowRemoved,
}: EditableTableProps) {
  const isStableTable = !!fixedRows && fixedRows.length > 0;
  const structureLocked = disabled || lockStructure || isStableTable;
  const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    onValidationChange?.(hasValidationErrors(rowErrors));
  }, [rowErrors, onValidationChange]);

  const createEmptyRow = useCallback((): ReportTableRow => {
    const row: ReportTableRow = {};
    columns.forEach((col) => { row[col.key] = ''; });
    return row;
  }, [columns]);

  const displayRows = rows.length > 0 ? rows : [createEmptyRow()];

  const focusCell = (rowIdx: number, colIdx: number) => {
    cellRefs.current[`${rowIdx}-${colIdx}`]?.focus();
  };

  const handleCellChange = useCallback((rowIdx: number, colKey: string, value: string) => {
    const current = rows.length > 0 ? rows : [createEmptyRow()];
    const newRows = current.map((r, i) =>
      i === rowIdx ? { ...r, [colKey]: value } : r
    );
    onChange(newRows);
    setRowErrors((prev) => {
      if (!prev[rowIdx]) return prev;
      const { [colKey]: _removed, ...rest } = prev[rowIdx];
      return { ...prev, [rowIdx]: rest };
    });
  }, [rows, onChange, createEmptyRow]);

  const handleCellBlur = useCallback((rowIdx: number) => {
    const current = rows.length > 0 ? rows : [createEmptyRow()];
    const errs = validateRow(current[rowIdx], columns);
    setRowErrors((prev) => ({ ...prev, [rowIdx]: errs }));
  }, [rows, columns, createEmptyRow]);

  // ─── Hooks ────────────────────────────────────────────────────────────────

  const { getCellDisplayValue, circularErrors } = useCalculatedColumns({ columns, displayRows });

  const { handleAddRow, handleRemoveRow, handleDuplicateRow, addRowRef } = useRowOperations({
    rows, maxRows, columns, onChange, rowErrors, setRowErrors, createEmptyRow, onRowRemoved,
  });

  const { handleCellPaste } = useTablePaste({ rows, maxRows, columns, onChange, createEmptyRow });

  const { handleKeyDown } = useTableKeyboardNavigation({
    columns,
    displayRowsLength: displayRows.length,
    maxRows,
    focusCell,
    handleCellChange,
    addRowRef,
    rows,
    createEmptyRow,
  });

  // ─── Error navigation ─────────────────────────────────────────────────────

  const navigateToFirstError = useCallback(() => {
    for (const [rowIdxStr, colErrors] of Object.entries(rowErrors)) {
      const colKeys = Object.keys(colErrors);
      if (colKeys.length > 0) {
        const rowIdx = Number(rowIdxStr);
        const colIdx = columns.findIndex((c) => c.key === colKeys[0]);
        if (colIdx >= 0) {
          const el = cellRefs.current[`${rowIdx}-${colIdx}`];
          if (el) {
            el.focus();
            el.scrollIntoView({ block: 'center' });
          }
        }
        return;
      }
    }
  }, [rowErrors, columns]);

  const errorCount = Object.values(rowErrors).reduce(
    (acc, errs) => acc + Object.keys(errs).length, 0
  );

  // ─── UI state ─────────────────────────────────────────────────────────────

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
  const [freezeFirstCol, setFreezeFirstCol] = useState(false);
  const [rowFilter, setRowFilter] = useState<'all' | 'rejected' | 'pending'>('all');

  const hasNumericCols = useMemo(
    () => columns.some((c) => c.type === 'number' || c.type === 'calculated'),
    [columns]
  );

  // Row status counts for filter chips
  const rowStatusCounts = useMemo(() => {
    let rejected = 0;
    let pending = 0;
    displayRows.forEach((_, idx) => {
      const st = rowStatuses?.[String(idx)]?.status;
      if (st === 'rejected') rejected++;
      if (st === 'submitted') pending++;
    });
    return { rejected, pending };
  }, [displayRows, rowStatuses]);

  // Visible rows (filter applied — original indices preserved)
  const visibleRows = useMemo(() => {
    return displayRows
      .map((row, idx) => ({ row, idx }))
      .filter(({ idx }) => {
        if (rowFilter === 'all') return true;
        const st = rowStatuses?.[String(idx)]?.status;
        if (rowFilter === 'rejected') return st === 'rejected';
        if (rowFilter === 'pending') return st === 'submitted';
        return true;
      });
  }, [displayRows, rowFilter, rowStatuses]);

  const columnTotals = useMemo(() => {
    if (!showTotals || displayRows.length <= 1) return {} as Record<string, number>;
    const totals: Record<string, number> = {};
    columns.forEach((col) => {
      if (col.type === 'number') {
        totals[col.key] = displayRows.reduce((acc, row) => {
          const val = parseFloat(String(row[col.key] ?? ''));
          return isNaN(val) ? acc : acc + val;
        }, 0);
      } else if (col.type === 'calculated') {
        let sum = 0;
        let hasValues = false;
        displayRows.forEach((row, rowIdx) => {
          const val = parseFloat(getCellDisplayValue(row, rowIdx, col));
          if (!isNaN(val)) { sum += val; hasValues = true; }
        });
        if (hasValues) totals[col.key] = sum;
      }
    });
    return totals;
  }, [columns, displayRows, showTotals, getCellDisplayValue]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Row filter chips — only shown when there are rejected/pending rows */}
      {rowStatuses && (rowStatusCounts.rejected > 0 || rowStatusCounts.pending > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Filter className="h-3.5 w-3.5" />
            Filtr:
          </span>
          <button
            onClick={() => setRowFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${rowFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Hamısı ({displayRows.length})
          </button>
          {rowStatusCounts.rejected > 0 && (
            <button
              onClick={() => setRowFilter(rowFilter === 'rejected' ? 'all' : 'rejected')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${rowFilter === 'rejected' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}
            >
              Rədd edilmiş ({rowStatusCounts.rejected})
            </button>
          )}
          {rowStatusCounts.pending > 0 && (
            <button
              onClick={() => setRowFilter(rowFilter === 'pending' ? 'all' : 'pending')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${rowFilter === 'pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
            >
              Gözləyən ({rowStatusCounts.pending})
            </button>
          )}
          {rowFilter !== 'all' && (
            <button
              onClick={() => setRowFilter('all')}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-gray-500 hover:text-gray-700"
            >
              <XIcon className="h-3 w-3" />
              Filtri sil
            </button>
          )}
        </div>
      )}

      {/* Keyboard shortcuts toggle */}
      {!hideKeyboardHelp && !disabled && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {showShortcuts ? 'Qısayolları gizlət' : 'Klaviatura qısayolları'}
          </button>
          <div className="flex items-center gap-3">
            {hasNumericCols && (
              <button
                onClick={() => setShowTotals(!showTotals)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${showTotals ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Sigma className="h-3.5 w-3.5" />
                {showTotals ? 'Cəmi gizlət' : 'Cəmi göstər'}
              </button>
            )}
            {columns.length > 3 && (
              <button
                onClick={() => setFreezeFirstCol(!freezeFirstCol)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${freezeFirstCol ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Columns className="h-3.5 w-3.5" />
                {freezeFirstCol ? 'Sütunu azad et' : 'Sütunu sabitle'}
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Keyboard className="h-3.5 w-3.5" />
              <span>Excel-kimi naviqasiya aktivdir</span>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts panel */}
      {!hideKeyboardHelp && showShortcuts && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
          <h4 className="font-semibold mb-2 text-slate-800">Klaviatura Qısayolları:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              ['↑↓←→', 'Xanalar arasında hərəkət'],
              ['Tab', 'Növbəti xanaya'],
              ['Shift+Tab', 'Əvvəlki xanaya'],
              ['Enter', 'Növbəti sətirə'],
              ['Home / End', 'Sətirin əvvəli/sonu'],
              ['Ctrl+Home', 'Cədvəlin əvvəlinə'],
              ['Ctrl+End', 'Cədvəlin sonuna'],
              ['PgUp / PgDn', '5 sətir yuxarı/aşağı'],
              ['F2', 'Redaktə rejimi (hamısını seç)'],
              ['Esc', 'Redaktədən çıx'],
              ['Ctrl+Del', 'Xananı təmizlə'],
              ['Ctrl+S', 'Yadda saxla'],
              ['Ctrl+D', 'Yuxarı xananı kopyala (Fill Down)'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">{key}</kbd>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {circularErrors.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">Dövri istinad xətası:</span>
            <ul className="mt-1 ml-4 list-disc">
              {circularErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {errorCount > 0 && (
        <button
          onClick={navigateToFirstError}
          className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full text-left hover:bg-red-100 transition-colors"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorCount} xanada xəta var — birinciyə keç →
        </button>
      )}

      {/* Desktop table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full border border-gray-200 text-sm rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className={`px-2 py-3 text-center border-b border-gray-200 w-10 text-gray-500${freezeFirstCol ? ' sticky left-0 z-20 bg-gray-50' : ''}`}>#</th>
              {columns.map((col, colIdx) => (
                <th
                  key={col.key}
                  className={[
                    'px-3 py-3 text-left border-b border-gray-200 font-medium text-gray-700',
                    colMinWidth(col.type),
                    freezeFirstCol && colIdx === 0 ? 'sticky left-10 z-10 bg-gray-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="flex items-center gap-1">
                    {col.required && <span className="text-red-500 text-xs">*</span>}
                    {col.label}
                    {colTypeLabel(col) && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        ({colTypeLabel(col)})
                      </span>
                    )}
                  </div>
                  {col.hint && (
                    <p className="text-xs font-normal text-gray-400 mt-0.5">{col.hint}</p>
                  )}
                </th>
              ))}
              <th className="px-2 py-3 text-center border-b border-gray-200 w-28" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ row, idx: rowIdx }) => (
              <DesktopRow
                key={rowIdx}
                row={row}
                rowIdx={rowIdx}
                columns={columns}
                disabled={disabled}
                errors={rowErrors[rowIdx] ?? {}}
                canRemove={!isStableTable && displayRows.length > 1}
                rowStatus={rowStatuses?.[String(rowIdx)]}
                fixedRowLabel={fixedRows?.[rowIdx]?.label ?? null}
                onCellChange={handleCellChange}
                onCellBlur={handleCellBlur}
                onKeyDown={handleKeyDown}
                onPaste={handleCellPaste}
                onRemove={handleRemoveRow}
                onDuplicate={handleDuplicateRow}
                onRowSubmit={onRowSubmit}
                isRowSubmitting={isRowSubmitting?.(rowIdx)}
                cellRefs={cellRefs}
                getCellDisplayValue={getCellDisplayValue}
                freezeFirstCol={freezeFirstCol}
              />
            ))}
          </tbody>
          {showTotals && displayRows.length > 1 && (
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-medium">
                <td className={`px-2 py-2 text-center text-xs font-semibold text-gray-600${freezeFirstCol ? ' sticky left-0 z-20 bg-gray-100' : ''}`}>Cəm</td>
                {columns.map((col, colIdx) => (
                  <td key={col.key} className={[
                    'px-3 py-2 text-sm',
                    (col.type === 'number' || col.type === 'calculated') ? 'font-medium text-gray-800' : 'text-gray-400',
                    freezeFirstCol && colIdx === 0 ? 'sticky left-10 z-10 bg-gray-100 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]' : '',
                  ].filter(Boolean).join(' ')}>
                    {(col.type === 'number' || col.type === 'calculated') && columnTotals[col.key] !== undefined
                      ? (Number.isInteger(columnTotals[col.key]) ? columnTotals[col.key] : columnTotals[col.key]!.toFixed(2))
                      : null}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {visibleRows.map(({ row, idx: rowIdx }) => (
          <MobileRow
            key={rowIdx}
            row={row}
            rowIdx={rowIdx}
            columns={columns}
            disabled={disabled}
            errors={rowErrors[rowIdx] ?? {}}
            canRemove={!isStableTable && !structureLocked && displayRows.length > 1}
            rowStatus={rowStatuses?.[String(rowIdx)]}
            fixedRowLabel={fixedRows?.[rowIdx]?.label ?? null}
            onCellChange={handleCellChange}
            onCellBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            onPaste={handleCellPaste}
            onRemove={handleRemoveRow}
            onRowSubmit={onRowSubmit}
            isRowSubmitting={isRowSubmitting?.(rowIdx)}
            cellRefs={cellRefs}
            getCellDisplayValue={getCellDisplayValue}
          />
        ))}
      </div>

      {(!disabled && !isStableTable) && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-dashed flex-1"
            onClick={handleAddRow}
            disabled={displayRows.length >= maxRows}
            data-testid="add-row-button"
          >
            <Plus className="h-4 w-4 mr-1" />
            Sətir əlavə et ({displayRows.length}/{maxRows})
          </Button>

          {/* Bulk add — only shown when max allows multiple additions */}
          {maxRows - displayRows.length >= 5 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-dashed px-2.5"
                  title="Toplu sətir əlavə et"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <Plus className="h-3.5 w-3.5 -ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <p className="text-xs text-gray-500 mb-2 font-medium">Neçə sətir əlavə edilsin?</p>
                <div className="flex flex-col gap-1">
                  {([5, 10, 20] as const).map((n) => {
                    const canAdd = displayRows.length + n <= maxRows;
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={!canAdd}
                        onClick={() => {
                          for (let i = 0; i < n; i++) {
                            if (displayRows.length + i < maxRows) {
                              handleAddRow();
                            }
                          }
                        }}
                        className="text-left px-3 py-1.5 text-sm rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        +{n} sətir
                        {!canAdd && (
                          <span className="text-xs text-gray-400 ml-1">
                            (maks {maxRows - displayRows.length})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
});
