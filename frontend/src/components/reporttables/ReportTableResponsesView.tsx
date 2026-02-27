import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { reportTableService } from '@/services/reportTables';
import { institutionService } from '@/services/institutions';
import type { ReportTable, ReportTableResponse, ReportTableColumn } from '@/types/reportTable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportTableResponsesViewProps {
  table: ReportTable;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'submitted') {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Göndərilib</Badge>;
  }
  return <Badge variant="outline" className="text-gray-500">Qaralama</Badge>;
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

// ─── Expandable Response Row ──────────────────────────────────────────────────

function ResponseRow({
  response,
  columns,
}: {
  response: ReportTableResponse;
  columns: ReportTableColumn[];
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = response.rows ?? [];

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
        <TableCell><StatusBadge status={response.status} /></TableCell>
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
                          <th key={col.key} className="px-3 py-2 text-left border-r border-gray-200 font-medium text-gray-600">
                            {col.label}
                            {col.type !== 'text' && (
                              <span className="ml-1 text-xs font-normal text-gray-400">
                                ({col.type === 'number' ? 'rəqəm' : 'tarix'})
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-200 hover:bg-white transition-colors">
                          <td className="px-2 py-1.5 text-center text-gray-400 border-r border-gray-200">{idx + 1}</td>
                          {columns.map((col) => (
                            <td key={col.key} className="px-3 py-1.5 border-r border-gray-200 text-gray-700">
                              {row[col.key] !== undefined && row[col.key] !== null && row[col.key] !== ''
                                ? String(row[col.key])
                                : <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
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

function NotStartedList({
  notStartedIds,
}: {
  notStartedIds: number[];
}) {
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

  // Group by sector (parent_id)
  const grouped: Record<string, typeof institutions> = {};
  institutions.forEach((inst) => {
    const sectorName = (inst as typeof inst & { parent?: { name: string } }).parent?.name ?? 'Digər';
    if (!grouped[sectorName]) grouped[sectorName] = [];
    grouped[sectorName].push(inst);
  });

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
                      ? String(row[col.key])
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportTableResponsesView({ table }: ReportTableResponsesViewProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'expand' | 'flat'>('expand');

  const { data, isLoading } = useQuery({
    queryKey: ['report-table-responses', table.id, page],
    queryFn: () => reportTableService.getResponses(table.id, { per_page: 50, page }),
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
    try {
      toast.info('Excel faylı hazırlanır...');
      await reportTableService.exportTable(table.id, table.title);
      toast.success('Fayl yükləndi.');
    } catch {
      toast.error('Export zamanı xəta baş verdi.');
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
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Excel Export
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Hamısı ({responses.length})</TabsTrigger>
          <TabsTrigger value="submitted">Göndərilib ({submittedCount})</TabsTrigger>
          <TabsTrigger value="draft">Qaralama ({draftCount})</TabsTrigger>
          <TabsTrigger value="not_started">Başlanmayıb ({notStartedCount})</TabsTrigger>
        </TabsList>

        {/* Search (not for not_started tab) */}
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
                  {filteredBySearch.map((response) => (
                    <ResponseRow key={response.id} response={response} columns={columns} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Submitted */}
        <TabsContent value="submitted" className="mt-3">
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <>
              {viewMode === 'flat' ? (
                <FlatView
                  responses={filteredBySearch.filter((r) => r.status === 'submitted')}
                  columns={columns}
                />
              ) : (
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
                      {filteredBySearch.filter((r) => r.status === 'submitted').map((response) => (
                        <ResponseRow key={response.id} response={response} columns={columns} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Draft */}
        <TabsContent value="draft" className="mt-3">
          {isLoading ? (
            <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
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
                  {filteredBySearch.filter((r) => r.status === 'draft').map((response) => (
                    <ResponseRow key={response.id} response={response} columns={columns} />
                  ))}
                </TableBody>
              </Table>
            </div>
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
