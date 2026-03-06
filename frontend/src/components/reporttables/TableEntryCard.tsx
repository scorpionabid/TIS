import { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Info, 
  FileText, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { EditableTable } from './EditableTable';
import { reportTableService } from '@/services/reportTables';
import type { ReportTable, ReportTableResponse, ReportTableResponseStatus, ReportTableRow } from '@/types/reportTable';

// ─── TableEntryCard ───────────────────────────────────────────────────────────

interface TableEntryCardProps {
  table: ReportTable;
  onStatusChange?: (tableId: number, status: 'draft' | 'submitted') => void;
  onMetaChange?: (meta: { hasUnsaved: boolean; responseStatus: 'draft' | 'submitted' | null; fullyLocked: boolean }) => void;
}

export type TableEntryCardHandle = {
  save: () => void;
  export: () => void;
  submitAll: () => void;
};

export const TableEntryCard = forwardRef<TableEntryCardHandle, TableEntryCardProps>(function TableEntryCard(
  { table, onStatusChange, onMetaChange }: TableEntryCardProps,
  ref
) {
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
  const [responseStatus, setResponseStatus] = useState<ReportTableResponseStatus | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [tableHasErrors, setTableHasErrors] = useState(false);
  const [submittingRowIdx, setSubmittingRowIdx] = useState<number | null>(null);
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);

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
      if (existingResponse.status === 'draft' || existingResponse.status === 'submitted') {
        onStatusChange?.(table.id, existingResponse.status);
      }
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

  useEffect(() => {
    const statusForMeta = responseStatus === 'submitted' ? 'submitted' : 'draft';
    onMetaChange?.({ hasUnsaved, responseStatus: responseStatus ? statusForMeta : null, fullyLocked });
  }, [hasUnsaved, responseStatus, fullyLocked, onMetaChange]);

  useImperativeHandle(
    ref,
    () => ({
      save: () => {
        if (fullyLocked || saveMutation.isPending) return;
        saveMutation.mutate(rows);
      },
      export: () => {
        if (exportMutation.isPending) return;
        exportMutation.mutate();
      },
      submitAll: () => {
        if (fullyLocked || submitMutation.isPending) return;
        handleSubmitClick();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fullyLocked, rows, handleSubmitClick]
  );

  const deadlineBadge = useMemo(() => {
    if (!table.deadline) return null;
    const days = Math.ceil((new Date(table.deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Son tarix keçib</Badge>;
    if (days <= 3) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{days} gün qalıb</Badge>;
    return <span className="text-xs text-gray-400">Son tarix: {new Date(table.deadline).toLocaleDateString('az-AZ')}</span>;
  }, [table.deadline]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      {(table.description || tableWithNotes.notes) && (
        <div className="border-b bg-white">
          <button
            type="button"
            onClick={() => setIsInstructionsExpanded((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <Info className="h-4 w-4 text-emerald-600" />
              Açıqlama və təlimat
              {!isInstructionsExpanded && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5 animate-pulse" />
                  Açmaq üçün klikləyin
                </span>
              )}
            </div>
            {isInstructionsExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {isInstructionsExpanded && (
            <div className="px-4 pb-4 space-y-2">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-1">
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  Açıqlama
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {table.description || 'Açıqlama yoxdur'}
                </div>
              </div>
              <div className="rounded-lg p-2.5 border border-emerald-200 bg-gradient-to-r from-emerald-50 via-amber-50 to-sky-50">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1">
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  Təlimat
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {tableWithNotes.notes || 'Təlimat yoxdur'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table area - full width */}
      <div className="p-4">
        {tableHasErrors && !isSubmitted && (
          <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Xanalarındakı xətaları düzəldin, sonra göndərin.
          </div>
        )}

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
            hideKeyboardHelp
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
});
