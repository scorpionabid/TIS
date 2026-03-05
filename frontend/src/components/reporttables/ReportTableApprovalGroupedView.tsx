import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, ChevronDown, Inbox, RotateCcw, XCircle, Search, AlertCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { reportTableService, type ApprovalQueueGroupedTable } from '@/services/reportTables';
import type { ReportTableColumn, RowStatuses, BulkRowSpec } from '@/types/reportTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { formatCellValue } from '@/utils/cellValue';

// ─── Helper functions for row keys ────────────────────────────────────────────

function makeKey(responseId: number, rowIndex: number): string {
  return `${responseId}:${rowIndex}`;
}

function parseKey(key: string): { responseId: number; rowIndex: number } {
  const [responseId, rowIndex] = key.split(':').map(Number);
  return { responseId, rowIndex };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BulkAction = 'approve' | 'reject' | 'return';

// ─── Bulk Action Dialog ─────────────────────────────────────────────────────

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

function RowActions({
  tableId,
  responseId,
  rowIndex,
  rowStatuses,
  onDone,
}: {
  tableId: number;
  responseId: number;
  rowIndex: number;
  rowStatuses: RowStatuses;
  onDone: () => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const status = rowStatuses[String(rowIndex)]?.status;

  const approveMutation = useMutation({
    mutationFn: () => reportTableService.approveRow(tableId, responseId, rowIndex),
    onSuccess: () => {
      toast.success('Sətir təsdiqləndi.');
      onDone();
    },
    onError: () => toast.error('Xəta baş verdi.'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => reportTableService.rejectRow(tableId, responseId, rowIndex, reason),
    onSuccess: () => {
      toast.success('Sətir rədd edildi.');
      setShowReject(false);
      setReason('');
      onDone();
    },
    onError: () => toast.error('Xəta baş verdi.'),
  });

  const returnMutation = useMutation({
    mutationFn: () => reportTableService.returnRow(tableId, responseId, rowIndex),
    onSuccess: () => {
      toast.success('Sətir qaralamaya qaytarıldı.');
      onDone();
    },
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
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && reason.trim()) rejectMutation.mutate();
              if (e.key === 'Escape') {
                setShowReject(false);
                setReason('');
              }
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

// ─── Missing Schools Section ────────────────────────────────────────────────

function MissingSchoolsSection({ tableId }: { tableId: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | 'all'>('all');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['table-fill-statistics', tableId],
    queryFn: () => reportTableService.getTableFillStatistics(tableId),
    enabled: isExpanded,
  });

  const notFilledSchools = useMemo(() => {
    if (!stats?.schools) return [];
    return stats.schools.filter((s: any) => !s.is_filled);
  }, [stats]);

  const sectors = useMemo(() => {
    const sectorSet = new Set<string>();
    notFilledSchools.forEach((s: any) => {
      sectorSet.add(s.sector_name || 'Sektor yoxdur');
    });
    return Array.from(sectorSet).sort();
  }, [notFilledSchools]);

  const filteredSchools = useMemo(() => {
    if (selectedSector === 'all') return notFilledSchools;
    return notFilledSchools.filter((s: any) => 
      (s.sector_name || 'Sektor yoxdur') === selectedSector
    );
  }, [notFilledSchools, selectedSector]);

  if (!isExpanded) {
    return (
      <div className="border-t pt-4 mt-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-colors"
        >
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Doldurmayan məktəbləri göstər</span>
          {stats && (
            <Badge variant="destructive" className="ml-2">
              {notFilledSchools.length} məktəb
            </Badge>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-2 text-red-700 font-medium hover:text-red-800"
        >
          <ChevronDown className="h-5 w-5" />
          Doldurmayan məktəblər
          {!isLoading && stats && (
            <Badge variant="destructive" className="ml-2">
              {notFilledSchools.length} məktəb
            </Badge>
          )}
        </button>

        {/* Sector Filter */}
        {sectors.length > 1 && (
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">Bütün sektorlar</option>
            {sectors.map(sector => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      ) : notFilledSchools.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-700">
          <CheckCircle className="h-5 w-5 inline mr-2" />
          Bütün məktəblər bu cədvəli doldurub!
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredSchools.map((school: any) => (
            <div
              key={school.institution_id}
              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-sm">{school.institution_name}</p>
                  {school.sector_name && (
                    <p className="text-xs text-gray-500">{school.sector_name}</p>
                  )}
                </div>
              </div>
              <Badge variant="destructive">Başlanmayıb</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportTableApprovalGroupedView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
  const [expandedSchools, setExpandedSchools] = useState<Record<string, boolean>>({});
  
  // ─── Bulk Selection State ────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);

  const { data: grouped = [], isLoading, isError } = useQuery<ApprovalQueueGroupedTable[]>({
    queryKey: ['report-table-approval-queue-grouped'],
    queryFn: () => reportTableService.getApprovalQueueGrouped(),
    refetchInterval: 30_000,
  });

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = q ? grouped.filter(t => t.table.title.toLowerCase().includes(q)) : [...grouped];
    // Sort by deadline (most recent first) or by id (highest first) as fallback
    return filtered.sort((a, b) => {
      const aDate = a.table.deadline ? new Date(a.table.deadline).getTime() : 0;
      const bDate = b.table.deadline ? new Date(b.table.deadline).getTime() : 0;
      if (aDate && bDate) return bDate - aDate;
      return b.table.id - a.table.id;
    });
  }, [grouped, search]);

  const selected = useMemo(() => {
    if (selectedTableId) return grouped.find(t => t.table.id === selectedTableId) ?? null;
    return null;
  }, [grouped, selectedTableId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['report-table-approval-queue-grouped'] });
    queryClient.invalidateQueries({ queryKey: ['report-table-approval-queue'] });
    queryClient.invalidateQueries({ queryKey: ['approved-responses'] });
    queryClient.invalidateQueries({ queryKey: ['report-table-responses'] });
    setSelectedRows(new Set());
  };

  // ─── Bulk Mutation ───────────────────────────────────────────────────────
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

  // ─── Selection Helpers ───────────────────────────────────────────────────
  const toggleRow = (key: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleResponse = (responseId: number, pendingIndices: number[]) => {
    const keys = pendingIndices.map(i => makeKey(responseId, i));
    const allHave = keys.every(k => selectedRows.has(k));
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (allHave) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const toggleSchool = (schoolNode: { responses: Array<{ id: number; pending_row_indices?: number[] }> }) => {
    const keys = schoolNode.responses.flatMap(r =>
      (r.pending_row_indices ?? []).map(i => makeKey(r.id, i))
    );
    const allHave = keys.every(k => selectedRows.has(k));
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (allHave) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const toggleSector = (sectorNode: { schools: Array<{ responses: Array<{ id: number; pending_row_indices?: number[] }> }> }) => {
    const keys = sectorNode.schools.flatMap(s =>
      s.responses.flatMap(r => (r.pending_row_indices ?? []).map(i => makeKey(r.id, i)))
    );
    const allHave = keys.every(k => selectedRows.has(k));
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (allHave) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  // ─── Build rowSpecs for bulk action ──────────────────────────────────────
  const selectedByTable = useMemo(() => {
    const map = new Map<number, Map<number, number[]>>();
    for (const key of selectedRows) {
      const { responseId, rowIndex } = parseKey(key);
      // Find tableId for this responseId
      for (const table of grouped) {
        for (const sector of table.sectors) {
          for (const school of sector.schools) {
            const found = school.responses.find(r => r.id === responseId);
            if (found) {
              if (!map.has(table.table.id)) map.set(table.table.id, new Map());
              const respMap = map.get(table.table.id)!;
              if (!respMap.has(responseId)) respMap.set(responseId, []);
              respMap.get(responseId)!.push(rowIndex);
              break;
            }
          }
        }
      }
    }
    return map;
  }, [selectedRows, grouped]);

  const handleBulkConfirm = (reason?: string) => {
    if (!bulkAction) return;
    const entries = [...selectedByTable.entries()];
    if (entries.length === 0) return;

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

  // ─── Calculate totals ───────────────────────────────────────────────────
  const totalPendingForSelected = useMemo(() => {
    if (!selected) return 0;
    return selected.sectors.reduce((sum, sector) =>
      sum + sector.schools.reduce((s, school) => s + (school.pending_count ?? 0), 0), 0);
  }, [selected]);

  const selectedCount = selectedRows.size;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
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

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Inbox className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Gözləyən sətir yoxdur</p>
        <p className="text-xs mt-1">Bütün göndərilmiş sətirlər emal olunub.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      <div className="lg:w-[380px] shrink-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cədvəl axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="text-sm font-medium text-gray-700">Təsdiq gözləyən cədvəllər</p>
            <p className="text-xs text-gray-500">Klik edin və sağ paneldə görün</p>
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y">
            {filteredTables.map((t) => {
              const isSelected = selectedTableId === t.table.id;
              return (
                <button
                  key={t.table.id}
                  type="button"
                  onClick={() => setSelectedTableId(t.table.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-amber-50 border-l-4 border-amber-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-sm truncate ${isSelected ? 'text-amber-700' : 'text-gray-800'}`}>
                        {t.table.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Badge className="bg-amber-500 text-white text-xs shrink-0">{t.pending_count}</Badge>
                          gözləyir
                        </span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="h-4 w-4 text-amber-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {selected ? (
          <div className="h-full flex flex-col">
            {/* Summary + Bulk Actions Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-gray-50 border-b rounded-t-lg">
              <div className="text-sm text-muted-foreground">
                Cəmi <span className="font-semibold text-amber-600">{totalPendingForSelected}</span> gözləyən sətir
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
                    onClick={() => setSelectedRows(new Set())}
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 p-3">
              {selected.sectors.map((sectorNode, sectorIdx) => {
                const sectorKey = String(sectorNode.sector?.id ?? `null-${sectorIdx}`);
                const sectorExpanded = expandedSectors[sectorKey] ?? false;
                
                // Calculate sector selection state
                const sectorKeys = sectorNode.schools.flatMap(s =>
                  s.responses.flatMap(r => (r.pending_row_indices ?? []).map(i => makeKey(r.id, i)))
                );
                const sectorAllSelected = sectorKeys.length > 0 && sectorKeys.every(k => selectedRows.has(k));
                const sectorSomeSelected = sectorKeys.some(k => selectedRows.has(k));

                return (
                  <div key={sectorKey} className="border rounded-lg overflow-hidden">
                    {/* Sector Header */}
                    <div className="w-full flex items-center gap-2 px-4 py-3 bg-muted/20 hover:bg-muted/30 text-left">
                      <Checkbox
                        checked={sectorAllSelected}
                        data-state={sectorSomeSelected && !sectorAllSelected ? 'indeterminate' : undefined}
                        onCheckedChange={() => toggleSector(sectorNode)}
                        className="shrink-0"
                      />
                      <button
                        type="button"
                        className="flex items-center gap-2 flex-1"
                        onClick={() => setExpandedSectors(prev => ({ ...prev, [sectorKey]: !sectorExpanded }))}
                      >
                        {sectorExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-semibold text-sm">
                          {sectorNode.sector?.name ?? 'Sektor yoxdur'}
                        </span>
                      </button>
                      <Badge className="bg-amber-500 text-white text-xs shrink-0">
                        {sectorNode.pending_count ?? 0} gözləyir
                      </Badge>
                    </div>

                    {sectorExpanded && (
                      <div className="p-3 space-y-3">
                        {sectorNode.schools.map((schoolNode) => {
                          const schoolKey = `${sectorKey}:${schoolNode.school.id}`;
                          const schoolExpanded = expandedSchools[schoolKey] ?? false;
                          
                          // Calculate school selection state
                          const schoolKeys = schoolNode.responses.flatMap(r =>
                            (r.pending_row_indices ?? []).map(i => makeKey(r.id, i))
                          );
                          const schoolAllSelected = schoolKeys.length > 0 && schoolKeys.every(k => selectedRows.has(k));
                          const schoolSomeSelected = schoolKeys.some(k => selectedRows.has(k));

                          return (
                            <div key={schoolKey} className="border rounded-md overflow-hidden">
                              {/* School Header */}
                              <div className="w-full flex items-center gap-2 px-3 py-2 bg-muted/10 hover:bg-muted/20 text-left">
                                <Checkbox
                                  checked={schoolAllSelected}
                                  data-state={schoolSomeSelected && !schoolAllSelected ? 'indeterminate' : undefined}
                                  onCheckedChange={() => toggleSchool(schoolNode)}
                                  className="shrink-0"
                                />
                                <button
                                  type="button"
                                  className="flex items-center gap-2 flex-1"
                                  onClick={() => setExpandedSchools(prev => ({ ...prev, [schoolKey]: !schoolExpanded }))}
                                >
                                  {schoolExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="font-medium text-sm">{schoolNode.school.name}</span>
                                </button>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs shrink-0">
                                  {schoolNode.pending_count ?? 0} gözləyir
                                </Badge>
                              </div>

                              {schoolExpanded && (
                                <div className="p-2 space-y-2">
                                  {schoolNode.responses.map((resp) => {
                                    const cols = selected.table.columns as ReportTableColumn[];
                                    const pending = resp.pending_row_indices ?? [];
                                    if (pending.length === 0) return null;
                                    
                                    // Calculate response selection state
                                    const respKeys = pending.map(i => makeKey(resp.id, i));
                                    const respAllSelected = respKeys.every(k => selectedRows.has(k));
                                    const respSomeSelected = respKeys.some(k => selectedRows.has(k));

                                    return (
                                      <div key={resp.id} className="overflow-x-auto border rounded bg-white">
                                        {/* Response Header with checkbox */}
                                        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border-b">
                                          <Checkbox
                                            checked={respAllSelected}
                                            data-state={respSomeSelected && !respAllSelected ? 'indeterminate' : undefined}
                                            onCheckedChange={() => toggleResponse(resp.id, pending)}
                                            className="shrink-0"
                                          />
                                          <span className="text-xs text-gray-500">Bütün sətirləri seç</span>
                                        </div>
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b bg-muted/10">
                                              <th className="w-8 px-2 py-1.5"></th>
                                              <th className="px-2 py-1.5 text-left text-muted-foreground font-medium w-8">#</th>
                                              {cols.map(col => (
                                                <th
                                                  key={col.key}
                                                  className="px-2 py-1.5 text-left text-muted-foreground font-medium whitespace-nowrap"
                                                >
                                                  {col.label}
                                                </th>
                                              ))}
                                              <th className="px-2 py-1.5 text-left text-muted-foreground font-medium whitespace-nowrap">Əməliyyat</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {pending.map((rowIndex) => {
                                              const row = (resp.rows?.[rowIndex] ?? {}) as Record<string, string | number | null>;
                                              const key = makeKey(resp.id, rowIndex);
                                              return (
                                                <tr key={rowIndex} className="border-b last:border-0 hover:bg-amber-50/50">
                                                  <td className="px-2 py-1.5">
                                                    <Checkbox
                                                      checked={selectedRows.has(key)}
                                                      onCheckedChange={() => toggleRow(key)}
                                                    />
                                                  </td>
                                                  <td className="px-2 py-1.5 text-muted-foreground">{rowIndex + 1}</td>
                                                  {cols.map(col => (
                                                    <td key={col.key} className="px-2 py-1.5 whitespace-nowrap">
                                                      {formatCellValue(row[col.key], col)}
                                                    </td>
                                                  ))}
                                                  <td className="px-2 py-1.5">
                                                    <RowActions
                                                      tableId={selected.table.id}
                                                      responseId={resp.id}
                                                      rowIndex={rowIndex}
                                                      rowStatuses={resp.row_statuses as RowStatuses}
                                                      onDone={invalidate}
                                                    />
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Missing Schools Section */}
              {selected && (
                <MissingSchoolsSection tableId={selected.table.id} />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border rounded-xl bg-gray-50 text-gray-500">
            <div className="text-center p-8">
              <Inbox className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Cədvəl seçin</p>
              <p className="text-sm mt-1">Sol siyahıdan istənilən cədvəli seçərək məlumatları görün.</p>
            </div>
          </div>
        )}
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
