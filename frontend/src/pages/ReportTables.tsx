import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
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
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { reportTableService } from '@/services/reportTables';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { ReportTableModal } from '@/components/modals/ReportTableModal';
import { ReportTableResponsesView } from '@/components/reporttables/ReportTableResponsesView';
import type { ReportTable, ReportTableStatus } from '@/types/reportTable';

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<ReportTableStatus, { label: string; className: string }> = {
  draft: { label: 'Qaralama', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  published: { label: 'Dərc edilib', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  archived: { label: 'Arxiv', className: 'bg-orange-100 text-orange-600 border-orange-200' },
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

type ConfirmActionType = 'delete' | 'publish' | 'archive' | 'clone';

function TableCard({
  table,
  onEdit,
  onView,
  onConfirm,
}: {
  table: ReportTable;
  onEdit: (t: ReportTable) => void;
  onView: (t: ReportTable) => void;
  onConfirm: (type: ConfirmActionType, t: ReportTable) => void;
}) {
  const target = table.target_institutions?.length ?? 0;
  const submitted = table.responses_count ?? 0;
  const pct = target > 0 ? Math.round((submitted / target) * 100) : 0;

  return (
    <div className="bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <StatusBadge status={table.status} />
            <DeadlineIndicator deadline={table.deadline} />
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

          {/* Response progress */}
          {table.status === 'published' && target > 0 && (
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
            <DropdownMenuItem onClick={() => onView(table)}>
              <Eye className="h-4 w-4 mr-2" /> Cavablara bax
            </DropdownMenuItem>
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
    description: 'Bu əməliyyat geri alına bilməz. Cədvəl bütün məlumatları ilə silinəcək.',
    type: 'danger',
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
  clone: {
    title: 'Cədvəli kopyala?',
    description: 'Cədvəlin sütunları və parametrləri ilə yeni qaralama yaradılacaq.',
    type: 'info',
    label: 'Kopyala',
  },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportTables() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportTableStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<ReportTable | null>(null);
  const [viewingTable, setViewingTable] = useState<ReportTable | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: ConfirmActionType; table: ReportTable } | null>(null);

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

  // ─── Confirm handler ────────────────────────────────────────────────────────

  const handleConfirmAction = () => {
    if (!confirmState) return;
    const { type, table } = confirmState;
    if (type === 'delete') deleteMutation.mutate(table);
    else if (type === 'publish') publishMutation.mutate(table);
    else if (type === 'archive') archiveMutation.mutate(table);
    else if (type === 'clone') cloneMutation.mutate(table);
  };

  const isMutating =
    publishMutation.isPending ||
    archiveMutation.isPending ||
    deleteMutation.isPending ||
    cloneMutation.isPending;

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
        <Button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          <Plus className="h-4 w-4" />
          Yeni cədvəl
        </Button>
      </div>

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

        <div className="flex gap-1">
          {(['all', 'draft', 'published', 'archived'] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {s === 'all' ? 'Hamısı' : STATUS_MAP[s as ReportTableStatus]?.label ?? s}
            </Button>
          ))}
        </div>
      </div>

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
          <p className="text-lg font-medium">Cədvəl tapılmadı</p>
          <p className="text-sm mt-1">
            {search ? 'Axtarışa uyğun cədvəl yoxdur.' : 'Hələ heç bir hesabat cədvəli yaradılmayıb.'}
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

      {/* Create/Edit Modal */}
      <ReportTableModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTable(null); }}
        editingTable={editingTable}
      />

      {/* Responses View Dialog */}
      <Dialog open={!!viewingTable} onOpenChange={(v) => !v && setViewingTable(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
              {viewingTable?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {viewingTable && <ReportTableResponsesView table={viewingTable} />}
          </div>
        </DialogContent>
      </Dialog>

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
