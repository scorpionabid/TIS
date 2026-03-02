import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CircularProgress } from '@/components/ui/circular-progress';
import { CheckCircle2, Table2, Search, Clock, CheckCircle, BarChart3, Filter, Archive, TrendingUp, Layers, Activity } from 'lucide-react';
import { TableEntryCard } from '@/components/reporttables/TableEntryCard';
import { reportTableService } from '@/services/reportTables';
import type { ReportTable } from '@/types/reportTable';
import { cn } from '@/lib/utils';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportTableEntry() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'inprogress' | 'archived'>('all');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['report-tables-my'],
    queryFn: () => reportTableService.getMyTables(),
  });

  const tables: ReportTable[] = useMemo(() => data ?? [], [data]);

  // Improved calculations
  const tableStats = useMemo(() => {
    const stats = tables.map(table => {
      const status = table.my_response_status;
      const rowStats = table.my_response_row_stats;
      
      // Calculate fill percentage for this table
      let fillPercent = 0;
      if (rowStats && rowStats.total > 0) {
        fillPercent = Math.round((rowStats.completed / rowStats.total) * 100);
      } else if (status === 'submitted') {
        fillPercent = 100;
      } else if (status === 'draft') {
        fillPercent = 50; // Assume partial completion
      }
      
      return {
        table,
        status,
        fillPercent,
        // Only completed if both submitted AND 100% filled
        isCompleted: status === 'submitted' && fillPercent === 100,
        // In progress if NOT archived, not fully completed, and (has partial progress OR is draft OR not started OR is submitted but not 100%)
        isInProgress: table.status !== 'archived' && (
          (fillPercent > 0 && fillPercent < 100) || 
          status === 'draft' || 
          status == null ||
          (status === 'submitted' && fillPercent < 100)
        ),
        isArchived: table.status === 'archived',
      };
    });
    
    const completedCount = stats.filter(s => s.isCompleted && !s.isArchived).length;
    const inProgressCount = stats.filter(s => s.isInProgress).length;
    const archivedCount = stats.filter(s => s.isArchived).length;
    
    // Calculate overall percentage based on actual fill percentages
    const overallPercent = stats.length > 0
      ? Math.round(stats.reduce((sum, s) => sum + s.fillPercent, 0) / stats.length)
      : 0;
    
    return {
      stats,
      completedCount,
      inProgressCount,
      archivedCount,
      overallPercent,
    };
  }, [tables]);

  // Filter tables based on search and status
  const filteredTables = useMemo(() => {
    let result = tables;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => {
        if (statusFilter === 'completed') return t.my_response_status === 'submitted' && t.status !== 'archived';
        if (statusFilter === 'inprogress') return t.my_response_status !== 'submitted' && t.status !== 'archived';
        if (statusFilter === 'archived') return t.status === 'archived';
        return true;
      });
    }
    
    // Apply search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((t) =>
        (t.title ?? '').toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [tables, statusFilter, search]);

  const selectedTable = useMemo(() => {
    if (!selectedTableId) return null;
    return tables.find((t) => t.id === selectedTableId) ?? null;
  }, [tables, selectedTableId]);

  // Use improved overallPercent from tableStats
  const { completedCount, inProgressCount, archivedCount, overallPercent } = tableStats;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Table2 className="h-6 w-6 text-emerald-600" />
          Hesabat Cədvəlləri
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Aşağıdakı cədvəlləri dolduraraq göndərin.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Table2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Aktiv cədvəl yoxdur</p>
          <p className="text-sm mt-1">Sizə hələ heç bir hesabat cədvəli təyin edilməyib.</p>
        </div>
      ) : (
        <>
          {/* Top Row - Filters and Stats in one line */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm mb-4">
            <div className="flex items-center gap-3 flex-nowrap">
              {/* Search */}
              <div className="relative flex-shrink-0 w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cədvəl axtar..."
                  className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

              {/* Tamamlandı Chip */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer select-none flex-shrink-0 border",
                  statusFilter === 'completed'
                    ? "bg-emerald-100 border-emerald-300 text-emerald-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  statusFilter === 'completed' ? "bg-emerald-500 animate-pulse" : "bg-emerald-400/50"
                )} />
                Tamamlandı
                <span className="bg-white/80 rounded-full text-xs font-semibold px-2 py-0.5 min-w-[20px] text-center border border-current/20">
                  {completedCount}
                </span>
              </button>

              {/* Davam edir Chip */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'inprogress' ? 'all' : 'inprogress')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer select-none flex-shrink-0 border",
                  statusFilter === 'inprogress'
                    ? "bg-amber-100 border-amber-300 text-amber-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  statusFilter === 'inprogress' ? "bg-amber-500 animate-pulse" : "bg-amber-400/50"
                )} />
                Davam edir
                <span className="bg-white/80 rounded-full text-xs font-semibold px-2 py-0.5 min-w-[20px] text-center border border-current/20">
                  {inProgressCount}
                </span>
              </button>

              {/* Ümumi Chip */}
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer select-none flex-shrink-0 border",
                  statusFilter === 'all'
                    ? "bg-blue-100 border-blue-300 text-blue-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  statusFilter === 'all' ? "bg-blue-500" : "bg-blue-400/50"
                )} />
                Ümumi
                <span className="bg-white/80 rounded-full text-xs font-semibold px-2 py-0.5 min-w-[20px] text-center border border-current/20">
                  {tables.length}
                </span>
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

              {/* Ortalama Chip with Circular Progress */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium select-none flex-shrink-0">
                <div className="relative w-6 h-6 flex-shrink-0">
                  <svg className="w-6 h-6 -rotate-90" viewBox="0 0 26 26">
                    <defs>
                      <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                    </defs>
                    <circle cx="13" cy="13" r="10" fill="none" stroke="#fed7aa" strokeWidth="3" />
                    <circle
                      cx="13"
                      cy="13"
                      r="10"
                      fill="none"
                      stroke="url(#rg)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="62.83"
                      strokeDashoffset={62.83 - 62.83 * (overallPercent / 100)}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-orange-600">
                    {overallPercent}%
                  </div>
                </div>
                <span className="text-xs text-orange-600/70">Ortalama</span>
                <span className="text-sm font-bold text-orange-700">{overallPercent}%</span>
              </div>
            </div>
          </div>

          {/* Bottom Section - Table List */}
          <div className="bg-white/80 backdrop-blur-sm border rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col h-[calc(100vh-280px)]">
            <div className="px-4 py-3 border-b bg-gray-50/80 shrink-0">
              <p className="text-sm font-medium text-gray-700">Cədvəllər</p>
              <p className="text-xs text-gray-500">Klik edin və sağ paneldə doldurun</p>
            </div>
            <div className="overflow-y-auto flex-1 divide-y custom-scrollbar">
              {filteredTables.map((table) => {
                    const status = table.my_response_status;
                    const isSelected = selectedTableId === table.id;
                    const rowStats = table.my_response_row_stats;
                    const fillPercent = rowStats && rowStats.total > 0
                      ? Math.round((rowStats.completed / rowStats.total) * 100)
                      : 0;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => {
                          setSelectedTableId(table.id);
                          setOpen(true);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-emerald-50/50 transition-all duration-200",
                          isSelected && 'bg-emerald-50 border-l-4 border-emerald-500'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 truncate">{table.title}</p>
                            {table.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{table.description}</p>
                            )}
                            
                            {/* Fill percentage progress */}
                            {rowStats && rowStats.total > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <BarChart3 className="h-3 w-3" />
                                    Doldurma: {rowStats.completed}/{rowStats.total}
                                  </span>
                                  <span className={cn(
                                    fillPercent === 100 ? 'text-emerald-600 font-medium' : 'text-gray-500'
                                  )}>
                                    {fillPercent}%
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      fillPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'
                                    )}
                                    style={{ width: `${fillPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              {table.status === 'archived' && (
                                <span className="inline-flex items-center gap-1 text-gray-500">
                                  <Archive className="h-3.5 w-3.5" />
                                  Arxiv
                                </span>
                              )}
                              {table.deadline && table.status !== 'archived' && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {new Date(table.deadline).toLocaleDateString('az-AZ')}
                                </span>
                              )}
                              {status === 'submitted' && table.status !== 'archived' && (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Göndərilib
                                </span>
                              )}
                              {status === 'draft' && table.status !== 'archived' && (
                                <span className="inline-flex items-center gap-1 text-amber-700">
                                  <Clock className="h-3.5 w-3.5" />
                                  Qaralama
                                </span>
                              )}
                              {status == null && table.status !== 'archived' && (
                                <span className="inline-flex items-center gap-1 text-gray-600">
                                  <Clock className="h-3.5 w-3.5" />
                                  Başlanmayıb
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full border transition-colors",
                              table.status === 'archived'
                                ? 'bg-gray-100 text-gray-600 border-gray-200'
                                : status === 'submitted'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            )}>
                              {table.status === 'archived' ? 'Arxiv' : status === 'submitted' ? 'Tamamlandı' : 'Davam edir'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredTables.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-gray-500">
                      <Table2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Axtarışa uyğun cədvəl tapılmadı.
                    </div>
                  )}
            </div>
          </div>

          <Sheet
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setSelectedTableId(null);
            }}
          >
            <SheetContent
              side="right"
              className="w-full sm:w-[75vw] sm:max-w-[75vw] p-0 flex flex-col"
            >
              <SheetHeader className="px-6 py-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5 text-emerald-600" />
                  {selectedTable?.title ?? 'Cədvəl'}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6">
                {selectedTable && (
                  <TableEntryCard
                    table={selectedTable}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
