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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Save } from 'lucide-react';
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

interface EditingCell {
    itemId: number;
    field: 'task_score' | 'survey_score' | 'manual_score';
}

interface RatingDataTableProps {
    data: RatingItem[];
    pagination: PaginatedResponse<RatingItem> | null;
    onPageChange: (page: number) => void;
    selectedItems: number[];
    onSelectItem: (id: number) => void;
    onSelectAll: (checked: boolean) => void;
    editingCell: EditingCell | null;
    onCellClick: (itemId: number, field: EditingCell['field']) => void;
    onCellChange: (itemId: number, field: EditingCell['field'], value: string) => void;
    onCellBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onSaveItem: (id: number) => void;
    pendingChanges: Record<number, Partial<Pick<RatingItem, 'task_score' | 'survey_score' | 'manual_score'>>>;
    savingId: number | null;
    variant?: 'school' | 'sector';
}

export const RatingDataTable: React.FC<RatingDataTableProps> = ({
    data,
    pagination,
    onPageChange,
    selectedItems,
    onSelectItem,
    onSelectAll,
    editingCell,
    onCellClick,
    onCellChange,
    onCellBlur,
    onKeyDown,
    onSaveItem,
    pendingChanges,
    savingId,
    variant = 'school'
}) => {
    const isSector = variant === 'sector';
    const getRatingBadge = (score: number) => {
        if (score >= 5) return { text: 'Əla', variant: 'default' as const, className: 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' };
        if (score >= 3) return { text: 'Yaxşı', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' };
        if (score >= 1) return { text: 'Orta', variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200' };
        if (score >= 0) return { text: 'Zəif', variant: 'destructive' as const, className: 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200' };
        return { text: 'Mənfi', variant: 'destructive' as const, className: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200' };
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <Badge className="bg-green-500 hover:bg-green-600">Aktiv</Badge>;
            case 'archived':
                return <Badge variant="secondary">Arxiv</Badge>;
            default:
                return <Badge variant="outline">Qaralama</Badge>;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead className="w-12 text-center">
                            <Checkbox
                                checked={data.length > 0 && selectedItems.length === data.length}
                                onCheckedChange={(checked) => onSelectAll(!!checked)}
                            />
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">{isSector ? 'Sektor Admin' : 'Direktor'}</TableHead>
                        <TableHead className="font-semibold text-gray-700">Müəssisə</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">Task</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">Survey</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">{isSector ? 'Təsdiq' : 'Davamiyyət'}</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">Link</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">Manual</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">Ümumi</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 pr-6">Əməliyyat</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => {
                        const rowId = item.id || item.user_id;
                        const badge = getRatingBadge(Number(item.overall_score) || 0);
                        const hasPending = !!pendingChanges[rowId];
                        const isSaving = savingId === rowId;
                        const isEditingCell = (field: EditingCell['field']) =>
                            editingCell?.itemId === rowId && editingCell?.field === field;

                        return (
                            <TableRow key={rowId} className="hover:bg-blue-50/30 transition-colors">
                                <TableCell className="text-center">
                                    <Checkbox
                                        checked={selectedItems.includes(rowId)}
                                        onCheckedChange={() => onSelectItem(rowId)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-200">
                                            <Users className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">{item.user?.full_name || 'Bilinməyən'}</div>
                                            <div className="text-xs text-muted-foreground">{item.user?.email || '-'}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-sm text-gray-600">
                                    {item.institution?.name || '-'}
                                </TableCell>

                                {(['task_score', 'survey_score'] as const).map((field) => (
                                    <TableCell key={field} className="text-center">
                                        {isEditingCell(field) ? (
                                            <input
                                                type="number"
                                                step="1"
                                                value={item[field] ?? 0}
                                                onChange={(e) => onCellChange(rowId, field, e.target.value)}
                                                onBlur={onCellBlur}
                                                onKeyDown={onKeyDown}
                                                autoFocus
                                                className="w-16 text-center border-2 border-blue-400 rounded-md px-1 py-0.5 focus:outline-none ring-2 ring-blue-100 text-sm font-bold"
                                            />
                                        ) : (
                                            <div
                                                onClick={() => onCellClick(rowId, field)}
                                                className={`inline-block min-w-[3rem] cursor-pointer hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded transition-colors font-medium ${pendingChanges[rowId]?.[field] !== undefined ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200' : 'text-gray-700'
                                                    }`}
                                            >
                                                {Number(item[field]) || 0}
                                            </div>
                                        )}
                                    </TableCell>
                                ))}

                                {/* Attendance/Approval score (read-only, auto-calculated) */}
                                <TableCell className="text-center">
                                    {isSector ? (
                                        <div
                                            className="inline-block min-w-[3rem] px-2 py-1 rounded font-medium text-gray-700"
                                            title={item.score_details ? `Vaxtında: ${item.score_details.approved_on_time ?? 0} | Gecikmiş: ${item.score_details.approved_late ?? 0} | Gözləyən: ${item.score_details.approval_pending_overdue ?? 0} | Cəmi: ${item.score_details.approval_total ?? 0}` : 'Hesablanmayıb'}
                                        >
                                            <span className={Number(item.approval_score) < 0 ? 'text-red-600' : ''}>
                                                {Number(item.approval_score) || 0}
                                            </span>
                                        </div>
                                    ) : (
                                        <div
                                            className="inline-block min-w-[3rem] px-2 py-1 rounded font-medium text-gray-700"
                                            title={item.score_details ? `Vaxtında: ${item.score_details.attendance_on_time ?? 0} | Buraxılmış: ${item.score_details.attendance_missed ?? 0} | Cəmi gün: ${item.score_details.attendance_total_days ?? 0}` : 'Hesablanmayıb'}
                                        >
                                            <span className={Number(item.attendance_score) < 0 ? 'text-red-600' : ''}>
                                                {Number(item.attendance_score) || 0}
                                            </span>
                                        </div>
                                    )}
                                </TableCell>

                                {/* Link score (read-only, auto-calculated) */}
                                <TableCell className="text-center">
                                    <div
                                        className="inline-block min-w-[3rem] px-2 py-1 rounded font-medium text-gray-700"
                                        title={item.score_details ? `Açılmış: ${item.score_details.links_opened ?? 0} | Açılmamış: ${item.score_details.links_missed ?? 0} | Cəmi: ${item.score_details.links_total ?? 0}` : 'Hesablanmayıb'}
                                    >
                                        <span className={Number(item.link_score) < 0 ? 'text-red-600' : ''}>
                                            {Number(item.link_score) || 0}
                                        </span>
                                    </div>
                                </TableCell>

                                {/* Manual score (editable) */}
                                <TableCell className="text-center">
                                    {isEditingCell('manual_score') ? (
                                        <input
                                            type="number"
                                            min={-100}
                                            max={100}
                                            step="1"
                                            value={item.manual_score ?? 0}
                                            onChange={(e) => onCellChange(rowId, 'manual_score', e.target.value)}
                                            onBlur={onCellBlur}
                                            onKeyDown={onKeyDown}
                                            autoFocus
                                            className="w-16 text-center border-2 border-blue-400 rounded-md px-1 py-0.5 focus:outline-none ring-2 ring-blue-100 text-sm font-bold"
                                        />
                                    ) : (
                                        <div
                                            onClick={() => onCellClick(rowId, 'manual_score')}
                                            className={`inline-block min-w-[3rem] cursor-pointer hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded transition-colors font-medium ${pendingChanges[rowId]?.manual_score !== undefined ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200' : 'text-gray-700'
                                                }`}
                                        >
                                            {Number(item.manual_score) || 0}
                                        </div>
                                    )}
                                </TableCell>

                                <TableCell className="text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`font-bold text-lg ${Number(item.overall_score) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {Number(item.overall_score) || 0}
                                        </span>
                                        <Badge variant={badge.variant} className={`text-[10px] px-1.5 py-0 h-4 border ${badge.className}`}>
                                            {badge.text}
                                        </Badge>
                                    </div>
                                </TableCell>

                                <TableCell className="text-center">
                                    {getStatusBadge(item.status)}
                                </TableCell>

                                <TableCell className="text-right pr-6">
                                    {hasPending && (
                                        <Button
                                            onClick={() => onSaveItem(rowId)}
                                            variant="default"
                                            size="sm"
                                            disabled={isSaving}
                                            className="h-8 bg-green-600 hover:bg-green-700"
                                        >
                                            <Save className="h-3 w-3 mr-1" />
                                            {isSaving ? '...' : 'Saxla'}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <Users className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Məlumat tapılmadı</h3>
                    <p className="text-sm">Seçilmiş kriteriyalara uyğun heç bir {isSector ? 'sektor admin' : 'direktor'} reytinqi mövcud deyil.</p>
                </div>
            )}

            {pagination && pagination.last_page > 1 && (
                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Toplam <strong>{pagination.total}</strong> qeyddən <strong>{pagination.from}-{pagination.to}</strong> arası göstərilir
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
