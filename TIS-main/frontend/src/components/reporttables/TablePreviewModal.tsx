import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ReportTable, ReportTableColumn } from '@/types/reportTable';

interface TablePreviewModalProps {
  table: ReportTable | null;
  open: boolean;
  onClose: () => void;
}

export function TablePreviewModal({ table, open, onClose }: TablePreviewModalProps) {
  if (!table) return null;

  const columns = table.columns || [];
  const maxRows = table.max_rows || 50;
  const previewRows = 3;
  const remainingRows = maxRows - previewRows;

  // Generate sample data for preview
  const sampleData = Array.from({ length: previewRows }, (_, i) => {
    const row: Record<string, string> = { '#': String(i + 1) };
    columns.forEach((col: ReportTableColumn) => {
      row[col.key] = `Mətn ${i + 1}`;
    });
    return row;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{table.title}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left text-gray-500 font-medium w-10">#</th>
                {columns.map((col: ReportTableColumn) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left text-gray-500 font-medium"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="px-3 py-2 text-gray-400">{row['#']}</td>
                  {columns.map((col: ReportTableColumn) => (
                    <td key={col.key} className="px-3 py-2 text-gray-700">
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {remainingRows > 0 && (
            <div className="px-3 py-2 text-center text-sm text-gray-400 bg-gray-50 border-t">
              ... və daha {remainingRows} sətir
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-500">
          <p>Maksimum {maxRows} sətir · {columns.length} sütun</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
