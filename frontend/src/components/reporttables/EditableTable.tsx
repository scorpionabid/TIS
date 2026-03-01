import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertCircle, Send, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportTableRow, ReportTableColumn, RowStatuses, RowStatusMeta } from '@/types/reportTable';

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateRow(
  row: ReportTableRow,
  columns: ReportTableColumn[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  columns.forEach((col) => {
    const val = String(row[col.key] ?? '').trim();

    if (col.required && !val) {
      errors[col.key] = 'Tələb olunur';
      return;
    }
    if (!val) return;

    if (col.type === 'number') {
      const n = Number(val);
      if (isNaN(n)) { errors[col.key] = 'Yalnız rəqəm'; return; }
      if (col.min !== undefined && n < col.min) { errors[col.key] = `Min: ${col.min}`; return; }
      if (col.max !== undefined && n > col.max) { errors[col.key] = `Maks: ${col.max}`; return; }
    }

    if (col.type === 'text') {
      if (col.min_length && val.length < col.min_length) { errors[col.key] = `Min ${col.min_length} simvol`; return; }
      if (col.max_length && val.length > col.max_length) { errors[col.key] = `Maks ${col.max_length} simvol`; return; }
    }

    if (col.type === 'select' && col.options && col.options.length > 0) {
      if (!col.options.includes(val)) { errors[col.key] = 'Yanlış seçim'; return; }
    }

    if (col.type === 'boolean') {
      const valid = ['bəli', 'xeyr', 'true', 'false', '1', '0'];
      if (!valid.includes(val.toLowerCase())) { errors[col.key] = 'Bəli və ya Xeyr seçin'; return; }
    }
  });
  return errors;
}

export function hasValidationErrors(
  rowErrors: Record<number, Record<string, string>>
): boolean {
  return Object.values(rowErrors).some((errs) => Object.keys(errs).length > 0);
}

// ─── TSV Parser ───────────────────────────────────────────────────────────────
// Handles Excel-style quoted fields: "value with, comma", escaped quotes ""→"

function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
      if (ch === '"') { inQuotes = false; i++; continue; }
      cell += ch; i++;
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === '\t') { row.push(cell); cell = ''; i++; continue; }
      if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(cell); cell = '';
        rows.push(row); row = [];
        if (ch === '\r') i++;
        i++; continue;
      }
      cell += ch; i++;
    }
  }
  if (row.length > 0 || cell) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// ─── Row Status Helpers ───────────────────────────────────────────────────────

function isRowLocked(status: RowStatusMeta | undefined): boolean {
  return status?.status === 'submitted' || status?.status === 'approved';
}

function RowStatusBadge({ meta }: { meta: RowStatusMeta | undefined }) {
  if (!meta || meta.status === 'draft') return null;

  if (meta.status === 'submitted') {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-xs shrink-0">
        <Clock className="h-3 w-3" /> Gözləyir
      </Badge>
    );
  }
  if (meta.status === 'approved') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 text-xs shrink-0">
        <CheckCircle2 className="h-3 w-3" /> Təsdiqləndi
      </Badge>
    );
  }
  if (meta.status === 'rejected') {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-xs shrink-0" title={meta.rejection_reason ?? ''}>
        <XCircle className="h-3 w-3" /> Rədd edildi
      </Badge>
    );
  }
  return null;
}

// ─── CellInput: Polymorphic per-column-type input ────────────────────────────

interface CellInputProps {
  col: ReportTableColumn;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  error: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}

const CellInput = React.memo(function CellInput({
  col, value, onChange, onBlur, onKeyDown, onPaste, disabled, error, inputRef,
}: CellInputProps) {
  if (col.type === 'select') {
    return (
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={`h-9 text-sm ${error ? 'border-red-400 focus:ring-red-300' : ''}`}
        >
          <SelectValue placeholder="Seçin..." />
        </SelectTrigger>
        <SelectContent>
          {(col.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (col.type === 'boolean') {
    return (
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={`h-9 text-sm ${error ? 'border-red-400 focus:ring-red-300' : ''}`}
        >
          <SelectValue placeholder="Seçin..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bəli">Bəli</SelectItem>
          <SelectItem value="xeyr">Xeyr</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      ref={inputRef}
      type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
      inputMode={col.type === 'number' ? 'decimal' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      disabled={disabled}
      placeholder={col.hint || col.label}
      className={`h-9 text-sm ${error ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
    />
  );
});

// ─── Memoized Desktop Row ─────────────────────────────────────────────────────

interface DesktopRowProps {
  row: ReportTableRow;
  rowIdx: number;
  columns: ReportTableColumn[];
  disabled: boolean;
  errors: Record<string, string>;
  canRemove: boolean;
  rowStatus: RowStatusMeta | undefined;
  onCellChange: (rowIdx: number, colKey: string, value: string) => void;
  onCellBlur: (rowIdx: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => void;
  onRemove: (rowIdx: number) => void;
  onRowSubmit?: (rowIdx: number) => void;
  isRowSubmitting?: boolean;
  cellRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}

const DesktopRow = React.memo(function DesktopRow({
  row, rowIdx, columns, disabled, errors, canRemove, rowStatus,
  onCellChange, onCellBlur, onKeyDown, onPaste, onRemove,
  onRowSubmit, isRowSubmitting, cellRefs,
}: DesktopRowProps) {
  const locked = isRowLocked(rowStatus) || disabled;
  const rowHasContent = Object.values(row).some((v) => v !== null && v !== '');
  const canSubmitRow = !locked && !disabled && onRowSubmit && rowHasContent &&
    (!rowStatus || rowStatus.status === 'rejected' || rowStatus.status === 'draft');

  const statusColor = rowStatus?.status === 'approved'
    ? 'bg-emerald-50'
    : rowStatus?.status === 'submitted'
    ? 'bg-amber-50'
    : rowStatus?.status === 'rejected'
    ? 'bg-red-50'
    : '';

  return (
    <tr className={`border-b border-gray-200 hover:bg-gray-50 ${statusColor}`}>
      <td className="px-2 py-2 text-center text-gray-400 font-medium">{rowIdx + 1}</td>
      {columns.map((col, colIdx) => {
        const err = errors[col.key];
        return (
          <td key={col.key} className="px-1 py-1">
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
            {err && <p className="text-xs text-red-500 mt-0.5 px-1">{err}</p>}
          </td>
        );
      })}
      <td className="px-2 py-2 text-center whitespace-nowrap">
        <div className="flex items-center gap-1 justify-center">
          <RowStatusBadge meta={rowStatus} />
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
          {!locked && !onRowSubmit && canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(rowIdx)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {!locked && onRowSubmit && canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(rowIdx)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {locked && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(rowIdx)}
              disabled
              className="h-8 w-8 p-0 text-gray-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});

// ─── Memoized Mobile Card Row ─────────────────────────────────────────────────

interface MobileRowProps {
  row: ReportTableRow;
  rowIdx: number;
  columns: ReportTableColumn[];
  disabled: boolean;
  errors: Record<string, string>;
  canRemove: boolean;
  rowStatus: RowStatusMeta | undefined;
  onCellChange: (rowIdx: number, colKey: string, value: string) => void;
  onCellBlur: (rowIdx: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => void;
  onRemove: (rowIdx: number) => void;
  onRowSubmit?: (rowIdx: number) => void;
  isRowSubmitting?: boolean;
  cellRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}

const MobileRow = React.memo(function MobileRow({
  row, rowIdx, columns, disabled, errors, canRemove, rowStatus,
  onCellChange, onCellBlur, onKeyDown, onPaste, onRemove,
  onRowSubmit, isRowSubmitting, cellRefs,
}: MobileRowProps) {
  const locked = isRowLocked(rowStatus) || disabled;
  const rowHasContent = Object.values(row).some((v) => v !== null && v !== '');
  const canSubmitRow = !locked && !disabled && onRowSubmit && rowHasContent &&
    (!rowStatus || rowStatus.status === 'rejected' || rowStatus.status === 'draft');

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Sətir {rowIdx + 1}</span>
          <RowStatusBadge meta={rowStatus} />
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
          {!locked && canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(rowIdx)}
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {columns.map((col, colIdx) => {
        const err = errors[col.key];
        return (
          <div key={col.key}>
            <label className="text-xs text-gray-500 mb-1 block">
              {col.required && <span className="text-red-500 mr-0.5">*</span>}
              {col.label}
              {col.type === 'number' && <span className="ml-1 text-gray-400">(rəqəm)</span>}
              {col.type === 'date' && <span className="ml-1 text-gray-400">(tarix)</span>}
            </label>
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
            {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
          </div>
        );
      })}
    </div>
  );
});

// ─── EditableTable Component ──────────────────────────────────────────────────

interface EditableTableProps {
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  maxRows: number;
  onChange: (rows: ReportTableRow[]) => void;
  disabled: boolean;
  /** Callback replaces DOM querySelector anti-pattern */
  onValidationChange?: (hasErrors: boolean) => void;
  /** Per-row approval status from backend */
  rowStatuses?: RowStatuses;
  /** Called when user clicks "Təsdiq et" for a single row */
  onRowSubmit?: (rowIndex: number) => void;
  /** Whether a specific row's submit button is loading */
  isRowSubmitting?: (rowIndex: number) => boolean;
}

export const EditableTable = React.memo(function EditableTable({
  columns,
  rows,
  maxRows,
  onChange,
  disabled,
  onValidationChange,
  rowStatuses,
  onRowSubmit,
  isRowSubmitting,
}: EditableTableProps) {
  const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Notify parent of validation state via callback — no DOM needed
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

  // Stable callbacks for memoized row components
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

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (colIdx + 1 < columns.length) {
        focusCell(rowIdx, colIdx + 1);
      } else {
        focusCell(rowIdx + 1, 0);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      focusCell(rowIdx + 1, colIdx);
    }
  }, [columns.length]);

  // Proper TSV parser with quoted field support
  const handleCellPaste = useCallback((
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIdx: number,
    startColIdx: number
  ) => {
    const text = e.clipboardData.getData('text/plain');

    // Single value with no tabs/newlines — let browser handle default paste
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

  const handleAddRow = useCallback(() => {
    const current = rows.length > 0 ? rows : [createEmptyRow()];
    if (current.length >= maxRows) {
      toast.warning(`Maksimum ${maxRows} sətir əlavə edilə bilər.`);
      return;
    }
    onChange([...current, createEmptyRow()]);
  }, [rows, maxRows, onChange, createEmptyRow]);

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
  }, [rows, onChange, createEmptyRow]);

  const errorCount = Object.values(rowErrors).reduce(
    (acc, errs) => acc + Object.keys(errs).length, 0
  );

  const colTypeLabel = (col: ReportTableColumn) => {
    if (col.type === 'number') return 'rəqəm';
    if (col.type === 'date') return 'tarix';
    if (col.type === 'select') return 'seçim';
    if (col.type === 'boolean') return 'bəli/xeyr';
    return null;
  };

  return (
    <div className="space-y-3">
      {errorCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorCount} xanada xəta var. Göndərməzdən əvvəl düzəldin.
        </div>
      )}

      {/* Desktop table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full border border-gray-200 text-sm rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-3 text-center border-b border-gray-200 w-10 text-gray-500">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-3 text-left border-b border-gray-200 font-medium text-gray-700 min-w-[140px]"
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
            {displayRows.map((row, rowIdx) => (
              <DesktopRow
                key={rowIdx}
                row={row}
                rowIdx={rowIdx}
                columns={columns}
                disabled={disabled}
                errors={rowErrors[rowIdx] ?? {}}
                canRemove={displayRows.length > 1}
                rowStatus={rowStatuses?.[String(rowIdx)]}
                onCellChange={handleCellChange}
                onCellBlur={handleCellBlur}
                onKeyDown={handleKeyDown}
                onPaste={handleCellPaste}
                onRemove={handleRemoveRow}
                onRowSubmit={onRowSubmit}
                isRowSubmitting={isRowSubmitting?.(rowIdx)}
                cellRefs={cellRefs}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {displayRows.map((row, rowIdx) => (
          <MobileRow
            key={rowIdx}
            row={row}
            rowIdx={rowIdx}
            columns={columns}
            disabled={disabled}
            errors={rowErrors[rowIdx] ?? {}}
            canRemove={displayRows.length > 1}
            rowStatus={rowStatuses?.[String(rowIdx)]}
            onCellChange={handleCellChange}
            onCellBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            onPaste={handleCellPaste}
            onRemove={handleRemoveRow}
            onRowSubmit={onRowSubmit}
            isRowSubmitting={isRowSubmitting?.(rowIdx)}
            cellRefs={cellRefs}
          />
        ))}
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed w-full"
          onClick={handleAddRow}
          disabled={displayRows.length >= maxRows}
        >
          <Plus className="h-4 w-4 mr-1" />
          Sətir əlavə et ({displayRows.length}/{maxRows})
        </Button>
      )}
    </div>
  );
});
