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
import { Users, Calculator, Plus, ExternalLink } from 'lucide-react';
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

interface TeacherRatingDataTableProps {
    data: RatingItem[];
    pagination: PaginatedResponse<RatingItem> | null;
    onPageChange: (page: number) => void;
    selectedItems: number[];
    onSelectItem: (id: number) => void;
    onSelectAll: (checked: boolean) => void;
    onCalculateItem: (userId: number) => void;
    calculatingId: number | null;
}

export const TeacherRatingDataTable: React.FC<TeacherRatingDataTableProps> = ({
    data,
    pagination,
    onPageChange,
    selectedItems,
    onSelectItem,
    onSelectAll,
    onCalculateItem,
    calculatingId
}) => {
    const getRatingBadge = (score: number) => {
        if (score >= 90) return { text: 'Əla', variant: 'default' as const, className: 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' };
        if (score >= 80) return { text: 'Yaxşı', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' };
        if (score >= 70) return { text: 'Orta', variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200' };
        if (score >= 60) return { text: 'Zəif', variant: 'destructive' as const, className: 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200' };
        return { text: 'Çox Zəif', variant: 'destructive' as const, className: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200' };
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
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-10 text-center">
                                <Checkbox
                                    checked={data.length > 0 && selectedItems.length === data.length}
                                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                                />
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700 min-w-[200px]">Müəllim</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Akademik</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Müşahidə</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Qiym.</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Sert.</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Olimp.</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Mükafat</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Bonus</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Ümumi</TableHead>
                            <TableHead className="text-center font-semibold text-gray-700">Status</TableHead>
                            <TableHead className="text-right font-semibold text-gray-700 pr-6">Əməliyyat</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => {
                            const rowId = item.id || item.user_id;
                            const badge = getRatingBadge(Number(item.overall_score) || 0);
                            const isCalculating = calculatingId === item.user_id;

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
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center border border-indigo-200">
                                                <Users className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{item.user?.full_name || 'Bilinməyən'}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                                    {item.institution?.name || '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center font-medium text-gray-600">
                                        {(item.academic_score || 0).toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-gray-600">
                                        {(item.observation_score || 0).toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-gray-600">
                                        {(item.assessment_score || 0).toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-gray-600">
                                        {(item.certificate_score || 0).toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-gray-600">
                                        {(item.olympiad_score || 0).toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-gray-600">
                                        {(item.award_score || 0).toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center text-blue-600 font-bold">
                                        +{item.growth_bonus || 0}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-bold text-lg text-gray-900 leading-none">
                                                {(Number(item.overall_score) || 0).toFixed(1)}
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
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                onClick={() => onCalculateItem(item.user_id)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                disabled={isCalculating}
                                            >
                                                <Calculator className={`h-3.5 w-3.5 mr-1 ${isCalculating ? 'animate-spin' : ''}`} />
                                                Calculate
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <Users className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Müəllim tapılmadı</h3>
                    <p className="text-sm">Seçilmiş kriteriyalara uyğun müəllim reytinqi mövcud deyil.</p>
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

                            {/* Page numbers logic can be simplified or expanded as needed */}
                            <PaginationItem>
                                <PaginationLink isActive>{pagination.current_page}</PaginationLink>
                            </PaginationItem>

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
