import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Table2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Props ────────────────────────────────────────────────────

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionMs: number;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatCellValue(value: unknown): { display: string; isNull: boolean } {
  if (value === null || value === undefined) {
    return { display: '—', isNull: true };
  }
  if (typeof value === 'object') {
    return { display: JSON.stringify(value), isNull: false };
  }
  return { display: String(value), isNull: false };
}

// ─── Component ────────────────────────────────────────────────

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  rowCount,
  executionMs,
}) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(rowCount / PAGE_SIZE);
  const startIndex = page * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, rowCount);
  const pageData = data.slice(startIndex, endIndex);

  if (rowCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Table2 className="h-10 w-10 opacity-40" />
        <p className="text-sm">Nəticə tapılmadı</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        {/* Stats bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-mono text-xs">
            {rowCount.toLocaleString()} sətir
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {executionMs} ms
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {columns.length} sütun
          </Badge>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, rowIdx) => (
                <tr
                  key={startIndex + rowIdx}
                  className={
                    rowIdx % 2 === 0
                      ? 'bg-background'
                      : 'bg-muted/20'
                  }
                >
                  {columns.map((col) => {
                    const { display, isNull } = formatCellValue(row[col]);
                    return (
                      <td key={col} className="px-3 py-2 align-top">
                        {isNull ? (
                          <span className="italic text-muted-foreground/60 text-xs">
                            —
                          </span>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block max-w-xs truncate cursor-default">
                                {display}
                              </span>
                            </TooltipTrigger>
                            {display.length > 40 && (
                              <TooltipContent side="top" className="max-w-sm break-words">
                                {display}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {(startIndex + 1).toLocaleString()}–{endIndex.toLocaleString()}{' '}
              / {rowCount.toLocaleString()} sətir
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Əvvəlki
              </Button>
              <span className="px-2">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonrakı
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
