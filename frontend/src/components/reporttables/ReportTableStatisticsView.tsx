import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { reportTableService } from '@/services/reportTables';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportTable } from '@/types/reportTable';

// Types
interface SchoolStat {
  institution_id: number;
  institution_name: string;
  sector_name?: string;
  row_count: number;
  approved_count: number;
  pending_count: number;
  status: 'not_started' | 'draft' | 'pending' | 'partial' | 'completed';
  submitted_at?: string;
  is_filled: boolean;
}

interface TableFillStats {
  table_id: number;
  table_title: string;
  total_schools: number;
  filled_schools: number;
  not_filled_schools: number;
  schools: SchoolStat[];
}

export function ReportTableStatisticsView() {
  const [search, setSearch] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  // Fetch all published tables
  const { data: tables = [], isLoading: isLoadingTables } = useQuery<ReportTable[]>({
    queryKey: ['report-tables-list'],
    queryFn: () => reportTableService.getList({ status: 'published' }).then(r => r.data),
  });

  // Fetch statistics for selected table
  const { data: stats, isLoading: isLoadingStats } = useQuery<TableFillStats | null>({
    queryKey: ['table-fill-statistics', selectedTableId],
    queryFn: async () => {
      if (!selectedTableId) return null;
      return reportTableService.getTableFillStatistics(selectedTableId);
    },
    enabled: !!selectedTableId,
  });

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(t => t.title.toLowerCase().includes(q));
  }, [tables, search]);

  const selectedTable = useMemo(() => {
    if (selectedTableId) return tables.find(t => t.id === selectedTableId) ?? null;
    return null;
  }, [tables, selectedTableId]);

  // Group schools by sector
  const schoolsBySector = useMemo(() => {
    if (!stats) return {};
    
    const grouped: Record<string, { sectorName: string; schools: SchoolStat[] }> = {};
    
    stats.schools.forEach(school => {
      const sectorKey = school.sector_name || 'no-sector';
      if (!grouped[sectorKey]) {
        grouped[sectorKey] = {
          sectorName: school.sector_name || 'Sektor yoxdur',
          schools: [],
        };
      }
      grouped[sectorKey].schools.push(school);
    });
    
    return grouped;
  }, [stats]);

  const toggleSector = (sectorKey: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      if (next.has(sectorKey)) next.delete(sectorKey);
      else next.add(sectorKey);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Tamamlanıb</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" /> Gözləyir</Badge>;
      case 'partial':
        return <Badge className="bg-blue-100 text-blue-800"><BarChart3 className="h-3 w-3 mr-1" /> Qismən</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="h-3 w-3 mr-1" /> Qaralama</Badge>;
      case 'not_started':
      default:
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Başlanmayıb</Badge>;
    }
  };

  if (isLoadingTables) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
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
            <p className="text-sm font-medium text-gray-700">Cədvəllər</p>
            <p className="text-xs text-gray-500">Klik edin və statistikaları görün</p>
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y">
            {filteredTables.map((t) => {
              const isSelected = selectedTableId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTableId(t.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-sm truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                        {t.title}
                      </p>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-1" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Statistics */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {selectedTable ? (
          <div className="h-full flex flex-col">
            {/* Header Stats */}
            <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-gray-50 border-b rounded-t-lg">
              <div>
                <h2 className="font-semibold text-lg">{selectedTable.title}</h2>
                {stats && (
                  <div className="flex items-center gap-4 text-sm mt-1">
                    <span className="text-gray-600">
                      Ümumi: <span className="font-semibold">{stats.total_schools}</span> məktəb
                    </span>
                    <span className="text-emerald-600">
                      Doldurub: <span className="font-semibold">{stats.filled_schools}</span>
                    </span>
                    <span className="text-red-600">
                      Doldurmayıb: <span className="font-semibold">{stats.not_filled_schools}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Schools List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 p-3">
              {isLoadingStats ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : stats ? (
                Object.entries(schoolsBySector).map(([sectorKey, { sectorName, schools }]) => {
                  const isExpanded = expandedSectors.has(sectorKey);
                  const notFilledCount = schools.filter(s => !s.is_filled).length;
                  
                  return (
                    <div key={sectorKey} className="border rounded-lg overflow-hidden">
                      {/* Sector Header */}
                      <button
                        type="button"
                        onClick={() => toggleSector(sectorKey)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/20 hover:bg-muted/30 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-semibold text-sm">{sectorName}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({schools.length} məktəb{notFilledCount > 0 && `, ${notFilledCount} doldurmayan`})
                        </span>
                        {notFilledCount > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs">
                            {notFilledCount} doldurmayan
                          </Badge>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-3 space-y-2">
                          {schools.map((school) => (
                            <div
                              key={school.institution_id}
                              className={`flex items-center justify-between p-3 rounded-md border ${
                                !school.is_filled ? 'bg-red-50 border-red-200' : 'bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-gray-500" />
                                <div>
                                  <p className="font-medium text-sm">{school.institution_name}</p>
                                  {school.sector_name && (
                                    <p className="text-xs text-gray-500">{school.sector_name}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm">
                                    <span className="font-semibold">{school.row_count}</span> sətir
                                  </p>
                                  {school.is_filled && (
                                    <p className="text-xs text-gray-500">
                                      {school.approved_count} təsdiqlənib, {school.pending_count} gözləyir
                                    </p>
                                  )}
                                </div>
                                {getStatusBadge(school.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <Alert>
                  <AlertDescription>Statistika yüklənərkən xəta baş verdi.</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border rounded-xl bg-gray-50 text-gray-500">
            <div className="text-center p-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Cədvəl seçin</p>
              <p className="text-sm mt-1">Sol siyahıdan istənilən cədvəli seçərək doldurma statistikalarını görün.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportTableStatisticsView;
