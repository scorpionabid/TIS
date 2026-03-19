import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowUpDown, School as SchoolIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { TablePagination } from '@/components/common/TablePagination';

interface AttendanceTableProps {
  data: any[];
  loading: boolean;
  isSchoolAdmin: boolean;
  reportType: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: any) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    startIndex: number;
    endIndex: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (val: number) => void;
  };
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  data,
  loading,
  isSchoolAdmin,
  reportType,
  sortField,
  sortDirection,
  onSort,
  pagination
}) => {
  const formatClassLabel = (value?: string | null, level?: number | string | null): string => {
    const base = level !== undefined && level !== null && value ? `${level}-${value}` : value ?? '';
    const trimmed = base.trim();
    if (!trimmed) return '-';
    const match = trimmed.match(/^(\d+)\s*[-\s]?([A-Za-zƏəÖöÜüÇçĞğİıŞş]+)$/);
    return match ? `${match[1]}-${match[2].toLowerCase()}` : trimmed;
  };

  const formatPercent = (value?: number | null) => (value === undefined || value === null) ? '0%' : `${Number(value).toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px]">
                <Button variant="ghost" onClick={() => onSort('date')} className="px-0 hover:bg-transparent font-bold flex items-center gap-1">
                  Tarix <ArrowUpDown className={`h-4 w-4 ${sortField === 'date' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </Button>
              </TableHead>
              {!isSchoolAdmin && <TableHead>Məktəb</TableHead>}
              <TableHead>
                <Button variant="ghost" onClick={() => onSort('class_name')} className="px-0 hover:bg-transparent font-bold flex items-center gap-1">
                  Sinif <ArrowUpDown className={`h-4 w-4 ${sortField === 'class_name' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </Button>
              </TableHead>
              <TableHead className="text-center">Səhər</TableHead>
              <TableHead className="text-center">Günorta</TableHead>
              <TableHead className="text-center w-[180px]">
                <Button variant="ghost" onClick={() => onSort('attendance_rate')} className="px-0 hover:bg-transparent font-bold flex items-center gap-1 mx-auto">
                  Davamiyyət % <ArrowUpDown className={`h-4 w-4 ${sortField === 'attendance_rate' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </Button>
              </TableHead>
              <TableHead className="text-center w-[160px]">Forma</TableHead>
              <TableHead>Qeydlər</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={isSchoolAdmin ? 7 : 8}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSchoolAdmin ? 7 : 8} className="text-center py-8 text-muted-foreground">Məlumat tapılmadı</TableCell>
              </TableRow>
            ) : (
              data.map((record, index) => {
                const formattedDate = record.date_label && reportType !== 'daily' ? record.date_label : format(new Date(record.date), 'dd.MM.yyyy', { locale: az });
                const rate = record.attendance_rate ?? 0;
                const tone = rate >= 95 ? 'text-green-600' : rate >= 85 ? 'text-yellow-600' : 'text-red-600';
                
                return (
                  <TableRow key={record.id || index} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{formattedDate}</TableCell>
                    {!isSchoolAdmin && (
                      <TableCell className="text-blue-600">
                        <div className="flex items-center gap-2"><SchoolIcon className="h-3 w-3" /> {record.school?.name || record.school_name}</div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className="font-bold">{formatClassLabel(record.class_name, record.grade_level)}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold">{record.start_count || 0}</TableCell>
                    <TableCell className="text-center font-bold">{record.end_count || 0}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 w-full max-w-[120px] mx-auto">
                        <span className={`text-xs font-bold ${tone}`}>{rate}%</span>
                        <Progress value={rate} className="h-1" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-bold">
                      {formatPercent(record.uniform_compliance_rate)} ({record.uniform_violation || 0})
                    </TableCell>
                    <TableCell className="max-w-[150px] text-[10px] text-muted-foreground line-clamp-1 italic">
                      {record.notes || '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {reportType === 'daily' && data.length > 0 && (
        <TablePagination {...pagination} onPageChange={pagination.onPageChange} onItemsPerPageChange={pagination.onItemsPerPageChange} />
      )}
    </div>
  );
};
