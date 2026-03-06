import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Users,
  MinusCircle,
  LayoutList,
  TableIcon,
  Loader2,
  XCircle,
  RotateCcw,
  MessageCircle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { reportTableService } from '@/services/reportTables';
import { institutionService } from '@/services/institutions';
import type { ReportTable, ReportTableResponse, ReportTableColumn, RowStatusMeta } from '@/types/reportTable';
import { formatCellValue } from '@/utils/cellValue';
import { RowComments } from './RowComments';
import { PartialReturnDialog } from './PartialReturnDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportTableResponsesViewProps {
  table: ReportTable;
}

import { ResponseStatusBadge, RowStatusBadge } from './StatusBadge';

// ─── Row Action Buttons ───────────────────────────────────────────────────────

interface RowActionButtonsProps {
  tableId: number;
  responseId: number;
  rowIndex: number;
  rowStatus?: RowStatusMeta;
  institutionName?: string;
  row?: Record<string, string | number | null>;
  columns?: ReportTableColumn[];
}

function RowActionButtons({ 
  tableId, 
  responseId, 
  rowIndex, 
  rowStatus,
  institutionName = 'Məktəb',
  row = {},
  columns = [],
}: RowActionButtonsProps) {
  const queryClient = useQueryClient();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showPartialReturn, setShowPartialReturn] = useState(false);
  const [reason, setReason] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['report-table-responses', tableId] });
    queryClient.invalidateQueries({ queryKey: ['approved-responses', tableId] });
    queryClient.invalidateQueries({ queryKey: ['report-table-all-responses', tableId] });
  };

  const approveMutation = useMutation({
    mutationFn: () => reportTableService.approveRow(tableId, responseId, rowIndex),
    onSuccess: () => { invalidate(); toast.success('Sətir təsdiqləndi.'); },
    onError: (e: Error) => toast.error(e.message || 'Xəta baş verdi.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (r: string) => reportTableService.rejectRow(tableId, responseId, rowIndex, r),
    onSuccess: () => {
      setShowRejectForm(false);
      setReason('');
      invalidate();
      toast.success('Sətir rədd edildi. Məktəb yeni sətir əlavə edə bilməz.');
    },
    onError: (e: Error) => toast.error(e.message || 'Xəta baş verdi.'),
  });

  const returnMutation = useMutation({
    mutationFn: () => reportTableService.returnRow(tableId, responseId, rowIndex),
    onSuccess: () => { invalidate(); toast.success('Sətir redaktəyə qaytarıldı. Məktəb düzəliş edib yenidən göndərə bilər.'); },
    onError: (e: Error) => toast.error(e.message || 'Xəta baş verdi.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => reportTableService.deleteRow(tableId, responseId, rowIndex),
    onSuccess: () => { invalidate(); toast.success('Sətir tamamilə silindi.'); },
    onError: (e: Error) => toast.error(e.message || 'Xəta baş verdi.'),
  });

  // Show return/reject buttons only for submitted rows
  if (rowStatus?.status !== 'submitted') {
    // For approved/rejected rows, only show comments
    return (
      <div className="flex items-center gap-2">
        <RowComments
          tableId={tableId}
          responseId={responseId}
          rowIndex={rowIndex}
          institutionName={institutionName}
          trigger={
            <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
              <MessageCircle className="h-4 w-4" />
              Şərhlər
            </Button>
          }
        />
      </div>
    );
  }

  const anyPending = approveMutation.isPending || rejectMutation.isPending || returnMutation.isPending || deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
          onClick={() => approveMutation.mutate()}
          disabled={anyPending}
        >
          {approveMutation.isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <CheckCircle2 className="h-3 w-3" />}
          Təsdiqlə
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50 bg-red-50/50"
          onClick={() => setShowRejectForm((v) => !v)}
          disabled={anyPending}
          title="Sətiri rədd et - məktəb bu sətri silə bilməz, yalnız yeni sətir əlavə edə bilər"
        >
          <XCircle className="h-3 w-3" /> Rədd et
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 bg-amber-50/50"
          onClick={() => setShowPartialReturn(true)}
          disabled={anyPending}
          title="Sətiri redaktəyə qaytar - məktəb bu sətri düzəliş edib yenidən göndərə bilər"
        >
          <RotateCcw className="h-3 w-3" /> Qaytar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-gray-300 text-gray-700 hover:bg-gray-100 bg-gray-50/50"
          onClick={() => {
            if (confirm('Bu sətiri tamamilə silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.')) {
              deleteMutation.mutate();
            }
          }}
          disabled={anyPending}
          title="Sətiri tamamilə sil - məktəbin cədvəlindən bu sətir silinəcək"
        >
          <Trash2 className="h-3 w-3" /> Sil
        </Button>
        <RowComments
          tableId={tableId}
          responseId={responseId}
          rowIndex={rowIndex}
          institutionName={institutionName}
          trigger={
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600">
              <MessageCircle className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      {showRejectForm && (
        <div className="flex flex-col gap-1.5 p-2 border border-red-200 rounded-lg bg-red-50">
          <Textarea
            placeholder="Rədd etmə səbəbini yazın..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="text-xs resize-none bg-white"
          />
          <div className="flex gap-1 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setShowRejectForm(false); setReason(''); }}
            >
              Ləğv et
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-red-600 hover:bg-red-700 gap-1"
              onClick={() => rejectMutation.mutate(reason)}
              disabled={!reason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Rədd et
            </Button>
          </div>
        </div>
      )}

      {/* Partial Return Dialog */}
      <PartialReturnDialog
        open={showPartialReturn}
        onClose={() => setShowPartialReturn(false)}
        tableId={tableId}
        responseId={responseId}
        rowIndex={rowIndex}
        row={row}
        columns={columns}
        rowStatus={rowStatus}
        institutionName={institutionName}
      />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <div className="bg-white border rounded-lg px-4 py-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Column type label helper ─────────────────────────────────────────────────

function colTypeLabel(type: string): string {
  switch (type) {
    case 'number': return 'rəqəm';
    case 'date': return 'tarix';
    case 'select': return 'seçim';
    case 'boolean': return 'bəli/xeyr';
    default: return '';
  }
}

// ─── Expandable Response Row ──────────────────────────────────────────────────

function ResponseRow({
  response,
  columns,
  tableId,
}: {
  response: ReportTableResponse;
  columns: ReportTableColumn[];
  tableId: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = response.rows ?? [];
  const rowStatuses = response.row_statuses ?? {};

  return (
    <>
      <TableRow className="hover:bg-gray-50">
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{response.institution?.name ?? '-'}</TableCell>
        <TableCell>
          <span className="text-xs text-gray-400">{response.institution?.parent?.name ?? '-'}</span>
        </TableCell>
        <TableCell><ResponseStatusBadge status={response.status} /></TableCell>
        <TableCell className="text-gray-500 text-sm">{rows.length} sətir</TableCell>
        <TableCell className="text-gray-400 text-xs">
          {response.submitted_at
            ? new Date(response.submitted_at).toLocaleDateString('az-AZ')
            : response.updated_at
            ? new Date(response.updated_at).toLocaleDateString('az-AZ')
            : '-'}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="p-0 bg-gray-50">
            <div className="px-4 py-3">
              {rows.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">Bu cavabda hələ məlumat yoxdur.</p>
              ) : (
                <div className="overflow-x-auto rounded border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-2 text-center w-10 border-r border-gray-200 text-gray-500">#</th>
                        {columns.map((col) => (
                          <th key={col.key} className="px-3 py-2 text-left border-r border-gray-200 font-medium text-gray-600 whitespace-nowrap">
                            {col.label}
                            {col.type !== 'text' && (
                              <span className="ml-1 text-xs font-normal text-gray-400">
                                ({colTypeLabel(col.type)})
                              </span>
                            )}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left border-r border-gray-200 font-medium text-gray-600 whitespace-nowrap">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">Əməliyyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const rowStatus = rowStatuses[String(idx)];
                        const rowBg =
                          rowStatus?.status === 'approved' ? 'bg-emerald-50' :
                          rowStatus?.status === 'submitted' ? 'bg-amber-50' :
                          rowStatus?.status === 'rejected' ? 'bg-red-50' : '';

                        return (
                          <tr key={idx} className={`border-t border-gray-200 transition-colors ${rowBg}`}>
                            <td className="px-2 py-2 text-center text-gray-400 border-r border-gray-200">{idx + 1}</td>
                            {columns.map((col) => (
                              <td key={col.key} className="px-3 py-2 border-r border-gray-200 text-gray-700">
                                {row[col.key] !== undefined && row[col.key] !== null && row[col.key] !== ''
                                  ? formatCellValue(row[col.key], col)
                                  : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                            <td className="px-3 py-2 border-r border-gray-200 align-top">
                              <RowStatusBadge
                                status={rowStatus?.status}
                                rejectionReason={rowStatus?.rejection_reason}
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <RowActionButtons
                                tableId={tableId}
                                responseId={response.id}
                                rowIndex={idx}
                                rowStatus={rowStatus}
                                institutionName={response.institution?.name ?? 'Məktəb'}
                                row={row}
                                columns={columns}
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
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Not Started List ─────────────────────────────────────────────────────────

function NotStartedList({ notStartedIds }: { notStartedIds: number[] }) {
  const { data, isLoading } = useQuery({
    queryKey: ['institutions-for-not-started', notStartedIds.length],
    queryFn: () => institutionService.getAll({ per_page: 1000 }),
    enabled: notStartedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const institutions = useMemo(() => {
    const raw = data?.data ?? [];
    const idSet = new Set(notStartedIds);
    return raw.filter((i) => idSet.has(i.id));
  }, [data, notStartedIds]);

  if (notStartedIds.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
        <p className="font-medium">Bütün hədəf müəssisələr cavab göndərib!</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Müəssisə</TableHead>
            <TableHead>Sektor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {institutions.map((inst) => (
            <TableRow key={inst.id}>
              <TableCell className="font-medium">{inst.name}</TableCell>
              <TableCell className="text-gray-500 text-sm">
                {(inst as typeof inst & { parent?: { name: string } }).parent?.name ?? '-'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-gray-400 gap-1">
                  <MinusCircle className="h-3 w-3" /> Başlanmayıb
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Flat/Merged View ─────────────────────────────────────────────────────────

function FlatView({
  responses,
  columns,
}: {
  responses: ReportTableResponse[];
  columns: ReportTableColumn[];
}) {
  const submittedOnly = responses.filter((r) => r.status === 'submitted');

  if (submittedOnly.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Göndərilmiş cavab yoxdur.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 sticky left-0 bg-gray-50">Müəssisə</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200">Sətir #</th>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {submittedOnly.map((response) =>
            (response.rows ?? []).map((row, idx) => (
              <tr key={`${response.id}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                {idx === 0 ? (
                  <td
                    className="px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200 sticky left-0 bg-white"
                    rowSpan={(response.rows ?? []).length}
                  >
                    {response.institution?.name ?? '-'}
                  </td>
                ) : null}
                <td className="px-3 py-1.5 text-gray-400 border-r border-gray-200 text-center">{idx + 1}</td>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-1.5 border-r border-gray-200 text-gray-700">
                    {row[col.key] !== undefined && row[col.key] !== null && row[col.key] !== ''
                      ? formatCellValue(row[col.key], col)
                      : <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shared Response Table ────────────────────────────────────────────────────

function ResponseTable({
  responses,
  columns,
  tableId,
}: {
  responses: ReportTableResponse[];
  columns: ReportTableColumn[];
  tableId: number;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-10" />
            <TableHead>Müəssisə</TableHead>
            <TableHead>Sektor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sətir sayı</TableHead>
            <TableHead>Tarix</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((response) => (
            <ResponseRow key={response.id} response={response} columns={columns} tableId={tableId} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportTableResponsesView({ table }: ReportTableResponsesViewProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'expand' | 'flat'>('expand');
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['report-table-responses', table.id, page],
    queryFn: () => reportTableService.getResponses(table.id, { per_page: 50, page }),
    refetchInterval: 30_000,
  });

  const responses: ReportTableResponse[] = data?.data ?? [];
  const meta = data?.meta;
  const columns: ReportTableColumn[] = table.columns ?? [];

  // Stats
  const submittedCount = responses.filter((r) => r.status === 'submitted').length;
  const draftCount = responses.filter((r) => r.status === 'draft').length;
  const targetCount = table.target_institutions?.length ?? 0;
  const respondedIds = new Set(responses.map((r) => r.institution_id));
  const notStartedIds = (table.target_institutions ?? []).filter((id) => !respondedIds.has(id));
  const notStartedCount = notStartedIds.length;

  // Search filter
  const filteredBySearch = useMemo(() => {
    if (!search.trim()) return responses;
    const q = search.toLowerCase();
    return responses.filter((r) => r.institution?.name?.toLowerCase().includes(q));
  }, [responses, search]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await reportTableService.exportTable(table.id, table.title);
      toast.success('Fayl yükləndi.');
    } catch {
      toast.error('Export zamanı xəta baş verdi.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Hədəf müəssisə"
          value={targetCount}
          icon={<Users className="h-4 w-4 text-blue-600" />}
          colorClass="bg-blue-50"
        />
        <StatCard
          label="Göndərilib"
          value={submittedCount}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          colorClass="bg-emerald-50"
        />
        <StatCard
          label="Qaralama"
          value={draftCount}
          icon={<Clock className="h-4 w-4 text-gray-500" />}
          colorClass="bg-gray-100"
        />
        <StatCard
          label="Başlanmayıb"
          value={notStartedCount}
          icon={<MinusCircle className="h-4 w-4 text-orange-500" />}
          colorClass="bg-orange-50"
        />
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'expand' ? 'default' : 'outline'}
            size="sm"
            className={viewMode === 'expand' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            onClick={() => setViewMode('expand')}
          >
            <LayoutList className="h-4 w-4 mr-1" /> Detallı
          </Button>
          <Button
            variant={viewMode === 'flat' ? 'default' : 'outline'}
            size="sm"
            className={viewMode === 'flat' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            onClick={() => setViewMode('flat')}
          >
            <TableIcon className="h-4 w-4 mr-1" /> Cədvəl
          </Button>
        </div>
        {/* Excel Export button removed as per user request */}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Hamısı ({responses.length})</TabsTrigger>
          <TabsTrigger value="submitted">Göndərilib ({submittedCount})</TabsTrigger>
          <TabsTrigger value="draft">Qaralama ({draftCount})</TabsTrigger>
          <TabsTrigger value="not_started">Başlanmayıb ({notStartedCount})</TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Müəssisə adı ilə axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* All responses */}
        <TabsContent value="all" className="mt-3">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredBySearch.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-lg mb-1">Cavab tapılmadı</p>
            </div>
          ) : viewMode === 'flat' ? (
            <FlatView responses={filteredBySearch} columns={columns} />
          ) : (
            <ResponseTable responses={filteredBySearch} columns={columns} tableId={table.id} />
          )}
        </TabsContent>

        {/* Submitted */}
        <TabsContent value="submitted" className="mt-3">
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : viewMode === 'flat' ? (
            <FlatView
              responses={filteredBySearch.filter((r) => r.status === 'submitted')}
              columns={columns}
            />
          ) : (
            <ResponseTable
              responses={filteredBySearch.filter((r) => r.status === 'submitted')}
              columns={columns}
              tableId={table.id}
            />
          )}
        </TabsContent>

        {/* Draft */}
        <TabsContent value="draft" className="mt-3">
          {isLoading ? (
            <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <ResponseTable
              responses={filteredBySearch.filter((r) => r.status === 'draft')}
              columns={columns}
              tableId={table.id}
            />
          )}
        </TabsContent>

        {/* Not started */}
        <TabsContent value="not_started" className="mt-3">
          <NotStartedList notStartedIds={notStartedIds} />
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Əvvəlki
          </Button>
          <span className="text-sm text-gray-500">{page} / {meta.last_page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={page >= meta.last_page}
          >
            Növbəti
          </Button>
        </div>
      )}
    </div>
  );
}
