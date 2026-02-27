import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Save, Send, CheckCircle2, Clock, Table2, Info, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { reportTableService } from '@/services/reportTables';
import type { ReportTable, ReportTableResponse, ReportTableRow, ReportTableColumn } from '@/types/reportTable';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_SAVE_INTERVAL = 30_000;

// ─── Row Validation ───────────────────────────────────────────────────────────

function validateRow(row: ReportTableRow, columns: ReportTableColumn[]): Record<string, string> {
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
  });
  return errors;
}

function hasValidationErrors(rowErrors: Record<number, Record<string, string>>): boolean {
  return Object.values(rowErrors).some((errs) => Object.keys(errs).length > 0);
}

// ─── Editable Table ───────────────────────────────────────────────────────────

function EditableTable({
  columns,
  rows,
  maxRows,
  onChange,
  disabled,
}: {
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  maxRows: number;
  onChange: (rows: ReportTableRow[]) => void;
  disabled: boolean;
}) {
  const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const createEmptyRow = useCallback((): ReportTableRow => {
    const row: ReportTableRow = {};
    columns.forEach((col) => { row[col.key] = ''; });
    return row;
  }, [columns]);

  const displayRows = rows.length > 0 ? rows : [createEmptyRow()];

  const focusCell = (rowIdx: number, colIdx: number) => {
    const key = `${rowIdx}-${colIdx}`;
    cellRefs.current[key]?.focus();
  };

  const handleCellChange = (rowIdx: number, colKey: string, value: string) => {
    const newRows = displayRows.map((r, i) =>
      i === rowIdx ? { ...r, [colKey]: value } : r
    );
    onChange(newRows);
    // Clear error on change
    setRowErrors((prev) => {
      const updated = { ...prev };
      if (updated[rowIdx]) {
        const { [colKey]: _, ...rest } = updated[rowIdx];
        updated[rowIdx] = rest;
      }
      return updated;
    });
  };

  const handleCellBlur = (rowIdx: number) => {
    const errs = validateRow(displayRows[rowIdx], columns);
    setRowErrors((prev) => ({ ...prev, [rowIdx]: errs }));
  };

  const handleKeyDown = (
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
  };

  // Excel paste support: detect TSV from clipboard
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIdx: number,
    startColIdx: number
  ) => {
    const text = e.clipboardData.getData('text/plain');
    const lines = text.split('\n').filter((l) => l.trim() !== '');

    // Single cell: let default paste handle it
    if (lines.length <= 1 && !lines[0]?.includes('\t')) return;

    e.preventDefault();
    const pastedData = lines.map((line) => line.split('\t'));
    const newRows = [...displayRows];

    pastedData.forEach((pastedRow, ri) => {
      const targetRow = startRowIdx + ri;
      if (targetRow >= maxRows) return;
      while (newRows.length <= targetRow) newRows.push(createEmptyRow());
      pastedRow.forEach((cell, ci) => {
        const targetCol = startColIdx + ci;
        if (targetCol < columns.length) {
          newRows[targetRow][columns[targetCol].key] = cell.trim();
        }
      });
    });

    onChange(newRows);
    toast.info(`${pastedData.length} sətir yapışdırıldı.`);
  };

  const addRow = () => {
    if (displayRows.length >= maxRows) {
      toast.warning(`Maksimum ${maxRows} sətir əlavə edilə bilər.`);
      return;
    }
    onChange([...displayRows, createEmptyRow()]);
  };

  const removeRow = (idx: number) => {
    if (displayRows.length <= 1) return;
    onChange(displayRows.filter((_, i) => i !== idx));
    setRowErrors((prev) => {
      const updated: Record<number, Record<string, string>> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < idx) updated[ki] = v;
        else if (ki > idx) updated[ki - 1] = v;
      });
      return updated;
    });
  };

  const errorCount = Object.values(rowErrors).reduce((acc, errs) => acc + Object.keys(errs).length, 0);

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
                    {col.type !== 'text' && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        ({col.type === 'number' ? 'rəqəm' : 'tarix'})
                      </span>
                    )}
                  </div>
                  {col.hint && (
                    <p className="text-xs font-normal text-gray-400 mt-0.5">{col.hint}</p>
                  )}
                </th>
              ))}
              {!disabled && (
                <th className="px-2 py-3 text-center border-b border-gray-200 w-10" />
              )}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-2 py-2 text-center text-gray-400 font-medium">{rowIdx + 1}</td>
                {columns.map((col, colIdx) => {
                  const err = rowErrors[rowIdx]?.[col.key];
                  return (
                    <td key={col.key} className="px-1 py-1">
                      <Input
                        ref={(el) => { cellRefs.current[`${rowIdx}-${colIdx}`] = el; }}
                        type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                        inputMode={col.type === 'number' ? 'decimal' : undefined}
                        value={String(row[col.key] ?? '')}
                        onChange={(e) => handleCellChange(rowIdx, col.key, e.target.value)}
                        onBlur={() => handleCellBlur(rowIdx)}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                        onPaste={(e) => handleCellPaste(e, rowIdx, colIdx)}
                        disabled={disabled}
                        placeholder={col.hint || col.label}
                        className={`h-9 text-sm ${err ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                      />
                      {err && (
                        <p className="text-xs text-red-500 mt-0.5 px-1">{err}</p>
                      )}
                    </td>
                  );
                })}
                {!disabled && (
                  <td className="px-1 py-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(rowIdx)}
                      disabled={displayRows.length <= 1}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {displayRows.map((row, rowIdx) => (
          <div key={rowIdx} className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500">Sətir {rowIdx + 1}</span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(rowIdx)}
                  disabled={displayRows.length <= 1}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {columns.map((col, colIdx) => {
              const err = rowErrors[rowIdx]?.[col.key];
              return (
                <div key={col.key}>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {col.required && <span className="text-red-500 mr-0.5">*</span>}
                    {col.label}
                    {col.type !== 'text' && (
                      <span className="ml-1 text-gray-400">({col.type === 'number' ? 'rəqəm' : 'tarix'})</span>
                    )}
                  </label>
                  <Input
                    ref={(el) => { cellRefs.current[`${rowIdx}-${colIdx}`] = el; }}
                    type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                    inputMode={col.type === 'number' ? 'decimal' : undefined}
                    value={String(row[col.key] ?? '')}
                    onChange={(e) => handleCellChange(rowIdx, col.key, e.target.value)}
                    onBlur={() => handleCellBlur(rowIdx)}
                    onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                    onPaste={(e) => handleCellPaste(e, rowIdx, colIdx)}
                    disabled={disabled}
                    placeholder={col.hint || col.label}
                    className={`h-9 text-sm ${err ? 'border-red-400' : ''}`}
                  />
                  {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed w-full"
          onClick={addRow}
          disabled={displayRows.length >= maxRows}
        >
          <Plus className="h-4 w-4 mr-1" />
          Sətir əlavə et ({displayRows.length}/{maxRows})
        </Button>
      )}

      {/* Expose errors via custom prop for parent */}
      <input type="hidden" data-validation-errors={hasValidationErrors(rowErrors) ? 'true' : 'false'} />
    </div>
  );
}

// ─── Table Entry Card ─────────────────────────────────────────────────────────

function TableEntryCard({
  table,
  onStatusChange,
}: {
  table: ReportTable;
  onStatusChange?: (tableId: number, status: 'draft' | 'submitted') => void;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ReportTableRow[]>([]);
  const [responseId, setResponseId] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<'draft' | 'submitted' | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialRowsRef = useRef<string>('');

  const { data: existingResponse, isLoading: responseLoading } = useQuery({
    queryKey: ['report-table-my-response', table.id],
    queryFn: () => reportTableService.getMyResponse(table.id),
  });

  useEffect(() => {
    if (existingResponse) {
      setRows(existingResponse.rows ?? []);
      setResponseId(existingResponse.id);
      setResponseStatus(existingResponse.status);
      initialRowsRef.current = JSON.stringify(existingResponse.rows ?? []);
      onStatusChange?.(table.id, existingResponse.status);
    }
  }, [existingResponse]);

  // Track unsaved changes
  useEffect(() => {
    const current = JSON.stringify(rows);
    setHasUnsaved(current !== initialRowsRef.current && responseStatus !== 'submitted');
  }, [rows, responseStatus]);

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  // Auto-save
  const saveMutation = useMutation({
    mutationFn: async (currentRows: ReportTableRow[]) => {
      if (responseId) {
        return reportTableService.saveResponse(responseId, currentRows);
      } else {
        const started = await reportTableService.startResponse(table.id);
        setResponseId(started.id);
        setResponseStatus(started.status);
        return reportTableService.saveResponse(started.id, currentRows);
      }
    },
    onSuccess: (data: ReportTableResponse) => {
      setLastSaved(new Date());
      setResponseId(data.id);
      initialRowsRef.current = JSON.stringify(rows);
      setHasUnsaved(false);
      queryClient.invalidateQueries({ queryKey: ['report-table-my-response', table.id] });
    },
    onError: () => toast.error('Saxlamaq mümkün olmadı.'),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!responseId) {
        const started = await reportTableService.startResponse(table.id);
        await reportTableService.saveResponse(started.id, rows);
        return reportTableService.submitResponse(started.id);
      }
      await reportTableService.saveResponse(responseId, rows);
      return reportTableService.submitResponse(responseId);
    },
    onSuccess: (data: ReportTableResponse) => {
      setResponseStatus('submitted');
      setResponseId(data.id);
      setHasUnsaved(false);
      initialRowsRef.current = JSON.stringify(rows);
      queryClient.invalidateQueries({ queryKey: ['report-table-my-response', table.id] });
      toast.success('Məlumatlar uğurla göndərildi!');
      onStatusChange?.(table.id, 'submitted');
    },
    onError: (err: Error) => toast.error(err.message || 'Göndərmək mümkün olmadı.'),
  });

  useEffect(() => {
    if (responseStatus === 'submitted') return;
    autoSaveRef.current = setInterval(() => {
      if (rows.length > 0 && hasUnsaved) {
        saveMutation.mutate(rows);
      }
    }, AUTO_SAVE_INTERVAL);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [rows, responseStatus, hasUnsaved]);

  const isSubmitted = responseStatus === 'submitted';
  const isSaving = saveMutation.isPending;
  const isSubmitting = submitMutation.isPending;

  const handleSubmitClick = () => {
    // Check for validation errors
    const errEl = document.querySelector(`[data-table-id="${table.id}"] [data-validation-errors="true"]`);
    if (errEl) {
      setValidationError(true);
      toast.error('Xanalarındakı xətaları düzəldin.');
      return;
    }
    setValidationError(false);
    setShowSubmitConfirm(true);
  };

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm" data-table-id={table.id}>
      {/* Header */}
      <div className="px-5 py-4 border-b bg-gray-50 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isSubmitted ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Göndərilib
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500 gap-1">
                <Clock className="h-3 w-3" /> Qaralama
              </Badge>
            )}
            {table.deadline && (() => {
              const days = Math.ceil((new Date(table.deadline).getTime() - Date.now()) / 86400000);
              if (days < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Son tarix keçib</Badge>;
              if (days <= 3) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{days} gün qalıb</Badge>;
              return <span className="text-xs text-gray-400">Son tarix: {new Date(table.deadline).toLocaleDateString('az-AZ')}</span>;
            })()}
          </div>
          <h2 className="font-semibold text-gray-800 leading-snug">{table.title}</h2>
        </div>

        {!isSubmitted && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Auto-save status */}
            <div className="text-xs flex items-center gap-1">
              {isSaving ? (
                <span className="text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saxlanır...
                </span>
              ) : lastSaved ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {format(lastSaved, 'HH:mm', { locale: az })}
                </span>
              ) : hasUnsaved ? (
                <span className="text-amber-500">Saxlanmamış dəyişikliklər</span>
              ) : null}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate(rows)}
              disabled={isSaving || !hasUnsaved}
              className="gap-1"
            >
              <Save className="h-3.5 w-3.5" />
              Saxla
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitClick}
              disabled={isSubmitting || rows.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? 'Göndərilir...' : 'Göndər'}
            </Button>
          </div>
        )}
      </div>

      {/* Info boxes */}
      {(table.description || table.notes) && (
        <div className="px-5 pt-4 space-y-2">
          {table.description && (
            <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{table.description}</p>
            </div>
          )}
          {table.notes && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              <FileText className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{table.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Table area */}
      <div className="p-5">
        {validationError && (
          <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Xanalarındakı xətaları düzəldin, sonra göndərin.
          </div>
        )}

        {responseLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <EditableTable
            columns={table.columns ?? []}
            rows={rows}
            maxRows={table.max_rows ?? 50}
            onChange={(r) => { setRows(r); }}
            disabled={isSubmitted}
          />
        )}
      </div>

      {/* Submit confirmation */}
      <ConfirmDialog
        open={showSubmitConfirm}
        type="warning"
        title="Cədvəli göndər?"
        description="Göndərildikdən sonra məlumatlar dəyişdirilə bilməz. Davam etmək istəyirsiniz?"
        confirmLabel="Göndər"
        onConfirm={() => { setShowSubmitConfirm(false); submitMutation.mutate(); }}
        onClose={() => setShowSubmitConfirm(false)}
        loading={isSubmitting}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportTableEntry() {
  const [responseStatuses, setResponseStatuses] = useState<Record<number, 'draft' | 'submitted'>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['report-tables-my'],
    queryFn: () => reportTableService.getMyTables(),
  });

  const tables: ReportTable[] = useMemo(() => data ?? [], [data]);

  const handleStatusChange = useCallback((tableId: number, status: 'draft' | 'submitted') => {
    setResponseStatuses((prev) => ({ ...prev, [tableId]: status }));
  }, []);

  const submittedCount = Object.values(responseStatuses).filter((s) => s === 'submitted').length;
  const progressPct = tables.length > 0 ? Math.round((submittedCount / tables.length) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Table2 className="h-6 w-6 text-emerald-600" />
          Hesabat Cədvəlləri
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Aşağıdakı cədvəlləri dolduraraq göndərin.
        </p>
      </div>

      {/* Progress summary (only if tables loaded) */}
      {!isLoading && tables.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Ümumi tamamlanma
            </span>
            <span className="text-sm text-gray-500">
              {submittedCount}/{tables.length} cədvəl göndərilib
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
          {submittedCount === tables.length && (
            <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Bütün cədvəllər göndərildi!
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Table2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Aktiv cədvəl yoxdur</p>
          <p className="text-sm mt-1">Sizə hələ heç bir hesabat cədvəli təyin edilməyib.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tables.map((table) => (
            <TableEntryCard
              key={table.id}
              table={table}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
