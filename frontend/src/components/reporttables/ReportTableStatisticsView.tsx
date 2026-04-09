import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  BarChart3, 
  Download,
  Info,
  Trophy,
  Target,
  AlertTriangle,
  History,
  TrendingDown,
  ChevronRight,
  Eye,
  ExternalLink
} from 'lucide-react';
import { reportTableService } from '@/services/reportTables';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ReportTable } from '@/types/reportTable';

interface TableFillStats {
  table_id: number;
  table_title: string;
  total_schools: number;
  filled_schools: number;
  not_filled_schools: number;
  schools: SchoolStat[];
}

interface RowStatusMeta {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  reason?: string;
  return_reason?: string;
  was_returned?: boolean;
  updated_at?: string;
}

interface SchoolStat {
  institution_id: number;
  response_id?: number;
  institution_name: string;
  sector_name?: string;
  row_count: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  returned_count: number;
  points?: number;
  penalty?: number;
  bonus?: number;
  final_score?: number;
  rating_percentage?: number;
  rank?: number;
  // Overall fields
  total_tables?: number;
  filled_tables?: number;
  total_rows_across_all_tables?: number;
  total_approved?: number;
  total_pending?: number;
  total_rejected?: number;
  total_returned?: number;
  total_bonus?: number;
  total_penalty?: number;
  total_final_score?: number;
  avg_rating_percentage?: number;
  status: 'not_started' | 'draft' | 'pending' | 'partial' | 'completed';
  submitted_at?: string;
  is_filled?: boolean;
  respondent_name?: string | null;
}

export function ReportTableStatisticsView() {
  const [tableSearch, setTableSearch] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [selectedTableId, setSelectedTableId] = useState<number | 'overall'>('overall');
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch all published tables
  const { data: tables = [], isLoading: isLoadingTables } = useQuery<ReportTable[]>({
    queryKey: ['report-tables-list'],
    queryFn: () => reportTableService.getList({ 
      status: 'published',
      per_page: 100 
    }).then(r => r.data),
  });

  // Fetch statistics for selected table OR overall
  const { data: schoolStats = [], isLoading: isLoadingSchoolStats } = useQuery<SchoolStat[]>({
    queryKey: ['school-fill-statistics'],
    queryFn: () => reportTableService.getSchoolFillStatistics(),
    enabled: selectedTableId === 'overall',
  });

  const { data: tableStats, isLoading: isLoadingTableStats } = useQuery<TableFillStats | null>({
    queryKey: ['table-fill-statistics', selectedTableId],
    queryFn: async () => {
      if (selectedTableId === 'overall' || !selectedTableId) return null;
      return reportTableService.getTableFillStatistics(selectedTableId);
    },
    enabled: selectedTableId !== 'overall',
  });

  // Fetch response details for the modal
  const { data: responseDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['report-table-response', selectedResponseId],
    queryFn: () => selectedResponseId ? reportTableService.getResponse(selectedResponseId) : null,
    enabled: !!selectedResponseId && isDetailsOpen,
  });

  const filteredTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(t => t.title.toLowerCase().includes(q));
  }, [tables, tableSearch]);

  const sectors = useMemo(() => {
    const s = new Set<string>();
    const currentSchools = selectedTableId === 'overall' ? schoolStats : (tableStats?.schools || []);
    currentSchools.forEach(sch => {
      if (sch.sector_name) s.add(sch.sector_name);
    });
    return Array.from(s).sort();
  }, [selectedTableId, schoolStats, tableStats]);

  const filteredSchools = useMemo(() => {
    const currentSchools = selectedTableId === 'overall' ? schoolStats : (tableStats?.schools || []);
    let filtered = currentSchools;

    if (schoolSearch.trim()) {
      const q = schoolSearch.trim().toLowerCase();
      filtered = filtered.filter(s => 
        s.institution_name.toLowerCase().includes(q) || 
        s.sector_name?.toLowerCase().includes(q)
      );
    }

    if (sectorFilter !== 'all') {
      filtered = filtered.filter(s => s.sector_name === sectorFilter);
    }

    return filtered;
  }, [selectedTableId, schoolStats, tableStats, schoolSearch, sectorFilter]);

  const handleExport = async () => {
    try {
      if (selectedTableId === 'overall') {
        await reportTableService.exportOverallStatistics();
      } else {
        const table = tables.find(t => t.id === selectedTableId);
        if (table) {
          await reportTableService.exportStatistics(table.id, table.title);
        }
      }
    } catch (_) { /* silent */ }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Tamamlanıb</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Gözləyir</Badge>;
      case 'partial':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><BarChart3 className="h-3 w-3 mr-1" /> Qismən</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><AlertCircle className="h-3 w-3 mr-1" /> Qaralama</Badge>;
      case 'not_started':
      default:
        return <Badge variant="outline" className="text-gray-400 border-dashed border-gray-300"><XCircle className="h-3 w-3 mr-1" /> Başlanmayıb</Badge>;
    }
  };

  const getRatingColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-500';
    if (percentage >= 60) return 'text-amber-500';
    return 'text-red-600';
  }

  const isOverall = selectedTableId === 'overall';

  // KPI Calculations
  const kpis = useMemo(() => {
    if (isOverall) {
      const total = schoolStats.length;
      const started = schoolStats.filter(s => s.filled_tables! > 0).length;
      const totalPossibleResponses = total * (schoolStats[0]?.total_tables ?? 0);
      const actualSubmittedResponses = schoolStats.reduce((acc, s) => acc + (s.submitted_count || 0), 0);
      
      return {
        total,
        filled: started,
        notFilled: total - started,
        percent: totalPossibleResponses > 0 ? Math.round((actualSubmittedResponses / totalPossibleResponses) * 100) : 0,
        labelTitle: 'Məktəblər',
        labelFilled: 'Hesabata başlayan'
      };
    } else if (tableStats) {
      return {
        total: tableStats.total_schools,
        filled: tableStats.filled_schools,
        notFilled: tableStats.not_filled_schools,
        percent: tableStats.total_schools > 0 ? Math.round((tableStats.filled_schools / tableStats.total_schools) * 100) : 0,
        labelTitle: 'Təşkilatlar',
        labelFilled: 'Doldurub'
      };
    }
    return null;
  }, [isOverall, schoolStats, tableStats]);

  if (isLoadingTables) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] overflow-hidden">
      {/* Left Panel - Tables List */}
      <div className="lg:w-[320px] shrink-0 flex flex-col gap-3 h-full overflow-hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cədvəl axtar..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="pl-9 h-10 bg-white"
          />
        </div>

        <div className="bg-white border rounded-xl overflow-hidden flex-1 flex flex-col shadow-sm">
          <div className="px-4 py-3 border-b bg-gray-50/50">
            <p className="text-sm font-semibold text-gray-700">Seçim edin</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {/* Overall Row */}
              <button
                type="button"
                onClick={() => setSelectedTableId('overall')}
                className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-all group ${
                  selectedTableId === 'overall' ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedTableId === 'overall' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${selectedTableId === 'overall' ? 'text-indigo-700' : 'text-gray-700'}`}>Ümumi Statistika (Yekun)</p>
                    <p className="text-[10px] text-gray-500">Bütün cədvəllərin cəmi</p>
                  </div>
                </div>
              </button>

              {filteredTables.map((t) => {
                const isSelected = selectedTableId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTableId(t.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-all group ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                       <span className={`font-medium text-sm line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-gray-700 group-hover:text-blue-600'}`}>
                        {t.title}
                      </span>
                      {isSelected && <ChevronRight className="h-4 w-4 text-blue-500 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Right Panel - Data Rich View */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border rounded-xl overflow-hidden shadow-sm h-full">
        {selectedTableId ? (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Header with KPI cards */}
            <div className="p-4 bg-gray-50/50 border-b shrink-0">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isOverall ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isOverall ? <Trophy className="h-6 w-6" /> : <BarChart3 className="h-6 w-6" />}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-xl text-gray-800">
                      {isOverall ? 'Bütün Cədvəllər Üzrə Yekun' : tables.find(t => t.id === selectedTableId)?.title}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">
                      {isOverall ? 'Sektor və məktəb üzrə ümumi reytinq xalları.' : tables.find(t => t.id === selectedTableId)?.description}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleExport} 
                  className={`gap-2 h-10 ${isOverall ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Download className="h-4 w-4" /> Eksport Excel
                </Button>
              </div>

              {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="shadow-none border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">{kpis.labelTitle}</span>
                      </div>
                      <div className="text-xl font-bold">{kpis.total}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">{kpis.labelFilled}</span>
                      </div>
                      <div className="text-xl font-bold text-emerald-700">{kpis.filled}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-red-500 mb-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Doldurmayıb</span>
                      </div>
                      <div className="text-xl font-bold text-red-700">{kpis.notFilled}</div>
                    </CardContent>
                  </Card>
                  <Card className={`shadow-none border-opacity-50 ${isOverall ? 'border-indigo-200 bg-indigo-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
                    <CardContent className="p-3">
                      <div className={`flex items-center gap-2 mb-1 ${isOverall ? 'text-indigo-600' : 'text-blue-600'}`}>
                        <Target className="h-3.5 w-3.5" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Ümumi Faiz</span>
                      </div>
                      <div className={`text-xl font-bold ${isOverall ? 'text-indigo-700' : 'text-blue-700'}`}>
                        {kpis.percent}%
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Filters & Content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="p-3 border-b flex items-center justify-between gap-3 bg-white/80 backdrop-blur shrink-0">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Məktəb axtar..." 
                      value={schoolSearch} 
                      onChange={e => setSchoolSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="all">Bütün Sektorlar</option>
                    {sectors.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-gray-50 px-2 py-1.5 rounded border border-dashed">
                  <Info className="h-3 w-3" />
                  <span>Ballar sətir sayı, imtina, gecikmə və sürətə görə hesablanır.</span>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {isLoadingTableStats || isLoadingSchoolStats ? (
                  <div className="p-4 space-y-4">
                    {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : (
                  <Table className="relative">
                    <TableHeader className="bg-white sticky top-0 z-20 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                      <TableRow>
                        <TableHead className="w-[40px] text-center bg-white text-gray-400">#</TableHead>
                        <TableHead className="w-[300px] bg-white">Məktəb / Sektor</TableHead>
                        <TableHead className="bg-white">{isOverall ? 'Doldurma' : 'Status'}</TableHead>
                        <TableHead className="bg-white">Hazırladı</TableHead>
                        <TableHead className="text-center bg-white">{isOverall ? 'Cəmi Sətir' : 'Sətir'}</TableHead>
                        <TableHead className="text-center bg-white">Təsdiq</TableHead>
                        <TableHead className="text-center text-red-600 bg-white font-bold">Rədd/Geri</TableHead>
                        <TableHead className="text-center bg-white">Bonus/Cərimə</TableHead>
                        <TableHead className="text-right bg-white">Reytinq (Bal)</TableHead>
                        {!isOverall && <TableHead className="w-[50px] bg-white"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchools.map((school, idx) => {
                        const rowCount = isOverall ? school.total_rows_across_all_tables : school.row_count;
                        const approved = isOverall ? school.total_approved : school.approved_count;
                        const rejected = isOverall ? school.total_rejected : school.rejected_count;
                        const returned = isOverall ? school.total_returned : school.returned_count;
                        const failCount = (rejected ?? 0) + (returned ?? 0);

                        const bonus = isOverall ? school.total_bonus : school.bonus;
                        const penalty = isOverall ? school.total_penalty : school.penalty;
                        const score = isOverall ? school.total_final_score : school.final_score;
                        const percentage = isOverall ? school.avg_rating_percentage : school.rating_percentage;
                        const rank = school.rank ?? idx + 1;

                        return (
                          <TableRow key={school.institution_id} className={(isOverall ? false : !school.is_filled) ? 'bg-gray-50/30' : ''}>
                            <TableCell className="text-center w-[40px]">
                              {rank === 1 ? (
                                <span className="text-yellow-500 font-black text-sm">🥇</span>
                              ) : rank === 2 ? (
                                <span className="text-gray-400 font-black text-sm">🥈</span>
                              ) : rank === 3 ? (
                                <span className="text-amber-600 font-black text-sm">🥉</span>
                              ) : (
                                <span className="text-gray-400 font-mono text-xs font-bold">{rank}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm text-gray-800 leading-tight">{school.institution_name}</span>
                                <span className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">{school.sector_name || 'Sektor yoxdur'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isOverall ? (
                                <div className="text-xs">
                                  <span className="font-bold text-indigo-600">{school.submitted_count ?? 0}</span>
                                  <span className="text-gray-400"> / {school.total_tables}</span>
                                  {school.filled_tables! > (school.submitted_count ?? 0) && (
                                    <span className="text-[9px] text-amber-500 ml-1">({school.filled_tables! - (school.submitted_count ?? 0)} qaralama)</span>
                                  )}
                                </div>
                              ) : getStatusBadge(school.status)}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-600 font-medium">{school.respondent_name || '-'}</span>
                            </TableCell>
                            <TableCell className="text-center font-medium font-mono text-xs">{rowCount ?? 0}</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs ring-1 ring-emerald-200">
                                {approved ?? 0}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {failCount > 0 ? (
                                <button 
                                  onClick={() => {
                                    if (school.response_id || isOverall) {
                                      // If overall, we might need a different detail view, 
                                      // but for now we link to the last response if available
                                      if (school.response_id) {
                                        setSelectedResponseId(school.response_id);
                                        setIsDetailsOpen(true);
                                      }
                                    }
                                  }}
                                  className={`inline-flex flex-col items-center justify-center min-w-8 h-8 px-1.5 rounded-full bg-red-50 text-red-700 font-bold text-xs ring-1 ring-red-200 transition-colors ${!isOverall ? 'hover:bg-red-100 cursor-pointer' : 'cursor-default'}`}
                                >
                                  <span>{failCount}</span>
                                </button>
                              ) : (
                                <span className="text-gray-300 font-bold text-xs">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col gap-0.5">
                                {(bonus ?? 0) > 0 && (
                                  <span className="text-[10px] text-emerald-600 font-bold">+{bonus?.toFixed(1)}</span>
                                )}
                                {(penalty ?? 0) > 0 && (
                                  <span className="text-[10px] text-red-600 font-bold">-{penalty?.toFixed(1)}</span>
                                )}
                                {(bonus ?? 0) === 0 && (penalty ?? 0) === 0 && <span className="text-gray-300">-</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 font-black text-base">
                                  <span className={getRatingColor(percentage ?? 0)}>{score?.toFixed(2) ?? '0.00'}</span>
                                  <span className="text-[10px] text-gray-400 font-normal">bal</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${percentage && percentage >= 80 ? 'bg-emerald-500' : percentage && percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                      style={{ width: `${percentage ?? 0}%` }} 
                                    />
                                  </div>
                                  <span className="text-[9px] font-bold text-gray-500">{percentage ?? 0}%</span>
                                </div>
                              </div>
                            </TableCell>
                            {!isOverall && (
                              <TableCell>
                                {school.response_id && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                                    setSelectedResponseId(school.response_id!);
                                    setIsDetailsOpen(true);
                                  }}>
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                      {filteredSchools.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isOverall ? 9 : 10} className="h-40 text-center text-gray-400">
                             Nəticə tapılmadı
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-12 bg-gray-50/50">
            <div className="text-center max-w-sm">
              <div className="h-20 w-20 bg-white rounded-2xl shadow-sm border flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-10 w-10 text-blue-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Statistika Panelini Seçin</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sol tərəfdəki siyahıdan hər hansı bir hesabat cədvəlini və ya ümumi yekun statistikanı seçərək nəzarət edə bilərsiniz.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rejected Rows Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Rədd Edilmiş Məlumatlar
            </DialogTitle>
            <DialogDescription>
              {responseDetail?.institution?.name} tərəfindən göndərilmiş və rədd edilmiş sətirlər.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {isLoadingDetail ? (
              <div className="py-8 text-center space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : responseDetail ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 p-1">
                    {responseDetail.rows
                    .map((row: any, idx: number) => ({ row, idx, statusMeta: responseDetail.row_statuses?.[idx] }))
                    .filter((item: any) => 
                      item.statusMeta?.status === 'rejected' || 
                      (item.statusMeta?.status === 'draft' && item.statusMeta?.was_returned)
                    )
                    .map((item: any) => (
                      <div key={item.idx} className={`border rounded-lg p-4 ${item.statusMeta?.status === 'rejected' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded uppercase shadow-sm">
                              Sətir #{item.idx + 1}
                            </div>
                            <Badge className={item.statusMeta?.status === 'rejected' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                              {item.statusMeta?.status === 'rejected' ? 'Rədd edilib' : 'Geri qaytarılıb'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <History className="h-3.5 w-3.5" />
                            {item.statusMeta?.updated_at ? new Date(item.statusMeta.updated_at).toLocaleDateString('az-AZ') : '-'}
                          </div>
                        </div>
                        
                        <div className="bg-white rounded border border-gray-100 p-2 text-xs mb-3 shadow-sm">
                          <p className="text-gray-400 mb-1 font-medium uppercase text-[9px]">Göndərilən Məlumat:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(item.row).slice(0, 4).map(([k, v]: any) => (
                              <div key={k} className="flex gap-2">
                                <span className="text-gray-400">{k}:</span>
                                <span className="font-semibold text-gray-700">{v?.toString() || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.statusMeta?.status === 'rejected' ? 'bg-red-100' : 'bg-amber-100'}`}>
                            <Info className={`h-3.5 w-3.5 ${item.statusMeta?.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`} />
                          </div>
                          <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${item.statusMeta?.status === 'rejected' ? 'text-red-800' : 'text-amber-800'}`}>
                              {item.statusMeta?.status === 'rejected' ? 'Rədd Səbəbi:' : 'Geri Qaytarma Qeydi:'}
                            </p>
                            <p className={`text-sm mt-0.5 leading-relaxed italic ${item.statusMeta?.status === 'rejected' ? 'text-red-700' : 'text-amber-700'}`}>
                              "{item.statusMeta?.reason || item.statusMeta?.return_reason || 'Qeyd edilməyib'}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  {responseDetail.rows.filter((_: any, idx: number) => {
                    const st = responseDetail.row_statuses?.[idx];
                    return st?.status === 'rejected' || (st?.status === 'draft' && st?.was_returned);
                  }).length === 0 && (
                    <div className="py-20 text-center text-gray-400">
                      <CheckCircle2 className="h-12 w-12 text-emerald-100 mx-auto mb-3" />
                      <p>Bu cavab üzrə hazırda rədd edilmiş və ya geri qaytarılmış sətir yoxdur.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : null}
          </div>
          
          <div className="pt-4 border-t flex justify-end">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Bağla</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReportTableStatisticsView;
