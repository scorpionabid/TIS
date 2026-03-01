import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import { toast } from 'sonner';

import { reportTableService } from '@/services/reportTables';
import {
  ApprovalQueueTable,
  ApprovalQueueResponse,
  BulkRowSpec,
  ReportTableColumn,
  RowStatuses,
} from '@/types/reportTable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ─── Types ────────────────────────────────────────────────────────────────────

type BulkAction = 'approve' | 'reject' | 'return';

interface SelectedKey {
  tableId: number;
  responseId: number;
  rowIndex: number;
}

function makeKey(responseId: number, rowIndex: number): string {
  return `${responseId}:${rowIndex}`;
}

function parseKey(key: string): { responseId: number; rowIndex: number } {
  const [r, i] = key.split(':');
  return { responseId: Number(r), rowIndex: Number(i) };
}

// ─── Row Cell Renderer ────────────────────────────────────────────────────────

function cellValue(
  row: Record<string, string | number | null>,
  col: ReportTableColumn
): string {
  const v = row[col.key];
  if (v === null || v === undefined || v === '') return '—';
  if (col.type === 'boolean') return v ? 'Bəli' : 'Xeyr';
  return String(v);
}

// ─── Bulk Action Dialog ───────────────────────────────────────────────────────

interface BulkActionDialogProps {
  open: boolean;
  action: BulkAction | null;
  count: number;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  loading: boolean;
}

function BulkActionDialog({ open, action, count, onClose, onConfirm, loading }: BulkActionDialogProps) {
  const [reason, setReason] = useState('');

  const labels: Record<BulkAction, string> = {
    approve: 'Təsdiqlə',
    reject: 'Rədd et',
    return: 'Qaralamaya qaytar',
  };

  const handleConfirm = () => {
    if (action === 'reject' && !reason.trim()) return;
    onConfirm(action === 'reject' ? reason : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action ? labels[action] : ''} — {count} sətir
          </DialogTitle>
          <div className="sr-only">
            {count} sətir üzərində toplu əməliyyat üçün təsdiq pəncərəsi
          </div>
        </DialogHeader>

        {action === 'reject' && (
          <div className="space-y-2">
            <Label htmlFor="bulk-reason">Rədd səbəbi <span className="text-destructive">*</span></Label>
            <Textarea
              id="bulk-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Rədd səbəbini daxil edin..."
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Ləğv et</Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (action === 'reject' && !reason.trim())}
            variant={action === 'reject' ? 'destructive' : 'default'}
          >
            {loading ? 'Emal olunur...' : labels[action ?? 'approve']}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Single Row Actions ───────────────────────────────────────────────────────

interface RowActionsProps {
  tableId: number;
  responseId: number;
  rowIndex: number;
  rowStatuses: RowStatuses;
  onDone: () => void;
}

function RowActions({ tableId, responseId, rowIndex, rowStatuses, onDone }: RowActionsProps) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const status = rowStatuses[String(rowIndex)]?.status;

  const approveMutation = useMutation({
    mutationFn: () => reportTableService.approveRow(tableId, responseId, rowIndex),
    onSuccess: () => { toast.success('Sətir təsdiqləndi.'); onDone(); },
    onError: () => toast.error('Xəta baş verdi.'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => reportTableService.rejectRow(tableId, responseId, rowIndex, reason),
    onSuccess: () => { toast.success('Sətir rədd edildi.'); setShowReject(false); onDone(); },
    onError: () => toast.error('Xəta baş verdi.'),
  });

  const returnMutation = useMutation({
    mutationFn: () => reportTableService.returnRow(tableId, responseId, rowIndex),
    onSuccess: () => { toast.success('Sətir qaralamaya qaytarıldı.'); onDone(); },
    onError: () => toast.error('Xəta baş verdi.'),
  });

  if (status !== 'submitted') return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-green-600 hover:bg-green-50"
        title="Təsdiqlə"
        onClick={() => approveMutation.mutate()}
        disabled={approveMutation.isPending}
      >
        <CheckCircle className="h-4 w-4" />
      </Button>

      {showReject ? (
        <div className="flex items-center gap-1">
          <input
            className="h-7 text-xs border rounded px-1 w-32"
            placeholder="Rədd səbəbi..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && reason.trim()) rejectMutation.mutate();
              if (e.key === 'Escape') setShowReject(false);
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-600 hover:bg-red-50"
            onClick={() => rejectMutation.mutate()}
            disabled={!reason.trim() || rejectMutation.isPending}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-red-600 hover:bg-red-50"
          title="Rədd et"
          onClick={() => setShowReject(true)}
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-amber-600 hover:bg-amber-50"
        title="Qaralamaya qaytar"
        onClick={() => returnMutation.mutate()}
        disabled={returnMutation.isPending}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── School Block ─────────────────────────────────────────────────────────────

interface SchoolBlockProps {
  tableId: number;
  response: ApprovalQueueResponse;
  columns: ReportTableColumn[];
  selected: Set<string>;
  onToggleRow: (key: string) => void;
  onToggleAll: (responseId: number, indices: number[]) => void;
  onDone: () => void;
}

function SchoolBlock({
  tableId,
  response,
  columns,
  selected,
  onToggleRow,
  onToggleAll,
  onDone,
}: SchoolBlockProps) {
  const [expanded, setExpanded] = useState(true);

  const allKeys = response.pending_row_indices.map(i => makeKey(response.id, i));
  const allSelected = allKeys.length > 0 && allKeys.every(k => selected.has(k));
  const someSelected = allKeys.some(k => selected.has(k));

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <Checkbox
          checked={allSelected}
          data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
          onCheckedChange={() => onToggleAll(response.id, response.pending_row_indices)}
          onClick={e => e.stopPropagation()}
          className="shrink-0"
        />
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium text-sm flex-1">{response.institution.name}</span>
        {response.institution.parent && (
          <span className="text-xs text-muted-foreground">{response.institution.parent.name}</span>
        )}
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs shrink-0">
          {response.pending_row_indices.length} gözləyir
        </Badge>
      </div>

      {/* Rows Table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/10">
                <th className="w-8 px-2 py-1.5"></th>
                <th className="px-2 py-1.5 text-left text-muted-foreground font-medium w-8">#</th>
                {columns.map(col => (
                  <th key={col.key} className="px-2 py-1.5 text-left text-muted-foreground font-medium whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                <th className="px-2 py-1.5 text-left text-muted-foreground font-medium whitespace-nowrap">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {response.pending_row_indices.map(rowIndex => {
                const row = response.rows[rowIndex] ?? {};
                const key = makeKey(response.id, rowIndex);
                return (
                  <tr key={rowIndex} className="border-b last:border-0 hover:bg-amber-50/50">
                    <td className="px-2 py-1.5">
                      <Checkbox
                        checked={selected.has(key)}
                        onCheckedChange={() => onToggleRow(key)}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{rowIndex + 1}</td>
                    {columns.map(col => (
                      <td key={col.key} className="px-2 py-1.5 whitespace-nowrap">
                        {cellValue(row as Record<string, string | number | null>, col)}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <RowActions
                        tableId={tableId}
                        responseId={response.id}
                        rowIndex={rowIndex}
                        rowStatuses={response.row_statuses}
                        onDone={onDone}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Table Block ──────────────────────────────────────────────────────────────

interface TableBlockProps {
  item: ApprovalQueueTable;
  selected: Set<string>;
  onToggleRow: (key: string) => void;
  onToggleAll: (responseId: number, indices: number[]) => void;
  onToggleTable: (item: ApprovalQueueTable) => void;
  onDone: () => void;
}

function TableBlock({ item, selected, onToggleRow, onToggleAll, onToggleTable, onDone }: TableBlockProps) {
  const [expanded, setExpanded] = useState(true);

  const allTableKeys = item.responses.flatMap(r =>
    r.pending_row_indices.map(i => makeKey(r.id, i))
  );
  const allSelected = allTableKeys.length > 0 && allTableKeys.every(k => selected.has(k));
  const someSelected = allTableKeys.some(k => selected.has(k));

  const deadlineLabel = item.table.deadline
    ? new Date(item.table.deadline).toLocaleDateString('az-AZ')
    : null;

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      {/* Table Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 bg-muted/20 cursor-pointer hover:bg-muted/30 select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <Checkbox
          checked={allSelected}
          data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
          onCheckedChange={() => onToggleTable(item)}
          onClick={e => e.stopPropagation()}
          className="shrink-0"
        />
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-semibold text-sm flex-1">{item.table.title}</span>
        {deadlineLabel && (
          <span className="text-xs text-muted-foreground">Son tarix: {deadlineLabel}</span>
        )}
        <Badge className="bg-amber-500 text-white text-xs shrink-0">
          {item.pending_count} gözləyir
        </Badge>
      </div>

      {/* Schools */}
      {expanded && (
        <div className="p-3 space-y-2">
          {item.responses.map(response => (
            <SchoolBlock
              key={response.id}
              tableId={item.table.id}
              response={response}
              columns={item.table.columns}
              selected={selected}
              onToggleRow={onToggleRow}
              onToggleAll={onToggleAll}
              onDone={onDone}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportTableApprovalQueue() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);

  const { data: queue = [], isLoading, isError } = useQuery({
    queryKey: ['report-table-approval-queue'],
    queryFn: () => reportTableService.getApprovalQueue(),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['report-table-approval-queue'] });
    setSelected(new Set());
  };

  const bulkMutation = useMutation({
    mutationFn: ({ tableId, rowSpecs, action, reason }: {
      tableId: number;
      rowSpecs: BulkRowSpec[];
      action: BulkAction;
      reason?: string;
    }) => reportTableService.bulkRowAction(tableId, rowSpecs, action, reason),
    onSuccess: (result) => {
      toast.success(`${result.successful} sətir uğurla emal edildi.`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} sətir emal edilmədi.`);
      }
      setBulkAction(null);
      invalidate();
    },
    onError: () => toast.error('Xəta baş verdi.'),
  });

  // ─── Selection Helpers ─────────────────────────────────────────────────────

  const toggleRow = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (responseId: number, indices: number[]) => {
    const keys = indices.map(i => makeKey(responseId, i));
    const allHave = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      if (allHave) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const toggleTable = (item: ApprovalQueueTable) => {
    const keys = item.responses.flatMap(r =>
      r.pending_row_indices.map(i => makeKey(r.id, i))
    );
    const allHave = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      if (allHave) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  // ─── Bulk Action Handler ───────────────────────────────────────────────────

  // Build rowSpecs per table from selected keys
  const selectedByTable = useMemo(() => {
    const map = new Map<number, Map<number, number[]>>();
    for (const key of selected) {
      const { responseId, rowIndex } = parseKey(key);
      // find tableId for this responseId
      for (const item of queue) {
        const found = item.responses.find(r => r.id === responseId);
        if (found) {
          if (!map.has(item.table.id)) map.set(item.table.id, new Map());
          const respMap = map.get(item.table.id)!;
          if (!respMap.has(responseId)) respMap.set(responseId, []);
          respMap.get(responseId)!.push(rowIndex);
          break;
        }
      }
    }
    return map;
  }, [selected, queue]);

  const handleBulkConfirm = (reason?: string) => {
    if (!bulkAction) return;
    // Execute bulk action per table
    const entries = [...selectedByTable.entries()];
    if (entries.length === 0) return;

    // For simplicity, handle all in parallel (one mutation per table)
    // In practice there's usually 1-2 tables selected
    const promises = entries.map(([tableId, respMap]) => {
      const rowSpecs: BulkRowSpec[] = [...respMap.entries()].map(([responseId, rowIndices]) => ({
        response_id: responseId,
        row_indices: rowIndices,
      }));
      return bulkMutation.mutateAsync({ tableId, rowSpecs, action: bulkAction, reason });
    });

    Promise.all(promises).catch(() => {
      // handled in onError
    });
  };

  const selectedCount = selected.size;
  const totalPending = queue.reduce((s, t) => s + t.pending_count, 0);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Məlumatlar yüklənərkən xəta baş verdi.</AlertDescription>
      </Alert>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Inbox className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Gözləyən sətir yoxdur</p>
        <p className="text-xs mt-1">Bütün göndərilmiş sətirlər emal olunub.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary + Bulk Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Cəmi <span className="font-semibold text-amber-600">{totalPending}</span> gözləyən sətir
          {selectedCount > 0 && (
            <span className="ml-2 text-foreground">
              · <span className="font-semibold">{selectedCount}</span> seçilib
            </span>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              className="text-xs"
            >
              Seçimi ləğv et
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
              onClick={() => setBulkAction('approve')}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Seçilənləri Təsdiqlə
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs gap-1"
              onClick={() => setBulkAction('reject')}
            >
              <XCircle className="h-3.5 w-3.5" />
              Seçilənləri Rədd et
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1 text-amber-600 border-amber-300"
              onClick={() => setBulkAction('return')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Qaralamaya qaytar
            </Button>
          </div>
        )}
      </div>

      {/* Table Blocks */}
      <div className="space-y-4">
        {queue.map(item => (
          <TableBlock
            key={item.table.id}
            item={item}
            selected={selected}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            onToggleTable={toggleTable}
            onDone={invalidate}
          />
        ))}
      </div>

      {/* Bulk Action Dialog */}
      <BulkActionDialog
        open={bulkAction !== null}
        action={bulkAction}
        count={selectedCount}
        onClose={() => setBulkAction(null)}
        onConfirm={handleBulkConfirm}
        loading={bulkMutation.isPending}
      />
    </div>
  );
}

export default ReportTableApprovalQueue;
