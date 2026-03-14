import { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Info, 
  FileText, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Circle
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
  onMetaChange?: (meta: {
    hasUnsaved: boolean;
    responseStatus: 'draft' | 'submitted' | null;
    fullyLocked: boolean;
    hasEditableRows: boolean;
    lastSaved: Date | null;
    isSaving: boolean;
  }) => void;
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
    queryFn: () => reportTableService.getTable(table.id),
    enabled: !!table.id,
    staleTime: 30_000,
  });

  // Merge table data with details (notes comes from either source)
  const tableWithNotes = useMemo(() => {
    const notes = tableDetails?.notes ?? table.notes;
    const fixedRows = tableDetails?.fixed_rows ?? table.fixed_rows;
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
  // Optimistically treat just-submitted rows as locked until query re-fetches
  const [optimisticSubmittedRows, setOptimisticSubmittedRows] = useState<Set<number>>(new Set());
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);

  const initialRowsRef = useRef<string>('');
  const isSubmittingRef = useRef<boolean>(false);
  const lastSubmissionTimeRef = useRef<number>(0);
  // Tracks whether rows have been initialized from existingResponse.
  // Prevents tableWithNotes loading from resetting user edits.
  const hasInitializedRowsRef = useRef<boolean>(false);

  // ─── Load existing response ────────────────────────────────────────────────

  const { data: existingResponse, isLoading: responseLoading } = useQuery({
    queryKey: ['report-table-my-response', table.id],
    queryFn: () => reportTableService.getMyResponse(table.id),
    refetchInterval: 60_000,
  });

  // Effect A: sync rows only on initial load from existingResponse.
  // Subsequent re-fetches (after cache invalidation) update metadata only,
  // never overwriting user edits in the rows state.
  useEffect(() => {
    if (!existingResponse) return;

    setResponseId(existingResponse.id);
    setResponseStatus(existingResponse.status);
    if (existingResponse.status === 'draft' || existingResponse.status === 'submitted') {
      onStatusChange?.(table.id, existingResponse.status);
    }

    if (!hasInitializedRowsRef.current) {
      setRows(existingResponse.rows ?? []);
      initialRowsRef.current = JSON.stringify(existingResponse.rows ?? []);
      hasInitializedRowsRef.current = true;
    }
  }, [existingResponse, table.id, onStatusChange]);

  // Effect B: initialize empty rows for stable (fixed_rows) tables,
  // only when there is no existing response yet.
  useEffect(() => {
    if (hasInitializedRowsRef.current || existingResponse) return;
    if (tableWithNotes.fixed_rows && tableWithNotes.fixed_rows.length > 0) {
      const emptyRows = tableWithNotes.fixed_rows.map(() => {
        const row: Record<string, string> = {};
        tableWithNotes.columns?.forEach((col) => { row[col.key] = ''; });
        return row;
      });
      setRows(emptyRows);
    }
  }, [tableWithNotes.fixed_rows, tableWithNotes.columns, existingResponse]);

  const rawRowStatuses = existingResponse?.row_statuses ?? {};

  // A row status is "final" when it can no longer be edited by the user.
  const isFinalRowStatus = (status: string | undefined) =>
    status === 'submitted' || status === 'approved';

  // Merge backend row statuses with optimistic updates.
  // Once the query re-fetches and the backend confirms the status, optimistic entry is superseded.
  const rowStatuses = useMemo(() => {
    const base = existingResponse?.row_statuses ?? {};
    if (optimisticSubmittedRows.size === 0) return base;
    const merged = { ...base };
    optimisticSubmittedRows.forEach((idx) => {
      const existing = merged[String(idx)];
      if (!existing || !isFinalRowStatus(existing.status)) {
        merged[String(idx)] = { status: 'submitted' };
      }
    });
    return merged;
  }, [existingResponse?.row_statuses, optimisticSubmittedRows]);

  // Clear optimistic entries once the backend confirms the row status
  useEffect(() => {
    if (optimisticSubmittedRows.size === 0) return;
    setOptimisticSubmittedRows((prev) => {
      const updated = new Set(prev);
      prev.forEach((idx) => {
        if (isFinalRowStatus(rawRowStatuses[String(idx)]?.status)) {
          updated.delete(idx);
        }
      });
      return updated.size === prev.size ? prev : updated;
    });
  }, [rawRowStatuses]);

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
    const canAddRowsAfterConfirmation = table.allow_additional_rows_after_confirmation === true;
    const fullyLocked = responseStatus === 'submitted' && !hasEditableRows && !canAddRowsAfterConfirmation;
    setHasUnsaved(current !== initialRowsRef.current && !fullyLocked);
  }, [rows, responseStatus, hasEditableRows, table.allow_additional_rows_after_confirmation]);

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
      // Sync the baseline so hasUnsaved becomes false.
      // Do NOT call invalidateQueries here — the Effect A guard means any
      // re-fetch would skip overwriting rows, but the extra network round-trip
      // is unnecessary since we already have the latest data from the save response.
      initialRowsRef.current = JSON.stringify(rows);
      setHasUnsaved(false);
      // Update respondentId in case this was the first save (response just created)
      if (!responseId) {
        hasInitializedRowsRef.current = true;
      }
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
    onSuccess: (_data, rowIndex) => {
      // Optimistically mark row as submitted immediately, before query re-fetch completes
      setOptimisticSubmittedRows((prev) => { const s = new Set(prev); s.add(rowIndex); return s; });
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
  // Prevent auto-save during row submission to avoid race conditions.
  // Note: hasNonEmptyRows check removed — deletions must also be persisted.

  useEffect(() => {
    const canAddRowsAfterConfirmation = table.allow_additional_rows_after_confirmation === true;
    const fullyLocked = responseStatus === 'submitted' && !hasEditableRows && !canAddRowsAfterConfirmation;
    if (fullyLocked || !hasUnsaved) return;

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
  }, [rows, responseStatus, hasEditableRows, hasUnsaved, table.allow_additional_rows_after_confirmation]);

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
  const canAddRowsAfterConfirmation = table.allow_additional_rows_after_confirmation === true;
  const fullyLocked = isSubmitted && !hasEditableRows && !canAddRowsAfterConfirmation;

  // Called by EditableTable after a row is removed locally.
  // Triggers an immediate save so the deletion is persisted without waiting for auto-save.
  const handleRowRemoved = useCallback(() => {
    if (fullyLocked || saveMutation.isPending) return;
    // Use functional form to access the latest rows state after the state flush
    setRows((latestRows) => {
      saveMutation.mutate(latestRows);
      return latestRows;
    });
  }, [fullyLocked, saveMutation]);

  useEffect(() => {
    const statusForMeta = responseStatus === 'submitted' ? 'submitted' : 'draft';
    onMetaChange?.({
      hasUnsaved,
      responseStatus: responseStatus ? statusForMeta : null,
      fullyLocked,
      hasEditableRows,
      lastSaved,
      isSaving: saveMutation.isPending,
    });
  }, [hasUnsaved, responseStatus, fullyLocked, hasEditableRows, lastSaved, saveMutation.isPending, onMetaChange]);

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
    [fullyLocked, rows, handleSubmitClick]
  );

  const deadlineBadge = useMemo(() => {
    if (!table.deadline) return null;
    const days = Math.ceil((new Date(table.deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Son tarix keçib</Badge>;
    if (days <= 3) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{days} gün qalıb</Badge>;
    return <span className="text-xs text-gray-400">Son tarix: {new Date(table.deadline).toLocaleDateString('az-AZ')}</span>;
  }, [table.deadline]);

  // ─── Row Status Summary ─────────────────────────────────────────────────────

  const rowStatusSummary = useMemo(() => {
    if (!existingResponse || rows.length === 0) return null;
    
    const stats = {
      approved: 0,
      submitted: 0,
      rejected: 0,
      draft: 0,
      empty: 0,
    };
    
    rows.forEach((row, idx) => {
      const status = rowStatuses[String(idx)]?.status;
      const isEmpty = Object.values(row).every(v => v === '' || v === null || v === undefined);
      
      if (isEmpty) {
        stats.empty++;
      } else if (status === 'approved') {
        stats.approved++;
      } else if (status === 'submitted') {
        stats.submitted++;
      } else if (status === 'rejected') {
        stats.rejected++;
      } else {
        stats.draft++;
      }
    });
    
    const total = rows.length;
    const filled = total - stats.empty;
    
    return { ...stats, total, filled };
  }, [rows, rowStatuses, existingResponse]);

  const StatusBadgeItem = ({ 
    icon: Icon, 
    count, 
    label, 
    colorClass 
  }: { 
    icon: React.ElementType; 
    count: number; 
    label: string; 
    colorClass: string;
  }) => {
    if (count === 0) return null;
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${colorClass}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>{count} {label}</span>
      </div>
    );
  };

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
          <>
            {/* Row Status Summary */}
            {rowStatusSummary && rowStatusSummary.filled > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusBadgeItem 
                  icon={CheckCircle2} 
                  count={rowStatusSummary.approved} 
                  label="təsdiqləndi" 
                  colorClass="bg-emerald-100 text-emerald-700 border border-emerald-200" 
                />
                <StatusBadgeItem 
                  icon={Clock} 
                  count={rowStatusSummary.submitted} 
                  label="gözləyir" 
                  colorClass="bg-blue-100 text-blue-700 border border-blue-200" 
                />
                <StatusBadgeItem 
                  icon={XCircle} 
                  count={rowStatusSummary.rejected} 
                  label="rədd edildi" 
                  colorClass="bg-red-100 text-red-700 border border-red-200" 
                />
                <StatusBadgeItem 
                  icon={Circle} 
                  count={rowStatusSummary.draft} 
                  label="qaralama" 
                  colorClass="bg-gray-100 text-gray-700 border border-gray-200" 
                />
                <StatusBadgeItem 
                  icon={AlertTriangle} 
                  count={rowStatusSummary.empty} 
                  label="boş" 
                  colorClass="bg-amber-50 text-amber-600 border border-amber-200" 
                />
              </div>
            )}
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
              onRowRemoved={handleRowRemoved}
            />
          </>
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
