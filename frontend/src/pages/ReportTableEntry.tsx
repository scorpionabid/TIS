import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CircularProgress } from '@/components/ui/circular-progress';
import { CheckCircle2, Table2, Search, Clock, CheckCircle, BarChart3, Filter, Archive, TrendingUp, Layers, Activity, Building2 } from 'lucide-react';
import { TableEntryCard } from '@/components/reporttables/TableEntryCard';
import { TableEntryCompactCard } from '@/components/reporttables/TableEntryCompactCard';
import { reportTableService } from '@/services/reportTables';
import type { ReportTable } from '@/types/reportTable';
import { cn } from '@/lib/utils';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportTableEntry() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'inprogress' | 'archived'>('all');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { isSektorAdmin, isSchoolAdmin, currentUser } = useRoleCheck();

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

    // Apply status filter based on my_response_status and row stats
    if (statusFilter !== 'all') {
      result = result.filter(t => {
        const stats = t.my_response_row_stats;
        const fillPercent = stats && stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
        const isFullyCompleted = t.my_response_status === 'submitted' && fillPercent === 100;
        const isPartiallyCompleted = t.my_response_status === 'submitted' && fillPercent < 100;
        const isNotStarted = !t.my_response_status;
        const isDraft = t.my_response_status === 'draft';

        if (statusFilter === 'completed') {
          return isFullyCompleted;
        }
        if (statusFilter === 'inprogress') {
          return isNotStarted || isDraft || isPartiallyCompleted;
        }
        if (statusFilter === 'archived') {
          return t.status === 'archived';
        }
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

  // Get user role display text
  const userRoleText = useMemo(() => {
    if (isSektorAdmin) return 'Sektor Admin';
    if (isSchoolAdmin) return 'Məktəb Admin';
    return currentUser?.role || 'İstifadəçi';
  }, [isSektorAdmin, isSchoolAdmin, currentUser]);

  const { completedCount, inProgressCount, archivedCount, overallPercent } = tableStats;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Table2 className="h-6 w-6 text-emerald-600" />
          Hesabat Cədvəlləri
        </h1>
        <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
          Aşağıdakı cədvəlləri dolduraraq göndərin.
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
            <Building2 className="h-3 w-3" />
            {userRoleText}
          </span>
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

          {/* Bottom Section - Table Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.map((table) => (
                <TableEntryCompactCard
                  key={table.id}
                  table={table}
                  isSelected={selectedTableId === table.id}
                  onClick={() => {
                    setSelectedTableId(table.id);
                    setOpen(true);
                  }}
                />
              ))}
            </div>

            {filteredTables.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Table2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Aktiv cədvəl yoxdur</p>
                <p className="text-sm mt-1">Axtarışa uyğun cədvəl tapılmadı.</p>
              </div>
            )}
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
