import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Save, 
  Send, 
  CheckCircle2, 
  Clock, 
  Info, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Download, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
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
  // Fetch table details to get notes field (not included in list view)
  const { data: tableDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['report-table-detail', table.id],
    queryFn: async () => {
      // Bypass cache by adding timestamp
      const result = await reportTableService.getTable(table.id, { _t: Date.now() });
      console.log('DEBUG API Response:', result);
      return result;
    },
    enabled: !!table.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });
  
  // Merge table data with details (notes comes from either source)
  const tableWithNotes = useMemo(() => {
    // Priority: tableDetails.notes > table.notes
    const notes = tableDetails?.notes ?? table.notes;
    const fixedRows = tableDetails?.fixed_rows ?? table.fixed_rows;
    
    // DEBUG: Log fixed_rows information
    console.log('DEBUG fixed_rows VALUE:', {
      tableId: table.id,
      tableFixedRows: table.fixed_rows,
      tableDetailsFixedRows: tableDetails?.fixed_rows,
      finalFixedRows: fixedRows,
      hasTableDetails: !!tableDetails,
      tableDetailsKeys: tableDetails ? Object.keys(tableDetails) : null,
    });
    
    return {
      ...table,
      ...tableDetails,
      notes,
      fixed_rows: fixedRows,
    };
  }, [tableDetails, table]);
  
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ReportTableRow[]>([]);
  const [responseId, setResponseId] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<'draft' | 'submitted' | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [tableHasErrors, setTableHasErrors] = useState(false);
  const [submittingRowIdx, setSubmittingRowIdx] = useState<number | null>(null);
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(true);

  const initialRowsRef = useRef<string>('');
  const isSubmittingRef = useRef<boolean>(false);
  const lastSubmissionTimeRef = useRef<number>(0);

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
    } else if (tableWithNotes.fixed_rows && tableWithNotes.fixed_rows.length > 0) {
      // Initialize stable table with empty rows matching fixed_rows count
      const emptyRows = tableWithNotes.fixed_rows.map(() => {
        const row: Record<string, string> = {};
        tableWithNotes.columns?.forEach((col) => { row[col.key] = ''; });
        return row;
      });
      setRows(emptyRows);
    }
  }, [existingResponse, tableWithNotes, table.id, onStatusChange]);

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
      queryClient.invalidateQueries({ queryKey: ['report-table-responses', table.id] });
      queryClient.invalidateQueries({ queryKey: ['report-table-approval-queue'] });
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
  // FIX: Prevent auto-save during row submission to avoid race conditions

  useEffect(() => {
    const fullyLocked = responseStatus === 'submitted' && !hasEditableRows;
    const hasNonEmptyRows = rows.some(r =>
      Object.values(r).some(v => v !== null && v !== '' && v !== undefined)
    );
    if (fullyLocked || !hasUnsaved || !hasNonEmptyRows) return;
    
    // Skip auto-save if submission is in progress or recently completed
    if (isSubmittingRef.current) return;
    const timeSinceLastSubmission = Date.now() - lastSubmissionTimeRef.current;
    if (timeSinceLastSubmission < 5000) return; // 5 second cooldown after submission
    
    const timer = setTimeout(() => {
      // Double-check we're not submitting before saving
      if (!isSubmittingRef.current && !submitRowMutation.isPending) {
        saveMutation.mutate(rows);
      }
    }, 3_000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, responseStatus, hasEditableRows, hasUnsaved]);

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
    isSubmittingRef.current = true;
    lastSubmissionTimeRef.current = Date.now();
    submitRowMutation.mutate(rowIndex, {
      onSettled: () => {
        isSubmittingRef.current = false;
      }
    });
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
      {/* Header - with Description & Instructions inside */}
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
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
          
          {/* Description */}
          {tableWithNotes.description && (
            <div className="mt-3 flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{tableWithNotes.description}</p>
            </div>
          )}
          
          {/* Instructions */}
          {tableWithNotes.notes && (
            <div className="mt-3 relative overflow-hidden rounded-xl border-l-4 border-amber-500 bg-white shadow-sm">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
              <div className="flex gap-3 p-3">
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg p-2 shadow-md">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
                    className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-300">
                      📋 TƏLİMAT
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-amber-200 to-transparent"></div>
                    {isInstructionsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-amber-600" />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isInstructionsExpanded ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {tableWithNotes.notes}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
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

      {/* Table area - full width */}
      <div className="p-4">
        {tableHasErrors && !isSubmitted && (
          <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Xanalarındakı xətaları düzəldin, sonra göndərin.
          </div>
        )}

        {console.log('DEBUG fixedRows prop:', tableWithNotes.fixed_rows)}
        {(responseLoading || detailsLoading) ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <EditableTable
            columns={tableWithNotes.columns ?? []}
            rows={rows}
            maxRows={tableWithNotes.max_rows ?? 50}
            fixedRows={tableWithNotes.fixed_rows ?? null}
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
