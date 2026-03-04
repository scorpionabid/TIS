import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, ChevronDown, Inbox, Search, Download } from 'lucide-react';
import { toast } from 'sonner';

import { reportTableService, type ReadyGroupedTable } from '@/services/reportTables';
import type { ReportTableColumn } from '@/types/reportTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

import { formatCellValue } from '@/utils/cellValue';

// ─── Helper functions for row keys ────────────────────────────────────────────

function makeKey(responseId: number, rowIndex: number): string {
  return `${responseId}:${rowIndex}`;
}

export function ReportTableReadyGroupedView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
  const [expandedSchools, setExpandedSchools] = useState<Record<string, boolean>>({});
  
  // ─── Bulk Selection State ────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const { data: grouped = [], isLoading, isError } = useQuery<ReadyGroupedTable[]>({
    queryKey: ['report-table-ready-grouped'],
    queryFn: () => reportTableService.getReadyGrouped(),
    refetchInterval: 30_000,
  });

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    return grouped.filter(t => t.table.title.toLowerCase().includes(q));
  }, [grouped, search]);

  const selected = useMemo(() => {
    if (selectedTableId) return grouped.find(t => t.table.id === selectedTableId) ?? null;
    return null;
  }, [grouped, selectedTableId]);

  const handleExport = async (tableId: number, title?: string) => {
    try {
      await reportTableService.exportApprovedRows(tableId, title);
      toast.success('Təsdiqlənmiş sətirlər export edildi');
    } catch {
      toast.error('Export zamanı xəta baş verdi');
    }
  };

  // ─── Selection Helpers ───────────────────────────────────────────────────
  const toggleRow = (key: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleResponse = (responseId: number, approvedIndices: number[]) => {
    const keys = approvedIndices.map(i => makeKey(responseId, i));
    const allHave = keys.every(k => selectedRows.has(k));
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (allHave) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const toggleSchool = (schoolNode: { responses: Array<{ id: number; approved_row_indices?: number[] }> }) => {
    const keys = schoolNode.responses.flatMap(r =>
      (r.approved_row_indices ?? []).map(i => makeKey(r.id, i))
    );
    const allHave = keys.every(k => selectedRows.has(k));
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (allHave) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const toggleSector = (sectorNode: { schools: Array<{ responses: Array<{ id: number; approved_row_indices?: number[] }> }> }) => {
    const keys = sectorNode.schools.flatMap(s =>
      s.responses.flatMap(r => (r.approved_row_indices ?? []).map(i => makeKey(r.id, i)))
    );
    const allHave = keys.every(k => selectedRows.has(k));
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (allHave) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  // ─── Calculate totals ───────────────────────────────────────────────────
  const totalApprovedForSelected = useMemo(() => {
    if (!selected) return 0;
    return selected.sectors.reduce((sum, sector) =>
      sum + sector.schools.reduce((s, school) => s + (school.approved_count ?? 0), 0), 0);
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
        <p className="text-sm font-medium">Təsdiqlənmiş sətir yoxdur</p>
        <p className="text-xs mt-1">Hələ heç bir sətir təsdiqlənməyib.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Left Panel - Tables */}
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
            <p className="text-sm font-medium text-gray-700">Təsdiqlənmiş cədvəllər</p>
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
                    isSelected ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-sm truncate ${isSelected ? 'text-emerald-700' : 'text-gray-800'}`}>
                        {t.table.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Badge className="bg-emerald-500 text-white text-xs shrink-0">{t.approved_count}</Badge>
                          təsdiqlənib
                        </span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Details */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {selected ? (
          <div className="h-full flex flex-col">
            {/* Header with selection info */}
            <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-gray-50 border-b rounded-t-lg">
              <div className="text-sm text-muted-foreground">
                Cəmi <span className="font-semibold text-emerald-600">{totalApprovedForSelected}</span> təsdiqlənmiş sətir
                {selectedCount > 0 && (
                  <span className="ml-2 text-foreground">
                    · <span className="font-semibold">{selectedCount}</span> seçilib
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedRows(new Set())}
                    className="text-xs"
                  >
                    Seçimi ləğv et
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(selected.table.id, selected.table.title)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export (Excel)
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 p-3">

            {selected.sectors.map((sectorNode, sectorIdx) => {
              const sectorKey = String(sectorNode.sector?.id ?? `null-${sectorIdx}`);
              const sectorExpanded = expandedSectors[sectorKey] ?? false;
              
              // Calculate sector selection state
              const sectorKeys = sectorNode.schools.flatMap(s =>
                s.responses.flatMap(r => (r.approved_row_indices ?? []).map(i => makeKey(r.id, i)))
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
                    <Badge className="bg-emerald-500 text-white text-xs shrink-0">
                      {sectorNode.approved_count ?? 0} təsdiqlənib
                    </Badge>
                  </div>

                  {sectorExpanded && (
                    <div className="p-3 space-y-3">
                      {sectorNode.schools.map((schoolNode) => {
                        const schoolKey = `${sectorKey}:${schoolNode.school.id}`;
                        const schoolExpanded = expandedSchools[schoolKey] ?? false;
                        
                        // Calculate school selection state
                        const schoolKeys = schoolNode.responses.flatMap(r =>
                          (r.approved_row_indices ?? []).map(i => makeKey(r.id, i))
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
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs shrink-0">
                                {schoolNode.approved_count ?? 0} təsdiqlənib
                              </Badge>
                            </div>

                            {schoolExpanded && (
                              <div className="p-2 space-y-2">
                                {schoolNode.responses.map((resp) => {
                                  const cols = selected.table.columns as ReportTableColumn[];
                                  const approved = resp.approved_row_indices ?? [];
                                  if (approved.length === 0) return null;
                                  
                                  // Calculate response selection state
                                  const respKeys = approved.map(i => makeKey(resp.id, i));
                                  const respAllSelected = respKeys.every(k => selectedRows.has(k));
                                  const respSomeSelected = respKeys.some(k => selectedRows.has(k));

                                  return (
                                    <div key={resp.id} className="overflow-x-auto border rounded bg-white">
                                      {/* Response Header with checkbox */}
                                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border-b">
                                        <Checkbox
                                          checked={respAllSelected}
                                          data-state={respSomeSelected && !respAllSelected ? 'indeterminate' : undefined}
                                          onCheckedChange={() => toggleResponse(resp.id, approved)}
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
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {approved.map((rowIndex) => {
                                            const row = (resp.rows?.[rowIndex] ?? {}) as Record<string, string | number | null>;
                                            const key = makeKey(resp.id, rowIndex);
                                            return (
                                              <tr key={rowIndex} className="border-b last:border-0 hover:bg-emerald-50/30">
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
    </div>
  );
}
