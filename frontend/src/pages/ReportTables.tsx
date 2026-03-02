import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart3,
  LayoutTemplate,
  History,
  Users,
  Wifi,
  Plus,
  Table2,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Archive,
  Play,
  Download,
  Copy,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
  ClipboardCheck,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Building,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { reportTableService } from '@/services/reportTables';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { ReportTableModal } from '@/components/modals/ReportTableModal';
import { ReportTableApprovalQueue } from '@/components/reporttables/ReportTableApprovalQueue';
import { ReportTableReadyView } from '@/components/reporttables/ReportTableReadyView';
import { MasterTableView } from '@/components/reporttables/MasterTableView';
import { TableTemplates } from '@/components/reporttables/TableTemplates';
import { TableAnalytics } from '@/components/reporttables/TableAnalytics';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import type { ReportTable, ReportTableStatus } from '@/types/reportTable';

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<ReportTableStatus | 'deleted', { label: string; className: string }> = {
  draft: { label: 'Qaralama', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  published: { label: 'Dərc edilib', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  archived: { label: 'Arxiv', className: 'bg-orange-100 text-orange-600 border-orange-200' },
  deleted: { label: 'Silinmiş', className: 'bg-red-100 text-red-600 border-red-200' },
};

function StatusBadge({ status }: { status: ReportTableStatus }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.draft;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

// ─── Deadline indicator ───────────────────────────────────────────────────────

function DeadlineIndicator({ deadline }: { deadline?: string }) {
  if (!deadline) return null;
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 0) {
    return (
      <Badge className="bg-red-100 text-red-600 border-red-200 gap-1 text-xs">
        <AlertTriangle className="h-3 w-3" /> Son tarix keçib
      </Badge>
    );
  }
  if (days <= 3) {
    return (
      <Badge className="bg-orange-100 text-orange-600 border-orange-200 text-xs">
        {days} gün qalıb
      </Badge>
    );
  }
  return (
    <span className="text-xs text-gray-400">
      Son tarix: {new Date(deadline).toLocaleDateString('az-AZ')}
    </span>
  );
}

// ─── Card Component ───────────────────────────────────────────────────────────

type ConfirmActionType = 'delete' | 'publish' | 'archive' | 'unarchive' | 'clone' | 'restore' | 'forceDelete';

function TableCard({
  table,
  onEdit,
  onView,
  onConfirm,
  isSuperAdmin,
}: {
  table: ReportTable;
  onEdit: (t: ReportTable) => void;
  onView: (t: ReportTable) => void;
  onConfirm: (type: ConfirmActionType, t: ReportTable) => void;
  isSuperAdmin: boolean;
}) {
  const isDeleted = table.is_deleted ?? false;
  const target = table.target_institutions?.length ?? 0;
  const submitted = table.responses_count ?? 0;
  const pct = target > 0 ? Math.round((submitted / target) * 100) : 0;

  return (
    <div className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow ${isDeleted ? 'opacity-70 border-dashed border-red-200' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isDeleted ? (
              <Badge className="bg-red-100 text-red-600 border-red-200 gap-1">
                <Trash2 className="h-3 w-3" /> Silinib
              </Badge>
            ) : (
              <>
                <StatusBadge status={table.status} />
                <DeadlineIndicator deadline={table.deadline} />
              </>
            )}
          </div>
          <h3 className="font-semibold text-gray-800 leading-tight truncate">{table.title}</h3>
          {table.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{table.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-400">
            <span>{table.columns?.length ?? 0} sütun</span>
            <span>·</span>
            <span>Maks. {table.max_rows} sətir</span>
          </div>

          {/* Response progress (only for non-deleted published tables) */}
          {!isDeleted && table.status === 'published' && target > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Cavablar</span>
                <span className="font-medium">{submitted}/{target} göndərilib</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isDeleted ? (
              // Deleted table: show restore and (SuperAdmin) force delete
              <>
                <DropdownMenuItem
                  onClick={() => onConfirm('restore', table)}
                  className="text-emerald-600"
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Bərpa et
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onConfirm('forceDelete', table)}
                      className="text-red-600"
                    >
                      <ShieldAlert className="h-4 w-4 mr-2" /> Birdəfəlik sil
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : (
              // Active table: normal actions
              <>
                {table.can_edit && (
                  <DropdownMenuItem onClick={() => onEdit(table)}>
                    <Edit className="h-4 w-4 mr-2" /> Redaktə et
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onConfirm('clone', table)}>
                  <Copy className="h-4 w-4 mr-2" /> Kopyala
                </DropdownMenuItem>
                {table.status === 'draft' && (
                  <DropdownMenuItem onClick={() => onConfirm('publish', table)} className="text-emerald-600">
                    <Play className="h-4 w-4 mr-2" /> Dərc et
                  </DropdownMenuItem>
                )}
                {table.status === 'published' && (
                  <>
                    <DropdownMenuItem onClick={() => onConfirm('archive', table)} className="text-orange-600">
                      <Archive className="h-4 w-4 mr-2" /> Arxivlə
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      toast.promise(
                        reportTableService.exportTable(table.id, table.title),
                        {
                          loading: 'Excel faylı hazırlanır...',
                          success: 'Fayl yükləndi.',
                          error: 'Export zamanı xəta baş verdi.',
                        }
                      );
                    }}>
                      <Download className="h-4 w-4 mr-2" /> Export (Excel)
                    </DropdownMenuItem>
                    <TableAnalytics table={table} trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <BarChart3 className="h-4 w-4 mr-2" /> Analitika
                      </DropdownMenuItem>
                    } />
                  </>
                )}
                {table.status === 'archived' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onConfirm('unarchive', table)}
                      className="text-emerald-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" /> Arxivdən çıxart
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onConfirm('delete', table)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Sil
                    </DropdownMenuItem>
                  </>
                )}
                {table.status === 'draft' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onConfirm('delete', table)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" /> Sil
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Confirm config ───────────────────────────────────────────────────────────

const CONFIRM_CONFIG: Record<ConfirmActionType, {
  title: string;
  description: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  label: string;
}> = {
  delete: {
    title: 'Cədvəli sil?',
    description: 'Cədvəl silinmiş siyahıya köçürüləcək. SuperAdmin tərəfindən bərpa edilə bilər.',
    type: 'warning',
    label: 'Sil',
  },
  publish: {
    title: 'Cədvəli dərc et?',
    description: 'Dərc edildikdən sonra sütunlar kilitlənir və məktəblər cavab verməyə başlaya bilər.',
    type: 'info',
    label: 'Dərc et',
  },
  archive: {
    title: 'Cədvəli arxivlə?',
    description: 'Arxivlənmiş cədvəl məktəblərdə görünməz. Yeni cavab qəbul edilməz.',
    type: 'warning',
    label: 'Arxivlə',
  },
  unarchive: {
    title: 'Cədvəli arxivdən çıxart?',
    description: 'Cədvəl yenidən dərc edilmiş kimi aktiv olacaq və məktəblər üçün görünəcək.',
    type: 'info',
    label: 'Arxivdən çıxart',
  },
  clone: {
    title: 'Cədvəli kopyala?',
    description: 'Cədvəlin sütunları və parametrləri ilə yeni qaralama yaradılacaq.',
    type: 'info',
    label: 'Kopyala',
  },
  restore: {
    title: 'Cədvəli bərpa et?',
    description: 'Cədvəl yenidən aktiv siyahıya qaytarılacaq. Mövcud cavablar qorunacaq.',
    type: 'info',
    label: 'Bərpa et',
  },
  forceDelete: {
    title: 'Cədvəli birdəfəlik sil?',
    description: 'Bu əməliyyat GERİ ALINMAZ! Cədvəl bütün cavabları ilə birlikdə sistemdən tamamilə silinəcək.',
    type: 'danger',
    label: 'Birdəfəlik sil',
  },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportTables() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, hasPermission } = useRoleCheck();
  const canReview = hasPermission('report_table_responses.review');
  const canViewMaster = hasPermission('report_tables.view_all');
  const [viewMode, setViewMode] = useState<'tables' | 'approval' | 'ready' | 'master' | 'templates'>('tables');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportTableStatus | 'all' | 'deleted'>('all');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<ReportTable | null>(null);
  const [viewingTable, setViewingTable] = useState<ReportTable | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: ConfirmActionType; table: ReportTable } | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetActiveTab, setSheetActiveTab] = useState<'tesdiq' | 'hazir'>('tesdiq');
  const [readySelectedTableId, setReadySelectedTableId] = useState<number | null>(null);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-tables', search, statusFilter, page],
    queryFn: () =>
      reportTableService.getList({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        per_page: 20,
        page,
      }),
  });

  const tables: ReportTable[] = data?.data ?? [];
  const meta = data?.meta;

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const publishMutation = useMutation({
    mutationFn: (table: ReportTable) => reportTableService.publishTable(table.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Hesabat cədvəli dərc edildi.');
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (table: ReportTable) => reportTableService.archiveTable(table.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Hesabat cədvəli arxivləndi.');
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (table: ReportTable) => reportTableService.unarchiveTable(table.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Hesabat cədvəli arxivdən çıxarıldı.');
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (table: ReportTable) => reportTableService.deleteTable(table.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Hesabat cədvəli silindi.');
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cloneMutation = useMutation({
    mutationFn: (table: ReportTable) =>
      reportTableService.createTable({
        title: table.title + ' (Kopya)',
        description: table.description,
        notes: table.notes,
        columns: table.columns ?? [],
        max_rows: table.max_rows ?? 50,
        target_institutions: table.target_institutions,
        deadline: undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Cədvəl kopyalandı. Qaralamalar bölməsinə baxın.');
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const restoreMutation = useMutation({
    mutationFn: (table: ReportTable) => reportTableService.restoreTable(table.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Cədvəl bərpa edildi.');
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const forceDeleteMutation = useMutation({
    mutationFn: (table: ReportTable) => reportTableService.forceDeleteTable(table.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Cədvəl birdəfəlik silindi.');
      setConfirmState(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Confirm handler ────────────────────────────────────────────────────────

  const handleConfirmAction = () => {
    if (!confirmState) return;
    const { type, table } = confirmState;
    if (type === 'delete') deleteMutation.mutate(table);
    else if (type === 'publish') publishMutation.mutate(table);
    else if (type === 'archive') archiveMutation.mutate(table);
    else if (type === 'unarchive') unarchiveMutation.mutate(table);
    else if (type === 'clone') cloneMutation.mutate(table);
    else if (type === 'restore') restoreMutation.mutate(table);
    else if (type === 'forceDelete') forceDeleteMutation.mutate(table);
  };

  const isMutating =
    publishMutation.isPending ||
    archiveMutation.isPending ||
    unarchiveMutation.isPending ||
    deleteMutation.isPending ||
    cloneMutation.isPending ||
    restoreMutation.isPending ||
    forceDeleteMutation.isPending;

  // ─── Helper Functions ──────────────────────────────────────────────────────

  const handleExport = (table: ReportTable) => {
    toast.promise(
      reportTableService.exportTable(table.id, table.title),
      {
        loading: 'Cədvəl export edilir...',
        success: 'Cədvəl export edildi',
        error: 'Export zamanı xəta baş verdi',
      }
    );
  };

  // ─── Filter button list ──────────────────────────────────────────────────────

  const statusButtons: { value: ReportTableStatus | 'all' | 'deleted'; label: string; className?: string }[] = [
    { value: 'all', label: 'Hamısı' },
    { value: 'draft', label: STATUS_MAP.draft.label },
    { value: 'published', label: STATUS_MAP.published.label },
    { value: 'archived', label: STATUS_MAP.archived.label },
    ...(isSuperAdmin ? [{ value: 'deleted' as const, label: 'Silinmiş', className: 'text-red-500' }] : []),
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Table2 className="h-6 w-6 text-emerald-600" />
            Hesabat Cədvəlləri
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Məktəblər üçün dinamik məlumat cədvəlləri yaradın və idarə edin.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'tables' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('tables')}
              className="gap-1"
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Cədvəllər</span>
            </Button>
            {canReview && (
              <>
                <Button
                  variant={viewMode === 'approval' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('approval')}
                  className="gap-1"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Təsdiq</span>
                </Button>
                <Button
                  variant={viewMode === 'ready' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('ready')}
                  className="gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Hazır</span>
                </Button>
              </>
            )}
            {canViewMaster && (
              <Button
                variant={viewMode === 'master' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('master')}
                className="gap-1"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Master</span>
              </Button>
            )}
            <Button
              variant={viewMode === 'templates' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('templates')}
              className="gap-1"
            >
              <LayoutTemplate className="h-4 w-4" />
              <span className="hidden sm:inline">Şablonlar</span>
            </Button>
          </div>

          {viewMode === 'tables' && statusFilter !== 'deleted' && (
            <Button
              onClick={() => setShowModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              Yeni cədvəl
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Single Grid Layout (removed left list) */}
      {viewMode === 'tables' ? (
        <div className="space-y-6">
          {/* Filters Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cədvəl axtar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-1 flex-wrap">
              {statusButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={statusFilter === btn.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(btn.value)}
                  className={
                    statusFilter === btn.value
                      ? btn.value === 'deleted'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                      : btn.className ?? ''
                  }
                >
                  {btn.value === 'deleted' && <Trash2 className="h-3.5 w-3.5 mr-1" />}
                  {btn.label}
                </Button>
              ))}
            </div>

            {/* Global Export Button */}
            {tables.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const publishedTables = tables.filter(t => t.status === 'published' && !t.is_deleted);
                  if (publishedTables.length === 0) {
                    toast.error('Export üçün dərc edilmiş cədvəl yoxdur');
                    return;
                  }
                  
                  toast.promise(
                    reportTableService.exportTable(publishedTables[0].id, publishedTables[0].title),
                    {
                      loading: 'Cədvəl export edilir...',
                      success: 'Cədvəl export edildi',
                      error: 'Export zamanı xəta baş verdi',
                    }
                  );
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>

          {/* Tables Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Table2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">
                {statusFilter === 'deleted' ? 'Silinmiş cədvəl yoxdur' : 'Cədvəl tapılmadı'}
              </p>
              <p className="text-sm mt-1">
                {search
                  ? 'Axtarışa uyğun cədvəl yoxdur.'
                  : statusFilter === 'deleted'
                  ? 'Heç bir cədvəl silinməyib.'
                  : 'Hələ heç bir hesabat cədvəli yaradılmayıb.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    onEdit={(t) => { setEditingTable(t); setShowModal(true); }}
                    onView={(t) => { setViewingTable(t); setIsSheetOpen(true); }}
                    onConfirm={(type, t) => setConfirmState({ type, table: t })}
                    isSuperAdmin={isSuperAdmin}
                  />
                ))}
              </div>

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
            </>
          )}
        </div>
      ) : viewMode === 'approval' ? (
        <ReportTableApprovalQueue />
      ) : viewMode === 'ready' ? (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* Left Panel - Table List */}
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
                <p className="text-sm font-medium text-gray-700">Hazır cədvəllər</p>
                <p className="text-xs text-gray-500">Klik edin və sağ paneldə görün</p>
              </div>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y">
                {tables
                  .filter(t => t.status === 'published' && (t.responses_count ?? 0) > 0)
                  .filter(t => !search.trim() || t.title.toLowerCase().includes(search.toLowerCase()))
                  .map((table) => {
                    const isSelected = readySelectedTableId === table.id;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setReadySelectedTableId(table.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={`font-medium text-sm truncate ${isSelected ? 'text-emerald-700' : 'text-gray-800'}`}>
                              {table.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                {table.responses_count} cavab
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                {tables.filter(t => t.status === 'published' && (t.responses_count ?? 0) > 0).length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    Hazır cədvəl tapılmadı.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Selected Table Data */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {readySelectedTableId ? (
              <div className="h-full overflow-y-auto pr-2">
                <ReportTableReadyView 
                  tableId={readySelectedTableId} 
                  showAsList 
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center border rounded-xl bg-gray-50 text-gray-500">
                <div className="text-center p-8">
                  <Table2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Cədvəl seçin</p>
                  <p className="text-sm mt-1">Sol siyahıdan istənilən cədvəli seçərək məlumatları görün.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'master' ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Master görünüş hazırlanma mərhələsindədir</p>
          <p className="text-sm mt-1">Bu funksiya tezliklə istifadəyə veriləcək.</p>
        </div>
      ) : viewMode === 'templates' ? (
        <div className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Şablonlar funksiyası hazırlanma mərhələsindədir. Tezliklə istifadəyə veriləcək.
            </AlertDescription>
          </Alert>
          <TableTemplates
            onSelectTemplate={(template) => {
              // Create new table from template
              reportTableService.createTable({
                title: template.name + ' (Şablon)',
                description: template.description,
                columns: template.columns,
                max_rows: template.max_rows ?? 50,
                target_institutions: [],
              }).then(() => {
                toast.success('Şablondan cədvəl yaradıldı');
                queryClient.invalidateQueries({ queryKey: ['report-tables'] });
                setViewMode('tables');
              });
            }}
          />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Axtar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-1 flex-wrap">
              {statusButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={statusFilter === btn.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(btn.value)}
                  className={
                    statusFilter === btn.value
                      ? btn.value === 'deleted'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                      : btn.className ?? ''
                  }
                >
                  {btn.value === 'deleted' && <Trash2 className="h-3.5 w-3.5 mr-1" />}
                  {btn.label}
                </Button>
              ))}
            </div>

            {/* Global Export Button */}
            {tables.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const publishedTables = tables.filter(t => t.status === 'published' && !t.is_deleted);
                  if (publishedTables.length === 0) {
                    toast.error('Export üçün dərc edilmiş cədvəl yoxdur');
                    return;
                  }
                  
                  toast.promise(
                    reportTableService.exportTable(publishedTables[0].id, publishedTables[0].title),
                    {
                      loading: 'Cədvəl export edilir...',
                      success: 'Cədvəl export edildi',
                      error: 'Export zamanı xəta baş verdi',
                    }
                  );
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>

          {/* Deleted tab info banner */}
          {statusFilter === 'deleted' && (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <AlertDescription>
                Silinmiş cədvəllər göstərilir. Bərpa etmək üçün "Bərpa et", tamamilə silmək üçün "Birdəfəlik sil" seçin.
              </AlertDescription>
            </Alert>
          )}

          {/* Error state */}
          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hesabat cədvəlləri yüklənərkən xəta baş verdi. Səhifəni yeniləyin.
              </AlertDescription>
            </Alert>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Table2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">
                {statusFilter === 'deleted' ? 'Silinmiş cədvəl yoxdur' : 'Cədvəl tapılmadı'}
              </p>
              <p className="text-sm mt-1">
                {search
                  ? 'Axtarışa uyğun cədvəl yoxdur.'
                  : statusFilter === 'deleted'
                  ? 'Heç bir cədvəl silinməyib.'
                  : 'Hələ heç bir hesabat cədvəli yaradılmayıb.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    onEdit={(t) => { setEditingTable(t); setShowModal(true); }}
                    onView={setViewingTable}
                    onConfirm={(type, t) => setConfirmState({ type, table: t })}
                    isSuperAdmin={isSuperAdmin}
                  />
                ))}
              </div>

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
            </>
          )}
        </>
      )}

      {/* Create/Edit Modal (hidden for deleted tab) */}
      <ReportTableModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTable(null); }}
        editingTable={editingTable}
      />

      {/* Slide-in Panel with Tabs (like School Admin) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <div className="flex-1">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Table2 className="h-5 w-5 text-emerald-600" />
                {viewingTable?.title}
              </SheetTitle>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{viewingTable?.columns?.length ?? 0} sütun</span>
                <span>·</span>
                <span>Maks. {viewingTable?.max_rows} sətir</span>
                {viewingTable?.deadline && (
                  <>
                    <span>·</span>
                    <span>Son tarix: {new Date(viewingTable.deadline).toLocaleDateString('az-AZ')}</span>
                  </>
                )}
              </div>
              
              {/* Statistics */}
              {viewingTable && (
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Building className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{viewingTable.target_institutions?.length ?? 0}</span>
                    <span className="text-gray-500">Hədəf müəssisə</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{viewingTable.responses_count ?? 0}</span>
                    <span className="text-gray-500">Cavab</span>
                  </div>
                  {(() => {
                    const target = viewingTable.target_institutions?.length ?? 0;
                    const submitted = viewingTable.responses_count ?? 0;
                    const pct = target > 0 ? Math.round((submitted / target) * 100) : 0;
                    return (
                      <div className="flex items-center gap-2 flex-1">
                        <Progress value={pct} className="h-2 w-24" />
                        <span className="text-sm font-medium">{pct}%</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </SheetHeader>
          
          {viewingTable && (
            <div className="mt-4 space-y-4">
              {/* Table Description */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">{viewingTable.description || 'Açıqlama yoxdur'}</p>
              </div>

              {/* Tabs */}
              <Tabs value={sheetActiveTab} onValueChange={(v) => setSheetActiveTab(v as 'tesdiq' | 'hazir')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tesdiq" className="gap-1">
                    <ClipboardCheck className="h-4 w-4" />
                    Təsdiq
                  </TabsTrigger>
                  <TabsTrigger value="hazir" className="gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Hazır
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tesdiq" className="mt-4">
                  <ReportTableApprovalQueue tableId={viewingTable.id} />
                </TabsContent>
                
                <TabsContent value="hazir" className="mt-4">
                  <ReportTableReadyView tableId={viewingTable.id} showAsList />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          open={!!confirmState}
          type={CONFIRM_CONFIG[confirmState.type].type}
          title={CONFIRM_CONFIG[confirmState.type].title}
          description={CONFIRM_CONFIG[confirmState.type].description}
          confirmLabel={CONFIRM_CONFIG[confirmState.type].label}
          onConfirm={handleConfirmAction}
          onClose={() => setConfirmState(null)}
          loading={isMutating}
        />
      )}
    </div>
  );
}
