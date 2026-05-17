import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationMeta {
  total: number;
  total_pages?: number;
}

interface TasksPaginationProps {
  pagination: PaginationMeta;
  page: number;
  perPage: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export function TasksPagination({
  pagination,
  page,
  perPage,
  isFetching,
  onPageChange,
  onPerPageChange,
}: TasksPaginationProps) {
  if (pagination.total === 0) return null;

  const totalPages = pagination.total_pages ?? Math.ceil(pagination.total / perPage);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Səhifədə:</span>
        <Select
          value={String(perPage)}
          onValueChange={(value) => onPerPageChange(Number(value))}
        >
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="hidden sm:inline">
          Ümumi {pagination.total} tapşırıqdan {((page - 1) * perPage) + 1}-{Math.min(page * perPage, pagination.total)} göstərilir
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isFetching}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Əvvəlki
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Səhifə {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isFetching}
        >
          Sonrakı
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
