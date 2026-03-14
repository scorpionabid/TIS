import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  CheckCircle2,
  Table2,
  Search,
  Clock,
  CheckCircle,
  BarChart3,
  Archive,
  Building2,
  Download,
  Save,
  Send,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { TableEntryCard } from '@/components/reporttables/TableEntryCard';
import { TableEntryCompactCard } from '@/components/reporttables/TableEntryCompactCard';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { reportTableService } from '@/services/reportTables';
import type { ReportTable } from '@/types/reportTable';
import { cn } from '@/lib/utils';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'az öncə';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dəq əvvəl`;
  const hours = Math.floor(minutes / 60);
  return `${hours} saat əvvəl`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportTableEntry() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'inprogress' | 'archived'>('all');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const tableEntryRef = useRef<import('@/components/reporttables/TableEntryCard').TableEntryCardHandle | null>(null);
  const [entryMeta, setEntryMeta] = useState<{
    hasUnsaved: boolean;
    responseStatus: 'draft' | 'submitted' | null;
    fullyLocked: boolean;
    hasEditableRows: boolean;
    lastSaved: Date | null;
    isSaving: boolean;
  } | null>(null);

  const { isSektorAdmin, isSchoolAdmin, currentUser } = useRoleCheck();

  const { data, isLoading } = useQuery({
    queryKey: ['report-tables-my'],
    queryFn: () => reportTableService.getMyTables(),
    refetchInterval: 30_000,
  });

  const tables: ReportTable[] = useMemo(() => data ?? [], [data]);

  // Improved calculations
  const tableStats = useMemo(() => {
    const stats = tables.map(table => {
      const status = table.my_response_status;
      const rowStats = table.my_response_row_stats;

      let fillPercent = 0;
      if (rowStats && rowStats.total > 0) {
        fillPercent = Math.round((rowStats.completed / rowStats.total) * 100);
      } else if (status === 'submitted') {
        fillPercent = 100;
      } else if (status === 'draft') {
        fillPercent = 50;
      }

      return {
        table,
        status,
        fillPercent,
        isCompleted: status === 'submitted' && fillPercent === 100,
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
    const overallPercent = stats.length > 0
      ? Math.round(stats.reduce((sum, s) => sum + s.fillPercent, 0) / stats.length)
      : 0;

    return { stats, completedCount, inProgressCount, overallPercent };
  }, [tables]);

  const filteredTables = useMemo(() => {
    let result = tables;

    if (statusFilter !== 'all') {
      result = result.filter(t => {
        const stats = t.my_response_row_stats;
        const fillPercent = stats && stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
        const isFullyCompleted = t.my_response_status === 'submitted' && fillPercent === 100;
        const isPartiallyCompleted = t.my_response_status === 'submitted' && fillPercent < 100;
        const isNotStarted = !t.my_response_status;
        const isDraft = t.my_response_status === 'draft';

        if (statusFilter === 'completed') return isFullyCompleted;
        if (statusFilter === 'inprogress') return isNotStarted || isDraft || isPartiallyCompleted;
        if (statusFilter === 'archived') return t.status === 'archived';
        return true;
      });
    }

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

  const handleSave = useCallback(() => {
    tableEntryRef.current?.save();
  }, []);

  const handleExport = useCallback(() => {
    tableEntryRef.current?.export();
  }, []);

  const handleSubmitAll = useCallback(() => {
    tableEntryRef.current?.submitAll();
  }, []);

  const handleCloseSheet = useCallback((force = false) => {
    if (!force && entryMeta?.hasUnsaved) {
      setShowUnsavedWarning(true);
      return;
    }
    setOpen(false);
    setSelectedTableId(null);
    setIsFullScreen(false);
  }, [entryMeta?.hasUnsaved]);

  const userRoleText = useMemo(() => {
    if (isSektorAdmin) return 'Sektor Admin';
    if (isSchoolAdmin) return 'Məktəb Admin';
    return currentUser?.role || 'İstifadəçi';
  }, [isSektorAdmin, isSchoolAdmin, currentUser]);

  const { completedCount, inProgressCount, overallPercent } = tableStats;

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
          {/* Filter + Stats toolbar */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-shrink-0 w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cədvəl axtar..."
                  className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

              {/* Tamamlandı */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer select-none flex-shrink-0 border",
                  statusFilter === 'completed'
                    ? "bg-emerald-100 border-emerald-300 text-emerald-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Tamamlandı
                <span className="bg-white/80 rounded-full text-xs font-semibold px-2 py-0.5 min-w-[20px] text-center">
                  {completedCount}
                </span>
              </button>

              {/* Davam edir */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'inprogress' ? 'all' : 'inprogress')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer select-none flex-shrink-0 border",
                  statusFilter === 'inprogress'
                    ? "bg-amber-100 border-amber-300 text-amber-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Davam edir
                <span className="bg-white/80 rounded-full text-xs font-semibold px-2 py-0.5 min-w-[20px] text-center">
                  {inProgressCount}
                </span>
              </button>

              {/* Ümumi */}
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer select-none flex-shrink-0 border",
                  statusFilter === 'all'
                    ? "bg-blue-100 border-blue-300 text-blue-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Ümumi
                <span className="bg-white/80 rounded-full text-xs font-semibold px-2 py-0.5 min-w-[20px] text-center">
                  {tables.length}
                </span>
              </button>

              <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

              {/* Overall progress */}
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
                      cx="13" cy="13" r="10" fill="none" stroke="url(#rg)" strokeWidth="3"
                      strokeLinecap="round" strokeDasharray="62.83"
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

          {/* Table Grid */}
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

          {/* ─── Side Sheet ──────────────────────────────────────────────────── */}
          <Sheet
            open={open}
            onOpenChange={(v) => {
              if (!v) {
                handleCloseSheet();
              } else {
                setOpen(true);
              }
            }}
          >
            <SheetContent
              side="right"
              className={cn(
                'p-0 flex flex-col transition-all duration-300',
                isFullScreen
                  ? 'w-full max-w-full'
                  : 'w-full sm:w-[80vw] sm:max-w-[80vw]'
              )}
            >
              {/* Sheet Header */}
              <div className="px-4 py-3 border-b bg-white flex items-center justify-between gap-3 shrink-0">
                {/* Left: Status badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                    entryMeta?.responseStatus === 'submitted'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  )}>
                    {entryMeta?.responseStatus === 'submitted' ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />Göndərildi</>
                    ) : (
                      <><Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />Qaralama</>
                    )}
                  </span>
                </div>

                {/* Center: Title */}
                <div className="flex-1 flex items-center justify-center min-w-0">
                  <div className="text-center min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate max-w-md">
                      {selectedTable?.title ?? 'Cədvəl'}
                    </div>
                    {entryMeta?.hasUnsaved && (
                      <div className="text-xs text-amber-600">Saxlanmamış dəyişikliklər</div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Full-screen toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500"
                          onClick={() => setIsFullScreen(!isFullScreen)}
                        >
                          {isFullScreen
                            ? <Minimize2 className="h-4 w-4" />
                            : <Maximize2 className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {isFullScreen ? 'Kiçilt' : 'Tam ekran'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Export */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="gap-1.5 h-8"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>

                  {/* Keyboard help */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-md border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 flex items-center justify-center text-xs font-medium"
                        >
                          ?
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="text-xs space-y-1">
                          <div className="font-semibold">Naviqasiya</div>
                          <div>Excel-kimi naviqasiya aktivdir (↑↓←→, Tab, Enter).</div>
                          <div>Ctrl+S — yadda saxla · Ctrl+D — fill down · Ctrl+Del — xananı təmizlə</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* X spacer — Sheet's own close button goes here */}
                  <div className="w-6" />
                </div>
              </div>

              {/* Sheet Body — scrollable */}
              <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
                {selectedTable && (
                  <TableEntryCard
                    ref={tableEntryRef}
                    table={selectedTable}
                    onMetaChange={setEntryMeta}
                  />
                )}
              </div>

              {/* ─── Sticky Footer — Save / Submit ──────────────────────────── */}
              {selectedTable && (
                <div className="border-t bg-white px-4 py-3 flex items-center justify-between gap-4 shrink-0">
                  {/* Left: Auto-save indicator */}
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    {entryMeta?.isSaving ? (
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saxlanır...
                      </span>
                    ) : entryMeta?.lastSaved ? (
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {formatRelativeTime(entryMeta.lastSaved)} saxlandı
                      </span>
                    ) : (
                      <span className="text-gray-400">Hələ saxlanmayıb</span>
                    )}
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={
                        !entryMeta?.hasUnsaved ||
                        entryMeta?.isSaving ||
                        entryMeta?.fullyLocked
                      }
                      className="gap-1.5 h-9"
                    >
                      {entryMeta?.isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Saxla
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSubmitAll}
                      disabled={
                        entryMeta?.fullyLocked ||
                        (entryMeta !== null && !entryMeta.hasEditableRows)
                      }
                      className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Send className="h-4 w-4" />
                      Göndər
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Unsaved changes warning */}
          <ConfirmDialog
            open={showUnsavedWarning}
            type="warning"
            title="Saxlanmamış dəyişikliklər"
            description="Dəyişikliklər hələ saxlanmayıb. Çıxmaq istəyirsiniz?"
            confirmLabel="Bəli, çıx"
            cancelLabel="Qal"
            onConfirm={() => {
              setShowUnsavedWarning(false);
              handleCloseSheet(true);
            }}
            onClose={() => setShowUnsavedWarning(false)}
          />
        </>
      )}
    </div>
  );
}
