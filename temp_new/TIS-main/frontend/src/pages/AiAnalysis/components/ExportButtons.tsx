import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, ImageDown, Loader2 } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  columns: string[];
  filename?: string;
  chartRef?: React.RefObject<HTMLDivElement | null>;
}

// ─── Component ────────────────────────────────────────────────

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  data,
  columns,
  filename,
  chartRef,
}) => {
  const [excelLoading, setExcelLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);

  // ─── Excel Export ──────────────────────────────────────────

  const exportToExcel = () => {
    if (data.length === 0) return;
    setExcelLoading(true);

    try {
      // Keep only declared columns and preserve their order
      const orderedRows = data.map((row) => {
        const ordered: Record<string, unknown> = {};
        for (const col of columns) {
          ordered[col] = row[col] ?? null;
        }
        return ordered;
      });

      const ws = XLSX.utils.json_to_sheet(orderedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'AI Analiz');

      // Set column widths
      ws['!cols'] = columns.map(() => ({ wch: 20 }));

      const base = filename ?? 'ai-analiz';
      XLSX.writeFile(wb, `${base}_${Date.now()}.xlsx`);
    } finally {
      setExcelLoading(false);
    }
  };

  // ─── PNG Export ────────────────────────────────────────────

  const exportToPng = async () => {
    setPngLoading(true);

    try {
      // html2canvas is not installed — fall back to window.print()
      // targeting only the chart element via print media query
      if (chartRef?.current) {
        const el = chartRef.current;
        const originalOverflow = document.body.style.overflow;

        // Create a temporary print-only overlay
        const printArea = document.createElement('div');
        printArea.id = '__atis_print_area__';
        printArea.style.cssText =
          'position:fixed;inset:0;z-index:99999;background:#fff;display:flex;align-items:center;justify-content:center;';
        const clone = el.cloneNode(true) as HTMLElement;
        clone.style.cssText = 'width:100%;max-width:900px;';
        printArea.appendChild(clone);
        document.body.appendChild(printArea);
        document.body.style.overflow = 'hidden';

        window.print();

        document.body.removeChild(printArea);
        document.body.style.overflow = originalOverflow;
      } else {
        window.print();
      }
    } finally {
      setPngLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs border-green-600/40 text-green-700 hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
        onClick={exportToExcel}
        disabled={excelLoading || data.length === 0}
      >
        {excelLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5" />
        )}
        {excelLoading ? 'İndirilir...' : 'Excel Export'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={exportToPng}
        disabled={pngLoading}
      >
        {pngLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageDown className="h-3.5 w-3.5" />
        )}
        {pngLoading ? 'İndirilir...' : 'PNG Export'}
      </Button>
    </div>
  );
};
