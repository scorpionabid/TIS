import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RegionStudent } from '@/services/students';
import type { SortColumn, SortDirection } from './types';

interface StudentTableProps {
  students: RegionStudent[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  isLoading: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (col: SortColumn) => void;
  onViewDetail: (s: RegionStudent) => void;
  onPageChange: (p: number) => void;
  onPerPageChange: (v: number) => void;
}

const COLUMNS: { key: SortColumn; label: string; sortable: boolean }[] = [
  { key: 'utis_code',   label: 'UTIS Kodu',     sortable: true  },
  { key: 'first_name',  label: 'Ad Soyad',       sortable: true  },
  { key: 'grade_level', label: 'Sinif',          sortable: true  },
  { key: 'class_name',  label: 'Sinif bölməsi',  sortable: true  },
  { key: 'first_name',  label: 'Məktəb',         sortable: false },
  { key: 'first_name',  label: 'Sektor',         sortable: false },
];

function SortIcon({ col, sortColumn, sortDirection }: { col: SortColumn; sortColumn: SortColumn; sortDirection: SortDirection }) {
  if (col !== sortColumn) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
  return sortDirection === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
    : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
}

export function StudentTable({
  students,
  totalItems,
  totalPages,
  currentPage,
  perPage,
  isLoading,
  isFetching,
  errorMessage,
  sortColumn,
  sortDirection,
  onSort,
  onViewDetail,
  onPageChange,
  onPerPageChange,
}: StudentTableProps) {
  if (errorMessage) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center text-sm text-destructive">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => onSort('utis_code')}
              >
                <span className="flex items-center">
                  UTIS Kodu
                  <SortIcon col="utis_code" sortColumn={sortColumn} sortDirection={sortDirection} />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => onSort('first_name')}
              >
                <span className="flex items-center">
                  Ad Soyad
                  <SortIcon col="first_name" sortColumn={sortColumn} sortDirection={sortDirection} />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => onSort('grade_level')}
              >
                <span className="flex items-center">
                  Sinif
                  <SortIcon col="grade_level" sortColumn={sortColumn} sortDirection={sortDirection} />
                </span>
              </TableHead>
              <TableHead>Məktəb</TableHead>
              <TableHead>Sektor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: perPage }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Şagird tapılmadı
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow
                  key={s.id}
                  className={isFetching ? 'opacity-60' : undefined}
                >
                  <TableCell className="font-mono text-sm">
                    {s.utis_code ?? (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>
                    {s.grade_level ? `${s.grade_level}${s.class_name ? s.class_name : ''}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {s.school?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.sector?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">
                      {s.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetail(s)}
                      title="Detalları gör"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Səhifə başına:</span>
          <Select value={String(perPage)} onValueChange={(v) => onPerPageChange(Number(v))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>
            Cəmi: <strong className="text-foreground">{totalItems.toLocaleString()}</strong> şagird
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
