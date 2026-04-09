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
import { ReportTableApprovalGroupedView } from '@/components/reporttables/ReportTableApprovalGroupedView';
import { ReportTableReadyGroupedView } from '@/components/reporttables/ReportTableReadyGroupedView';
import { ReportTableStatisticsView } from '@/components/reporttables/ReportTableStatisticsView';
import { RatingCalculationInfo } from '@/components/reporttables/RatingCalculationInfo';
import { ReportTableReadyView } from '@/components/reporttables/ReportTableReadyView';
import { MasterTableView } from '@/components/reporttables/MasterTableView';
import { TableTemplates } from '@/components/reporttables/TableTemplates';
import { TableAnalytics } from '@/components/reporttables/TableAnalytics';
import { TablePreviewModal } from '@/components/reporttables/TablePreviewModal';
import { ReportTableErrorBoundary } from '@/components/reporttables/ErrorBoundary';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useURLFilters, useURLPagination } from '@/hooks/useURLState';
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

type ConfirmActionType = 'delete' | 'publish' | 'archive' | 'unarchive' | 'clone' | 'restore' | 'forceDelete' | 'preview';

function TableCard({
  table,
  onEdit,
  onView,
  onPreview,
  onConfirm,
  onToggleAdditionalRows,
  isSuperAdmin,
  canManageAdditionalRows,
}: {
  table: ReportTable;
  onEdit: (t: ReportTable) => void;
  onView: (t: ReportTable) => void;
  onPreview?: (t: ReportTable) => void;
  onConfirm: (type: ConfirmActionType, t: ReportTable) => void;
  onToggleAdditionalRows?: (t: ReportTable) => void;
  isSuperAdmin: boolean;
  canManageAdditionalRows?: boolean;
}) {
  const isDeleted = table.is_deleted ?? false;
  const target = table.target_institutions?.length ?? 0;
  const submitted = table.responses_submitted_count ?? table.responses_count ?? 0;
  const approved = table.responses_approved_count ?? 0;
  const pending = table.responses_pending_count ?? 0;
  const rejected = table.responses_rejected_count ?? 0;
  const notResponded = table.not_responded_count ?? Math.max(0, target - submitted);
  const pct = target > 0 ? Math.round((submitted / target) * 100) : 0;

  // Export non-responding schools as XLSX
  const exportNonResponding = async () => {
    try {
      const data = await reportTableService.getNonRespondingSchools(table.id);
      if (!data || data.length === 0) {
        toast.info('Doldurmayan məktəb yoxdur');
        return;
      }
      
      // Create Excel XML content
      const headers = ['Məktəb', 'Sektor', 'Status'];
      const rows = data.map((s: any) => [
        s.name,
        s.sector || '-',
        'Göndərməyib'
      ]);
      
      // Create HTML table for Excel export
      const htmlTable = `
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((r: string[]) => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      `;
      
      const blob = new Blob([
        `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <meta charset="UTF-8"/>
            <style>table { border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; } th { background-color: #f0f0f0; font-weight: bold; }</style>
          </head>
          <body>${htmlTable}</body>
        </html>`
      ], { type: 'application/vnd.ms-excel;charset=utf-8' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${table.title}-doldurmayanlar.xls`;
      link.click();
      
      toast.success(`${data.length} məktəb Excel formatında yükləndi`);
    } catch (error) {
      toast.error('Export zamanı xəta baş verdi');
    }
  };

  // Export rejected schools as XLSX
  const exportRejected = async () => {
    try {
      const data = await reportTableService.getRejectedSchools(table.id);
      if (!data || data.length === 0) {
        toast.info('Rədd edilmiş məktəb yoxdur');
        return;
      }
      
      // Create Excel XML content
      const headers = ['Məktəb', 'Sektor', 'Rədd edilən sətir sayı', 'Status'];
      const rows = data.map((s: any) => [
        s.name,
        s.sector || '-',
        s.rejected_count?.toString() || '0',
        s.status || 'Rədd edilib'
      ]);
      
      // Create HTML table for Excel export
      const htmlTable = `
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((r: string[]) => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      `;
      
      const blob = new Blob([
        `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <meta charset="UTF-8"/>
            <style>table { border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; } th { background-color: #f0f0f0; font-weight: bold; }</style>
          </head>
          <body>${htmlTable}</body>
        </html>`
      ], { type: 'application/vnd.ms-excel;charset=utf-8' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${table.title}-redd-edilenler.xls`;
      link.click();
      
      toast.success(`${data.length} məktəb Excel formatında yükləndi`);
    } catch (error) {
      toast.error('Export zamanı xəta baş verdi');
    }
  };

  return (
    <div className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow ${isDeleted ? 'opacity-70 border-dashed border-red-200' : ''}`} data-testid="report-table-card">
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
                <Badge className={table.fixed_rows && table.fixed_rows.length > 0 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'}>
                  {table.fixed_rows && table.fixed_rows.length > 0 ? 'Stabil' : 'Dinamik'}
                </Badge>
                <DeadlineIndicator deadline={table.deadline} />
              </>
            )}
          </div>
          <h3 className="font-semibold text-gray-800 leading-tight truncate">{table.title}</h3>
          {table.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{table.description}</p>
          )}

          {/* Detailed Response Statistics - MOVED UP right under title */}
          {!isDeleted && table.status === 'published' && target > 0 && canManageAdditionalRows && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Cavablar</span>
                <span className="font-medium">{submitted}/{target} göndərilib ({pct}%)</span>
              </div>
              {/* Colorful segmented progress bar */}
              <div className="h-1 w-full rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${target > 0 ? (approved / target) * 100 : 0}%` }} />
                <div className="h-full bg-blue-500" style={{ width: `${target > 0 ? (pending / target) * 100 : 0}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${target > 0 ? (rejected / target) * 100 : 0}%` }} />
                <div className="h-full bg-gray-200" style={{ width: `${target > 0 ? (notResponded / target) * 100 : 0}%` }} />
              </div>
              {/* Compact Stats Row */}
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />Təsdiqləndi: <strong>{approved}</strong>
                </span>
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 text-blue-700">
                  <span className="w-1 h-1 rounded-full bg-blue-500" />Gözləyir: <strong>{pending}</strong>
                </span>
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-50 text-red-700">
                  <span className="w-1 h-1 rounded-full bg-red-500" />Rədd: <strong>{rejected}</strong>
                </span>
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-gray-50 text-gray-600">
                  <span className="w-1 h-1 rounded-full bg-gray-400" />Göndərməyib: <strong>{notResponded}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Simple Response progress for non-admin */}
          {!isDeleted && table.status === 'published' && target > 0 && !canManageAdditionalRows && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                <span>Cavablar</span>
                <span className="font-medium">{submitted}/{target} göndərilib</span>
              </div>
              <div className="h-1 w-full rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                <div className="h-full bg-gray-200" style={{ width: `${100 - pct}%` }} />
              </div>
            </div>
          )}

          {table.creator && (
            <div className="flex items-center gap-2 mt-3 pb-2 border-b border-gray-50 font-medium text-[10px]">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-gray-400 font-normal">Müəllif:</span>
                <span className="text-gray-600 font-semibold">{table.creator.name}</span>
              </div>
              <span className="text-gray-200">|</span>
              <div className="text-[9px] text-gray-400 font-normal whitespace-nowrap">
                {new Date(table.created_at).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            </div>
          )}

          {/* Meta info and Additional rows indicator - SINGLE LINE */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[10px] text-gray-400">
            <div className="flex items-center gap-2">
              <span>{table.columns?.length ?? 0} sütun</span>
              <span>·</span>
              <span>Maks. {table.max_rows} sətir</span>
              {canManageAdditionalRows && table.status === 'published' && (
                <>
                  <span>·</span>
                  <span className={table.allow_additional_rows_after_confirmation ? 'text-emerald-600' : 'text-gray-500'}>
                    {table.allow_additional_rows_after_confirmation ? 'Əlavə sətir açıq' : 'Əlavə sətir bağlı'}
                  </span>
                </>
              )}
            </div>
          </div>
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
                {(table.status === 'published' || table.status === 'archived') && (
                  <DropdownMenuItem onClick={() => onPreview?.(table)}>
                    <Table2 className="h-4 w-4 mr-2" /> Quruluşa bax
                  </DropdownMenuItem>
                )}
                {table.status === 'draft' && (
                  <>
                    <DropdownMenuItem onClick={() => onPreview?.(table)}>
                      <Eye className="h-4 w-4 mr-2" /> Nümunəyə bax
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onConfirm('publish', table)} className="text-emerald-600">
                      <Play className="h-4 w-4 mr-2" /> Dərc et
                    </DropdownMenuItem>
                  </>
                )}
                {table.status === 'published' && (
                  <>
                    {/* RegionAdmin: Toggle additional rows permission */}
                    {canManageAdditionalRows && onToggleAdditionalRows && (
                      <DropdownMenuItem 
                        onClick={() => onToggleAdditionalRows(table)}
                        className={table.allow_additional_rows_after_confirmation ? 'text-orange-600' : 'text-emerald-600'}
                      >
                        {table.allow_additional_rows_after_confirmation ? (
                          <><X className="h-4 w-4 mr-2" /> Əlavə sətri bağla</>
                        ) : (
                          <><CheckCircle2 className="h-4 w-4 mr-2" /> Əlavə sətri aç</>
                        )}
                      </DropdownMenuItem>
                    )}
                    {/* Export non-responding schools - RegionAdmin only */}
                    {canManageAdditionalRows && notResponded > 0 && (
                      <DropdownMenuItem onClick={exportNonResponding}>
                        <Download className="h-4 w-4 mr-2" /> Doldurmayanları export et ({notResponded})
                      </DropdownMenuItem>
                    )}
                    {/* Export rejected schools - RegionAdmin only */}
                    {canManageAdditionalRows && rejected > 0 && (
                      <DropdownMenuItem onClick={exportRejected} className="text-red-600">
                        <Download className="h-4 w-4 mr-2" /> Rədd edilənləri export et ({rejected})
                      </DropdownMenuItem>
                    )}
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
  preview: {
    title: 'Nümunəni öncədən gör?',
    description: 'Cədvəlin hazırkı vəziyyətini yoxlayın.',
    type: 'info',
    label: 'Bax',
  },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportTables() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isSchoolUser, hasPermission } = useRoleCheck();
  const canReview = hasPermission('report_table_responses.review');
  const canViewMaster = hasPermission('report_tables.view_all');
  const [viewMode, setViewMode] = useState<'tables' | 'approval' | 'ready' | 'master' | 'templates' | 'statistics'>('tables');
  const [search, setSearch] = useState('');
  const { filters, setFilter, clearFilters } = useURLFilters({
    status: undefined as ReportTableStatus | 'all' | 'deleted' | undefined,
  });
  const statusFilter = filters.status ?? 'all';
  
  const { page, setPage } = useURLPagination(1, 20);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<ReportTable | null>(null);
  const [viewingTable, setViewingTable] = useState<ReportTable | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: ConfirmActionType; table: ReportTable } | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetActiveTab, setSheetActiveTab] = useState<'tesdiq' | 'hazir'>('tesdiq');
  const [readySelectedTableId, setReadySelectedTableId] = useState<number | null>(null);
  const [previewTable, setPreviewTable] = useState<ReportTable | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
    refetchInterval: 30_000,
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

  // RegionAdmin üçün: əlavə sətir icazəsini aç/bağla
  const toggleAdditionalRowsMutation = useMutation({
    mutationFn: (table: ReportTable) => reportTableService.toggleAllowAdditionalRows(table.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success(data.allow_additional_rows_after_confirmation
        ? 'Məktəblər artıq təsdiqləndikdən sonra əlavə sətir göndərə biləcək.'
        : 'Məktəblər təsdiqləndikdən sonra əlavə sətir göndərə bilməyəcək.'
      );
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
          {/* Create Button - First */}
          {viewMode === 'tables' && statusFilter !== 'deleted' && (
            <Button
              onClick={() => setShowModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              Yeni cədvəl
            </Button>
          )}

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
            <Button
              variant={viewMode === 'statistics' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('statistics')}
              className="gap-1"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Statistika</span>
            </Button>
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
          </div>
          
          {isSchoolUser && viewMode === 'statistics' && (
            <RatingCalculationInfo />
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
                  onClick={() => setFilter('status', btn.value)}
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
            {/* REMOVED as per user request */}
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
                    onPreview={(t) => { setPreviewTable(t); setIsPreviewOpen(true); }}
                    onConfirm={(type, t) => setConfirmState({ type, table: t })}
                    onToggleAdditionalRows={(t) => toggleAdditionalRowsMutation.mutate(t)}
                    isSuperAdmin={isSuperAdmin}
                    canManageAdditionalRows={canReview}
                  />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Əvvəlki
                  </Button>
                  <span className="text-sm text-gray-500">{page} / {meta.last_page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
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
        <ReportTableErrorBoundary onReset={() => queryClient.invalidateQueries({ queryKey: ['report-tables'] })}>
          <ReportTableApprovalGroupedView />
        </ReportTableErrorBoundary>
      ) : viewMode === 'ready' ? (
        <ReportTableErrorBoundary onReset={() => queryClient.invalidateQueries({ queryKey: ['report-tables'] })}>
          <ReportTableReadyGroupedView />
        </ReportTableErrorBoundary>
      ) : viewMode === 'statistics' ? (
        <ReportTableErrorBoundary onReset={() => queryClient.invalidateQueries({ queryKey: ['report-tables'] })}>
          <ReportTableStatisticsView />
        </ReportTableErrorBoundary>
      ) : viewMode === 'master' ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Master görünüş hazırlanma mərhələsindədir</p>
          <p className="text-sm mt-1">Bu funksiya tezliklə istifadəyə veriləcək.</p>
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
                  onClick={() => setFilter('status', btn.value)}
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
            {/* REMOVED as per user request */}
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
                    onToggleAdditionalRows={(t) => toggleAdditionalRowsMutation.mutate(t)}
                    isSuperAdmin={isSuperAdmin}
                    canManageAdditionalRows={canReview}
                  />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Əvvəlki
                  </Button>
                  <span className="text-sm text-gray-500">{page} / {meta.last_page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
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
                  <ReportTableErrorBoundary onReset={() => queryClient.invalidateQueries({ queryKey: ['report-table-approval', viewingTable.id] })}>
                    <ReportTableApprovalQueue tableId={viewingTable.id} />
                  </ReportTableErrorBoundary>
                </TabsContent>
                
                <TabsContent value="hazir" className="mt-4">
                  <ReportTableErrorBoundary onReset={() => queryClient.invalidateQueries({ queryKey: ['report-table-ready', viewingTable.id] })}>
                    <ReportTableReadyView tableId={viewingTable.id} showAsList />
                  </ReportTableErrorBoundary>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Table Preview Modal for Draft Tables */}
      <TablePreviewModal
        table={previewTable}
        open={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setPreviewTable(null); }}
      />
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
