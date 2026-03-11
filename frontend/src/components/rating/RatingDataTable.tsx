import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    ClipboardList,
    MessageSquare,
    CalendarCheck,
    CheckSquare,
    ExternalLink,
    SlidersHorizontal,
    Trophy,
    Users,
    Pencil,
    FileText,
} from 'lucide-react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { RatingItem, PaginatedResponse } from '@/types/rating';

const CATEGORY_LABELS: Record<string, string> = {
    region_contribution: 'Region təhsilinə tövhə',
    sector_contribution: 'Rayon/Sektor tövhəsi',
    documents_ok: 'Sənədlər qaydasında',
    attendance_ok: 'Davamiyyət qaydasında',
    teaching_quality_high: 'Tədris keyfiyyəti yüksək',
    parent_relations_good: 'Valideynlərlə iş nümunəvi',
    digital_env_ok: 'Rəqəmsal mühit qurulub',
    monitoring_positive: 'Monitorinq müsbət',
    self_development: 'Özünütəhsil fəaliyyəti',
    teacher_management_good: 'Müəllimlər ilə iş yaxşı',
    documents_fail: 'Sənədlər qaydasında deyil',
    attendance_fail: 'Davamiyyət qaydasında deyil',
    teaching_quality_low: 'Tədris keyfiyyəti aşağı',
    parent_relations_weak: 'Valideynlərlə iş zəif',
    digital_env_fail: 'Rəqəmsal mühit yoxdur',
    monitoring_negative: 'Monitorinq nöqsanlar',
    teacher_management_weak: 'Müəllimlər ilə iş zəif',
    admin_violations: 'İnzibati nöqsanlar',
};

const POSITIVE_CATEGORY_VALUES = new Set([
    'region_contribution', 'sector_contribution', 'documents_ok',
    'attendance_ok', 'teaching_quality_high', 'parent_relations_good',
    'digital_env_ok', 'monitoring_positive', 'self_development', 'teacher_management_good',
]);

interface RatingDataTableProps {
    data: RatingItem[];
    pagination: PaginatedResponse<RatingItem> | null;
    onPageChange: (page: number) => void;
    selectedItems: number[];
    onSelectItem: (id: number) => void;
    onSelectAll: (checked: boolean) => void;
    onManualScoreEdit: (item: RatingItem) => void;
    variant?: 'school' | 'sector';
}

export const RatingDataTable: React.FC<RatingDataTableProps> = ({
    data,
    pagination,
    onPageChange,
    selectedItems,
    onSelectItem,
    onSelectAll,
    onManualScoreEdit,
    variant = 'school',
}) => {
    const isSector = variant === 'sector';

    const getRatingBadge = (score: number) => {
        if (score >= 5) return { text: 'Əla', className: 'bg-green-100 text-green-700 border-green-200' };
        if (score >= 3) return { text: 'Yaxşı', className: 'bg-blue-100 text-blue-700 border-blue-200' };
        if (score >= 1) return { text: 'Orta', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
        if (score >= 0) return { text: 'Zəif', className: 'bg-orange-100 text-orange-700 border-orange-200' };
        return { text: 'Mənfi', className: 'bg-red-100 text-red-700 border-red-200' };
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <Badge className="bg-green-500 hover:bg-green-600 text-[10px] px-1.5 py-0 h-4">Aktiv</Badge>;
            case 'archived':
                return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Arxiv</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Qaralama</Badge>;
        }
    };

    const scoreCell = (
        value: number,
        tooltipText: string,
        isNegativeColored = true
    ) => (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`inline-block min-w-[2.5rem] px-2 py-0.5 rounded font-medium text-center text-sm ${
                        isNegativeColored && value < 0 ? 'text-red-600' : 'text-gray-700'
                    }`}>
                        {value}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px]">
                    {tooltipText}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const iconHead = (icon: React.ReactNode, tooltip: string) => (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-center cursor-default">
                        {icon}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <Table data-testid="rating-table">
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead className="w-10 text-center">
                            <Checkbox
                                data-testid="rating-select-all"
                                checked={data.length > 0 && selectedItems.length === data.length}
                                onCheckedChange={(checked) => onSelectAll(!!checked)}
                            />
                        </TableHead>

                        {/* Merged: Institution + Director */}
                        <TableHead className="font-semibold text-gray-700 min-w-[350px]">
                            {isSector ? 'Sektor Admin' : 'Müəssisə / Direktor'}
                        </TableHead>

                        {/* Icon headers */}
                        <TableHead className="w-12 text-center">
                            {iconHead(
                                <ClipboardList className="h-4 w-4 text-gray-500" />,
                                'Tapşırıq balı (auto-hesablanan)'
                            )}
                        </TableHead>
                        <TableHead className="w-12 text-center">
                            {iconHead(
                                <MessageSquare className="h-4 w-4 text-gray-500" />,
                                'Sorğu balı (auto-hesablanan)'
                            )}
                        </TableHead>
                        <TableHead className="w-12 text-center">
                            {iconHead(
                                isSector
                                    ? <CheckSquare className="h-4 w-4 text-gray-500" />
                                    : <CalendarCheck className="h-4 w-4 text-gray-500" />,
                                isSector
                                    ? 'Təsdiq balı (auto-hesablanan)'
                                    : 'Davamiyyət balı (auto-hesablanan)'
                            )}
                        </TableHead>
                        <TableHead className="w-12 text-center">
                            {iconHead(
                                <ExternalLink className="h-4 w-4 text-gray-500" />,
                                'Link balı (auto-hesablanan)'
                            )}
                        </TableHead>
                        <TableHead className="w-12 text-center">
                            {iconHead(
                                <FileText className="h-4 w-4 text-gray-500" />,
                                'Hesabat balı (auto-hesablanan)'
                            )}
                        </TableHead>

                        {/* Manual — wider column */}
                        <TableHead className="min-w-[180px] font-semibold text-gray-700">
                            {iconHead(
                                <div className="flex items-center gap-1.5">
                                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                                    <span className="text-xs font-semibold text-gray-700">Manual</span>
                                </div>,
                                'Manual bal — admin tərəfindən əl ilə verilir'
                            )}
                        </TableHead>

                        <TableHead className="w-16 text-center">
                            {iconHead(
                                <Trophy className="h-4 w-4 text-amber-500" />,
                                'Ümumi bal (task + survey + davamiyyət/təsdiq + link + manual)'
                            )}
                        </TableHead>

                        <TableHead className="w-20 text-center font-semibold text-gray-700">
                            Status
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => {
                        const rowId = item.id || item.user_id;
                        const badge = getRatingBadge(Number(item.overall_score) || 0);
                        const hasCategory = !!item.manual_score_category;
                        const isPositiveCat = item.manual_score_category
                            ? POSITIVE_CATEGORY_VALUES.has(item.manual_score_category)
                            : true;
                        const categoryLabel = item.manual_score_category
                            ? CATEGORY_LABELS[item.manual_score_category] ?? item.manual_score_category
                            : null;

                        return (
                            <TableRow key={rowId} data-testid={`rating-row-${rowId}`} className="hover:bg-blue-50/30 transition-colors">
                                <TableCell className="text-center">
                                    <Checkbox
                                        data-testid={`rating-select-${rowId}`}
                                        checked={selectedItems.includes(rowId)}
                                        onCheckedChange={() => onSelectItem(rowId)}
                                    />
                                </TableCell>

                                {/* Merged institution + director cell */}
                                <TableCell className="py-2.5">
                                    <div className="font-semibold text-sm text-gray-900 leading-tight truncate max-w-[450px]">
                                        {item.institution?.name || '—'}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        <span className="text-xs text-muted-foreground truncate max-w-[430px]">
                                            {item.user?.full_name || 'Bilinməyən'}
                                        </span>
                                    </div>
                                </TableCell>

                                {/* Task score (read-only) */}
                                <TableCell className="text-center p-2">
                                    {scoreCell(
                                        Number(item.task_score) || 0,
                                        item.score_details
                                            ? `Vaxtında: ${item.score_details.tasks_on_time ?? 0} | Gecikmiş: ${item.score_details.tasks_late ?? 0} | Cəmi: ${item.score_details.tasks_total ?? 0}`
                                            : 'Hesablanmayıb'
                                    )}
                                </TableCell>

                                {/* Survey score (read-only) */}
                                <TableCell className="text-center p-2">
                                    {scoreCell(
                                        Number(item.survey_score) || 0,
                                        item.score_details
                                            ? `Vaxtında: ${item.score_details.surveys_on_time ?? 0} | Gecikmiş: ${item.score_details.surveys_late ?? 0} | Cəmi: ${item.score_details.surveys_total ?? 0}`
                                            : 'Hesablanmayıb'
                                    )}
                                </TableCell>

                                {/* Attendance / Approval score (read-only) */}
                                <TableCell className="text-center p-2">
                                    {isSector
                                        ? scoreCell(
                                            Number(item.approval_score) || 0,
                                            item.score_details
                                                ? `Vaxtında: ${item.score_details.approved_on_time ?? 0} | Gecikmiş: ${item.score_details.approved_late ?? 0} | Gözləyən: ${item.score_details.approval_pending_overdue ?? 0} | Cəmi: ${item.score_details.approval_total ?? 0}`
                                                : 'Hesablanmayıb'
                                        )
                                        : scoreCell(
                                            Number(item.attendance_score) || 0,
                                            item.score_details
                                                ? `Vaxtında: ${item.score_details.attendance_on_time ?? 0} | Buraxılmış: ${item.score_details.attendance_missed ?? 0} | Cəmi gün: ${item.score_details.attendance_total_days ?? 0}`
                                                : 'Hesablanmayıb'
                                        )
                                    }
                                </TableCell>

                                {/* Link score (read-only) */}
                                <TableCell className="text-center p-2">
                                    {scoreCell(
                                        Number(item.link_score) || 0,
                                        item.score_details
                                            ? `Açılmış: ${item.score_details.links_opened ?? 0} | Açılmamış: ${item.score_details.links_missed ?? 0} | Cəmi: ${item.score_details.links_total ?? 0}`
                                            : 'Hesablanmayıb'
                                    )}
                                </TableCell>

                                {/* Report score (read-only) */}
                                <TableCell className="text-center p-2">
                                    {scoreCell(
                                        Number(item.report_score) || 0,
                                        item.score_details
                                            ? `Vaxtında: ${item.score_details.reports_on_time ?? 0} | Gecikmiş: ${item.score_details.reports_late ?? 0} | Buraxılmış: ${item.score_details.reports_missed ?? 0} | Cəmi: ${item.score_details.reports_total ?? 0}`
                                            : 'Hesablanmayıb'
                                    )}
                                </TableCell>

                                {/* Manual score — click to edit via dialog */}
                                <TableCell className="p-2">
                                    <button
                                        data-testid={`rating-manual-edit-${rowId}`}
                                        onClick={() => onManualScoreEdit(item)}
                                        className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors group text-left"
                                        title="Manual balı dəyişdir"
                                    >
                                        <span className={`font-bold text-sm min-w-[2rem] text-center ${
                                            Number(item.manual_score) < 0
                                                ? 'text-red-600'
                                                : Number(item.manual_score) > 0
                                                    ? 'text-green-700'
                                                    : 'text-gray-500'
                                        }`}>
                                            {Number(item.manual_score) > 0 ? '+' : ''}{Number(item.manual_score) || 0}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            {hasCategory ? (
                                                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border font-medium leading-tight truncate max-w-[130px] ${
                                                    isPositiveCat
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                    {categoryLabel}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">kateqoriya yoxdur</span>
                                            )}
                                        </div>
                                        <Pencil className="h-3 w-3 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
                                    </button>
                                </TableCell>

                                {/* Overall score */}
                                <TableCell className="text-center p-2">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className={`font-bold text-base ${Number(item.overall_score) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {Number(item.overall_score) || 0}
                                        </span>
                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${badge.className}`}>
                                            {badge.text}
                                        </Badge>
                                    </div>
                                </TableCell>

                                {/* Status */}
                                <TableCell className="text-center p-2">
                                    {getStatusBadge(item.status)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {data.length === 0 && (
                <div data-testid="rating-empty-state" className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <Users className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Məlumat tapılmadı</h3>
                    <p className="text-sm">
                        Seçilmiş kriteriyalara uyğun heç bir {isSector ? 'sektor admin' : 'direktor'} reytinqi mövcud deyil.
                    </p>
                </div>
            )}

            {pagination && pagination.last_page > 1 && (
                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Toplam <strong>{pagination.total}</strong> qeyddən{' '}
                        <strong>{pagination.from}-{pagination.to}</strong> arası göstərilir
                    </div>
                    <Pagination className="mx-0 w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => onPageChange(Math.max(1, pagination.current_page - 1))}
                                    className={pagination.current_page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>

                            {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            onClick={() => onPageChange(pageNum)}
                                            isActive={pagination.current_page === pageNum}
                                            className="cursor-pointer"
                                        >
                                            {pageNum}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            })}

                            {pagination.last_page > 5 && <PaginationEllipsis />}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => onPageChange(Math.min(pagination.last_page, pagination.current_page + 1))}
                                    className={pagination.current_page === pagination.last_page ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
};
