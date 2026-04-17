import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { ReportTable, ReportTableColumn, ColumnType } from '@/types/reportTable';

interface TablePreviewModalProps {
  table: ReportTable | null;
  open: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Mətn',
  number: 'Rəqəm',
  date: 'Tarix',
  select: 'Seçim',
  boolean: 'Bəli/Xeyr',
  calculated: 'Hesablanan',
  file: 'Fayl',
  signature: 'İmza',
  gps: 'GPS',
};

export function TablePreviewModal({ table, open, onClose }: TablePreviewModalProps) {
  if (!table) return null;

  const columns = table.columns || [];
  const isDraft = table.status === 'draft';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{table.title}</DialogTitle>
        </DialogHeader>

        {isDraft ? (
          // Draft: mövcud nümunə görünüşü
          <div className="mt-4 border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium w-10">#</th>
                  {columns.map((col: ReportTableColumn) => (
                    <th key={col.key} className="px-3 py-2 text-left text-gray-500 font-medium">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }, (_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    {columns.map((col: ReportTableColumn) => (
                      <td key={col.key} className="px-3 py-2 text-gray-700">Mətn {i + 1}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {table.max_rows > 3 && (
              <div className="px-3 py-2 text-center text-sm text-gray-400 bg-gray-50 border-t">
                ... və daha {table.max_rows - 3} sətir
              </div>
            )}
          </div>
        ) : (
          // Published / Archived: sütun quruluşu cədvəli
          <div className="mt-4 border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium w-8">#</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Sütun adı</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Tipi</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Açıqlama</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col: ReportTableColumn, idx: number) => (
                  <tr key={col.key} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {col.label}
                      {col.options && col.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {col.options.map((opt) => (
                            <span key={opt} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        {TYPE_LABELS[col.type] ?? col.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {col.required ? (
                        <span className="text-xs text-red-600 font-medium">Məcburi</span>
                      ) : (
                        <span className="text-xs text-gray-400">İxtiyari</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{col.hint ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          Maksimum {table.max_rows} sətir · {columns.length} sütun
        </div>
      </DialogContent>
    </Dialog>
  );
}
