import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { Keyboard, Plus, Trash2, AlertCircle, Send, Loader2, CheckCircle2, Clock, XCircle, HelpCircle, Layers, Sigma, Columns } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportTableRow, ReportTableColumn, RowStatuses, RowStatusMeta } from '@/types/reportTable';
import { FormulaEngine, CellContext } from '@/lib/formulaEngine';
import { FileUploadInput } from './FileUploadInput';
import { SignatureInput } from './SignatureInput';
import { GPSInput } from './GPSInput';

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

// ─── Column Width Helper ──────────────────────────────────────────────────────

function colMinWidth(type: string): string {
  switch (type) {
    case 'number':
    case 'boolean':
    case 'calculated': return 'min-w-[110px]';
    case 'date':       return 'min-w-[140px]';
    case 'select':     return 'min-w-[150px]';
    case 'file':
    case 'signature':  return 'min-w-[180px]';
    case 'gps':        return 'min-w-[170px]';
    default:           return 'min-w-[180px]';
  }
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
      <div className="space-y-1">
        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-xs shrink-0" title={meta.rejection_reason ?? 'Səbəb göstərilməyib'}>
          <XCircle className="h-3 w-3" /> Rədd edildi
        </Badge>
        {meta.rejection_reason && (
          <p className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 max-w-[200px] truncate">
            {meta.rejection_reason}
          </p>
        )}
      </div>
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
  // Handle file upload columns
  if (col.type === 'file') {
    return (
      <FileUploadInput
        value={value || null}
        onChange={(v) => onChange(v || '')}
        disabled={disabled}
        acceptedTypes={col.accepted_types}
        maxSizeMB={col.max_file_size}
      />
    );
  }

  // Handle signature columns
  if (col.type === 'signature') {
    return (
      <SignatureInput
        value={value || null}
        onChange={(v) => onChange(v || '')}
        disabled={disabled}
        width={col.signature_width}
        height={col.signature_height}
      />
    );
  }

  // Handle GPS columns
  if (col.type === 'gps') {
    return (
      <GPSInput
        value={value || null}
        onChange={(v) => onChange(v || '')}
        disabled={disabled}
        precision={col.gps_precision}
        radius={col.gps_radius}
      />
    );
  }

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
  onDuplicate: (rowIdx: number) => void;
  onRowSubmit?: (rowIdx: number) => void;
  isRowSubmitting?: boolean;
  cellRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  getCellDisplayValue: (row: ReportTableRow, rowIdx: number, col: ReportTableColumn) => string;
  freezeFirstCol: boolean;
}

const DesktopRow = React.memo(function DesktopRow({
  row, rowIdx, columns, disabled, errors, canRemove, rowStatus,
  onCellChange, onCellBlur, onKeyDown, onPaste, onRemove, onDuplicate,
  onRowSubmit, isRowSubmitting, cellRefs, getCellDisplayValue, freezeFirstCol,
}: DesktopRowProps) {
  const locked = isRowLocked(rowStatus) || disabled;
  const rowHasContent = Object.values(row).some((v) => v !== null && v !== '');
  const canSubmitRow = !locked && !disabled && onRowSubmit && rowHasContent &&
    (!rowStatus || rowStatus.status === 'rejected' || rowStatus.status === 'draft');
  
  // Row can only be removed if it's not locked (submitted/approved) and general canRemove is true
  const canRemoveRow = canRemove && !isRowLocked(rowStatus);

  const statusColor = rowStatus?.status === 'approved'
    ? 'bg-emerald-50'
    : rowStatus?.status === 'submitted'
    ? 'bg-amber-50'
    : rowStatus?.status === 'rejected'
    ? 'bg-red-50'
    : '';

  return (
    <tr className={`border-b border-gray-200 hover:bg-gray-50 ${statusColor}`}>
      <td className={`px-2 py-2 text-center text-gray-400 font-medium${freezeFirstCol ? ' sticky left-0 z-20 bg-white' : ''}`}>{rowIdx + 1}</td>
      {columns.map((col, colIdx) => {
        const err = errors[col.key];
        const displayValue = getCellDisplayValue(row, rowIdx, col);
        const isCalculated = col.type === 'calculated';
        
        return (
          <td key={col.key} className={[
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
          {!locked && !onRowSubmit && canRemoveRow && (
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
          {!locked && onRowSubmit && canRemoveRow && (
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
  getCellDisplayValue: (row: ReportTableRow, rowIdx: number, col: ReportTableColumn) => string;
}

const MobileRow = React.memo(function MobileRow({
  row, rowIdx, columns, disabled, errors, canRemove, rowStatus,
  onCellChange, onCellBlur, onKeyDown, onPaste, onRemove,
  onRowSubmit, isRowSubmitting, cellRefs, getCellDisplayValue,
}: MobileRowProps) {
  const locked = isRowLocked(rowStatus) || disabled;
  const rowHasContent = Object.values(row).some((v) => v !== null && v !== '');
  const canSubmitRow = !locked && !disabled && onRowSubmit && rowHasContent &&
    (!rowStatus || rowStatus.status === 'rejected' || rowStatus.status === 'draft');
  
  // Row can only be removed if it's not locked (submitted/approved) and general canRemove is true
  const canRemoveRow = canRemove && !isRowLocked(rowStatus);

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
          {!locked && canRemoveRow && (
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

// ─── EditableTable Component ──────────────────────────────────────────────────

interface EditableTableProps {
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  maxRows: number;
  onChange: (rows: ReportTableRow[]) => void;
  disabled: boolean;
  /** Prevent structural changes (add/remove rows) while still allowing editable rows */
  lockStructure?: boolean;
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
  lockStructure,
  onValidationChange,
  rowStatuses,
  onRowSubmit,
  isRowSubmitting,
}: EditableTableProps) {
  const structureLocked = disabled || lockStructure;
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
    const totalRows = displayRows.length;
    const totalCols = columns.length;
    
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab - move backwards
          if (colIdx > 0) {
            focusCell(rowIdx, colIdx - 1);
          } else if (rowIdx > 0) {
            focusCell(rowIdx - 1, totalCols - 1);
          }
        } else {
          // Tab - move forwards
          if (colIdx + 1 < totalCols) {
            focusCell(rowIdx, colIdx + 1);
          } else if (rowIdx + 1 < totalRows) {
            focusCell(rowIdx + 1, 0);
          }
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        // Move to next row, same column
        if (rowIdx + 1 < totalRows) {
          focusCell(rowIdx + 1, colIdx);
        } else if (totalRows < maxRows) {
          // If at last row and we can add more, create new row and focus it
          handleAddRowRef.current?.();
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
          // Create new row at end
          handleAddRowRef.current?.();
          setTimeout(() => focusCell(rowIdx + 1, colIdx), 0);
        }
        break;
        
      case 'ArrowLeft':
        // Only move left if at beginning of input
        if ((e.target as HTMLInputElement).selectionStart === 0) {
          e.preventDefault();
          if (colIdx > 0) {
            focusCell(rowIdx, colIdx - 1);
          }
        }
        break;
        
      case 'ArrowRight':
        // Only move right if at end of input
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          if (colIdx + 1 < totalCols) {
            focusCell(rowIdx, colIdx + 1);
          }
        }
        break;
        
      case 'Home':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Home - go to first cell of table
          focusCell(0, 0);
        } else {
          // Home - go to first cell of current row
          focusCell(rowIdx, 0);
        }
        break;
        
      case 'End':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+End - go to last populated cell
          const lastRow = totalRows - 1;
          const lastCol = totalCols - 1;
          focusCell(lastRow, lastCol);
        } else {
          // End - go to last cell of current row
          focusCell(rowIdx, totalCols - 1);
        }
        break;
        
      case 'PageUp':
        e.preventDefault();
        const upRows = Math.min(5, rowIdx); // Move up 5 rows or to top
        if (upRows > 0) {
          focusCell(rowIdx - upRows, colIdx);
        }
        break;
        
      case 'PageDown':
        e.preventDefault();
        const downRows = Math.min(5, totalRows - rowIdx - 1);
        if (downRows > 0) {
          focusCell(rowIdx + downRows, colIdx);
        } else if (totalRows < maxRows) {
          // Add rows if needed
          handleAddRowRef.current?.();
          setTimeout(() => focusCell(rowIdx + 1, colIdx), 0);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        // Blur the current input to exit edit mode
        (e.target as HTMLInputElement).blur();
        break;
        
      case 'Delete':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // Ctrl+Delete - clear current cell
          const colKey = columns[colIdx].key;
          handleCellChange(rowIdx, colKey, '');
        }
        break;
        
      case 'F2':
        e.preventDefault();
        // F2 - Enter edit mode (select all text)
        const targetInput = e.target as HTMLInputElement;
        targetInput.select();
        break;
        
      case 's':
      case 'S':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          // Ctrl+S - trigger save (parent component handles actual save)
          // Just trigger blur to save current cell
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
  }, [columns, displayRows.length, maxRows, handleCellChange, rows, createEmptyRow]);

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

  // Add row ref for use in keyboard handler
  const handleAddRowRef = useRef<() => void>();
  
  const handleAddRow = useCallback(() => {
    const current = rows.length > 0 ? rows : [createEmptyRow()];
    if (current.length >= maxRows) {
      toast.warning(`Maksimum ${maxRows} sətir əlavə edilə bilər.`);
      return;
    }
    onChange([...current, createEmptyRow()]);
  }, [rows, maxRows, onChange, createEmptyRow]);

  // Keep ref in sync
  useEffect(() => {
    handleAddRowRef.current = handleAddRow;
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
  }, [rows, onChange, createEmptyRow]);

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

  const navigateToFirstError = useCallback(() => {
    for (const [rowIdxStr, colErrors] of Object.entries(rowErrors)) {
      const colKeys = Object.keys(colErrors);
      if (colKeys.length > 0) {
        const rowIdx = Number(rowIdxStr);
        const colIdx = columns.findIndex(c => c.key === colKeys[0]);
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

  const colTypeLabel = (col: ReportTableColumn) => {
    if (col.type === 'number') return 'rəqəm';
    if (col.type === 'date') return 'tarix';
    if (col.type === 'select') return 'seçim';
    if (col.type === 'boolean') return 'bəli/xeyr';
    if (col.type === 'calculated') return 'hesablama';
    if (col.type === 'file') return 'fayl';
    if (col.type === 'signature') return 'imza';
    if (col.type === 'gps') return 'GPS';
    return null;
  };

  // ─── Calculated Column Support ─────────────────────────────────────────────
  
  /**
   * Build cell context for formula evaluation from a row
   * Column keys map to cell refs: col_0 -> A1, col_1 -> B1, etc.
   */
  const buildCellContext = useCallback((row: ReportTableRow, rowIdx: number): CellContext => {
    const context: CellContext = {};
    columns.forEach((col, colIdx) => {
      // Map column key to Excel-style reference (A1, B1, etc.)
      const colLetter = String.fromCharCode(65 + colIdx); // A, B, C...
      const cellRef = `${colLetter}${rowIdx + 1}`;
      const value = row[col.key];
      // Convert to appropriate type for formula engine
      if (col.type === 'number' && value !== '' && value !== null) {
        context[cellRef] = parseFloat(String(value)) || 0;
      } else if (col.type === 'boolean') {
        const lower = String(value).toLowerCase();
        context[cellRef] = lower === 'bəli' || lower === 'true' || lower === '1';
      } else {
        context[cellRef] = value ?? '';
      }
      // Also store by column key for direct reference
      context[col.key] = context[cellRef];
    });
    return context;
  }, [columns]);

  /**
   * Compute value for a calculated column
   */
  const computeCalculatedValue = useCallback((
    row: ReportTableRow,
    rowIdx: number,
    col: ReportTableColumn
  ): string => {
    if (!col.formula) return '';
    const context = buildCellContext(row, rowIdx);
    const result = FormulaEngine.evaluate(col.formula, context);
    if (result.error) return `#ERROR: ${result.error}`;
    if (result.value === null) return '';
    
    // Format based on column settings
    let value = result.value;
    if (typeof value === 'number') {
      if (col.format === 'currency') {
        return value.toLocaleString('az-AZ', { style: 'currency', currency: 'AZN' });
      } else if (col.format === 'percent') {
        return `${(value * 100).toFixed(col.decimals ?? 0)}%`;
      } else {
        return value.toFixed(col.decimals ?? 2);
      }
    }
    return String(value);
  }, [buildCellContext]);

  /**
   * Get display value for a cell - handles calculated columns
   */
  const getCellDisplayValue = useCallback((
    row: ReportTableRow,
    rowIdx: number,
    col: ReportTableColumn
  ): string => {
    if (col.type === 'calculated') {
      return computeCalculatedValue(row, rowIdx, col);
    }
    return String(row[col.key] ?? '');
  }, [computeCalculatedValue]);

  /**
   * Get all calculated columns
   */
  const calculatedColumns = useMemo(() => 
    columns.filter(col => col.type === 'calculated'),
  [columns]);

  /**
   * Check if calculated columns have circular references
   */
  const circularErrors = useMemo(() => {
    if (calculatedColumns.length === 0) return [];
    const dependencies: Record<string, string[]> = {};
    calculatedColumns.forEach(col => {
      if (col.formula) {
        dependencies[col.key] = FormulaEngine.getDependencies(col.formula);
      }
    });
    return FormulaEngine.detectCircular(dependencies);
  }, [calculatedColumns]);

  // Keyboard shortcuts help state
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
  const [freezeFirstCol, setFreezeFirstCol] = useState(false);

  const hasNumericCols = useMemo(
    () => columns.some(c => c.type === 'number' || c.type === 'calculated'),
    [columns]
  );

  const columnTotals = useMemo(() => {
    if (!showTotals || displayRows.length <= 1) return {} as Record<string, number>;
    const totals: Record<string, number> = {};
    columns.forEach(col => {
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

  return (
    <div className="space-y-3">
      {/* Keyboard shortcuts toggle */}
      {!disabled && (
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
      {showShortcuts && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
          <h4 className="font-semibold mb-2 text-slate-800">Klaviatura Qısayolları:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">↑↓←→</kbd>
              <span>Xanalar arasında hərəkət</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Tab</kbd>
              <span>Növbəti xanaya</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Shift+Tab</kbd>
              <span>Əvvəlki xanaya</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Enter</kbd>
              <span>Növbəti sətirə</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Home / End</kbd>
              <span>Sətirin əvvəli/sonu</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Ctrl+Home</kbd>
              <span>Cədvəlin əvvəlinə</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Ctrl+End</kbd>
              <span>Cədvəlin sonuna</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">PgUp / PgDn</kbd>
              <span>5 sətir yuxarı/aşağı</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">F2</kbd>
              <span>Redaktə rejimi (hamısını seç)</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Esc</kbd>
              <span>Redaktədən çıx</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Ctrl+Del</kbd>
              <span>Xananı təmizlə</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Ctrl+S</kbd>
              <span>Yadda saxla</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Ctrl+D</kbd>
              <span>Yuxarı xananı kopyala (Fill Down)</span>
            </div>
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
        {displayRows.map((row, rowIdx) => (
          <MobileRow
            key={rowIdx}
            row={row}
            rowIdx={rowIdx}
            columns={columns}
            disabled={disabled}
            errors={rowErrors[rowIdx] ?? {}}
            canRemove={!structureLocked && displayRows.length > 1}
            rowStatus={rowStatuses?.[String(rowIdx)]}
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

      {(!disabled || !lockStructure) && (
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
