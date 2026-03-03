import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Send, CheckCircle2, Clock, Info, FileText, Loader2, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { EditableTable } from './EditableTable';
import { reportTableService } from '@/services/reportTables';
import type { ReportTable, ReportTableResponse, ReportTableRow } from '@/types/reportTable';

// ─── TableEntryCard ───────────────────────────────────────────────────────────

interface TableEntryCardProps {
  table: ReportTable;
  onStatusChange?: (tableId: number, status: 'draft' | 'submitted') => void;
}

export function TableEntryCard({ table, onStatusChange }: TableEntryCardProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ReportTableRow[]>([]);
  const [responseId, setResponseId] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<'draft' | 'submitted' | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [tableHasErrors, setTableHasErrors] = useState(false);
  const [submittingRowIdx, setSubmittingRowIdx] = useState<number | null>(null);

  const initialRowsRef = useRef<string>('');

  // ─── Load existing response ────────────────────────────────────────────────

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

  const rowStatuses = useMemo(() => existingResponse?.row_statuses ?? {}, [existingResponse]);

  const hasEditableRows = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.some((_, idx) => {
      const st = rowStatuses[String(idx)]?.status;
      return st == null || st === 'draft' || st === 'rejected';
    });
  }, [rows, rowStatuses]);

  // ─── Track unsaved changes ─────────────────────────────────────────────────

  useEffect(() => {
    const current = JSON.stringify(rows);
    const fullyLocked = responseStatus === 'submitted' && !hasEditableRows;
    setHasUnsaved(current !== initialRowsRef.current && !fullyLocked);
  }, [rows, responseStatus, hasEditableRows]);

  // ─── Warn on navigation with unsaved changes ───────────────────────────────

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

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (currentRows: ReportTableRow[]) => {
      if (responseId) {
        return reportTableService.saveResponse(responseId, currentRows);
      }
      const started = await reportTableService.startResponse(table.id);
      setResponseId(started.id);
      setResponseStatus(started.status);
      return reportTableService.saveResponse(started.id, currentRows);
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

  // Row-level submit mutation
  const submitRowMutation = useMutation({
    mutationFn: async (rowIndex: number) => {
      // Ensure we have a responseId; if not, start + save first
      let currentResponseId = responseId;
      if (!currentResponseId) {
        const started = await reportTableService.startResponse(table.id);
        setResponseId(started.id);
        setResponseStatus(started.status);
        currentResponseId = started.id;
      }
      // Save current rows before submitting individual row
      await reportTableService.saveResponse(currentResponseId, rows);
      return reportTableService.submitRow(table.id, currentResponseId, rowIndex);
    },
    onMutate: (rowIndex) => setSubmittingRowIdx(rowIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-table-my-response', table.id] });
      toast.success('Sətir təsdiq üçün göndərildi.');
    },
    onError: (err: Error) => toast.error(err.message || 'Göndərmək mümkün olmadı.'),
    onSettled: () => setSubmittingRowIdx(null),
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => reportTableService.exportMyResponse(table.id, table.title),
    onSuccess: () => {
      toast.success('Cədvəl export edildi!');
    },
    onError: (error: Error) => toast.error(error.message || 'Export mümkün olmadı.'),
  });

  // ─── Debounce auto-save (3s after last change) ────────────────────────────

  useEffect(() => {
    const fullyLocked = responseStatus === 'submitted' && !hasEditableRows;
    if (fullyLocked || !hasUnsaved || rows.length === 0) return;
    const timer = setTimeout(() => {
      saveMutation.mutate(rows);
    }, 3_000);
    return () => clearTimeout(timer);
  }, [rows, responseStatus, hasEditableRows, hasUnsaved, saveMutation]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRowsChange = useCallback((newRows: ReportTableRow[]) => {
    setRows(newRows);
  }, []);

  const handleSubmitClick = useCallback(() => {
    if (tableHasErrors) {
      toast.error('Xanalarındakı xətaları düzəldin.');
      return;
    }
    setShowSubmitConfirm(true);
  }, [tableHasErrors]);

  const handleRowSubmit = useCallback((rowIndex: number) => {
    submitRowMutation.mutate(rowIndex);
  }, [submitRowMutation]);

  const isRowSubmitting = useCallback((rowIndex: number) => {
    return submittingRowIdx === rowIndex && submitRowMutation.isPending;
  }, [submittingRowIdx, submitRowMutation.isPending]);

  // ─── Derived state ─────────────────────────────────────────────────────────

  const isSubmitted = responseStatus === 'submitted';
  const isSaving = saveMutation.isPending;
  const isSubmitting = submitMutation.isPending;
  const fullyLocked = isSubmitted && !hasEditableRows;

  const deadlineBadge = useMemo(() => {
    if (!table.deadline) return null;
    const days = Math.ceil((new Date(table.deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Son tarix keçib</Badge>;
    if (days <= 3) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{days} gün qalıb</Badge>;
    return <span className="text-xs text-gray-400">Son tarix: {new Date(table.deadline).toLocaleDateString('az-AZ')}</span>;
  }, [table.deadline]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
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
            {deadlineBadge}
          </div>
          <h2 className="font-semibold text-gray-800 leading-snug">{table.title}</h2>
        </div>

        {!fullyLocked && (
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
              variant="outline"
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || rows.length === 0}
              className="gap-1"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export
            </Button>
            {!isSubmitted && (
              <Button
                size="sm"
                onClick={handleSubmitClick}
                disabled={isSubmitting || rows.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmitting ? 'Göndərilir...' : 'Hamısını göndər'}
              </Button>
            )}
          </div>
        )}

        {/* Export menu for submitted/locked tables */}
        {fullyLocked && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || rows.length === 0}
              className="gap-1"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export
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
        {tableHasErrors && !isSubmitted && (
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
            onChange={handleRowsChange}
            disabled={fullyLocked}
            lockStructure={false}
            onValidationChange={setTableHasErrors}
            rowStatuses={rowStatuses}
            onRowSubmit={handleRowSubmit}
            isRowSubmitting={isRowSubmitting}
          />
        )}
      </div>

      {/* Submit confirmation */}
      <ConfirmDialog
        open={showSubmitConfirm}
        type="warning"
        title="Bütün cədvəli göndər?"
        description="Göndərildikdən sonra bütün məlumatlar dəyişdirilə bilməz. Davam etmək istəyirsiniz?"
        confirmLabel="Hamısını göndər"
        onConfirm={() => { setShowSubmitConfirm(false); submitMutation.mutate(); }}
        onClose={() => setShowSubmitConfirm(false)}
        loading={isSubmitting}
      />
    </div>
  );
}
