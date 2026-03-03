/**
 * ColumnPreview Component
 * Live preview of how the table will look to users
 */

import React from 'react';
import type { ReportTableColumn } from '@/types/reportTable';
import {
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Calculator,
  FileUp,
  PenTool,
  MapPin,
} from 'lucide-react';

interface ColumnPreviewProps {
  columns: ReportTableColumn[];
  maxRows: number;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  select: <List className="h-3.5 w-3.5" />,
  boolean: <CheckSquare className="h-3.5 w-3.5" />,
  calculated: <Calculator className="h-3.5 w-3.5" />,
  file: <FileUp className="h-3.5 w-3.5" />,
  signature: <PenTool className="h-3.5 w-3.5" />,
  gps: <MapPin className="h-3.5 w-3.5" />,
};

export function ColumnPreview({ columns, maxRows }: ColumnPreviewProps) {
  // Generate sample data for preview
  const sampleData = React.useMemo(() => {
    const rows = Math.min(3, maxRows);
    return Array.from({ length: rows }, (_, rowIdx) => {
      const row: Record<string, string> = {};
      columns.forEach((col) => {
        switch (col.type) {
          case 'text':
            row[col.key] = `Mətn ${rowIdx + 1}`;
            break;
          case 'number':
            row[col.key] = String(rowIdx * 10 + 5);
            break;
          case 'date':
            row[col.key] = '2024-01-15';
            break;
          case 'select':
            row[col.key] = col.options?.[0] || 'Variant 1';
            break;
          case 'boolean':
            row[col.key] = rowIdx % 2 === 0 ? 'Bəli' : 'Xeyr';
            break;
          case 'calculated':
            row[col.key] = '=SUM(A1:A3)';
            break;
          case 'file':
            row[col.key] = '📎 Fayl';
            break;
          case 'signature':
            row[col.key] = '✍️ İmza';
            break;
          case 'gps':
            row[col.key] = '📍 40.40, 49.86';
            break;
          default:
            row[col.key] = '-';
        }
      });
      return row;
    });
  }, [columns, maxRows]);

  if (columns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <p>Sütun əlavə edildikdə preview görünəcək</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="px-2 py-1.5 text-left text-gray-500 font-medium w-8">#</th>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className="px-2 py-1.5 text-left font-medium text-gray-700 min-w-[100px]"
              >
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">{TYPE_ICONS[col.type]}</span>
                  <span className="truncate">{col.label || col.key}</span>
                  {col.required && <span className="text-red-500">*</span>}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleData.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-gray-50">
              <td className="px-2 py-1.5 text-gray-400">{rowIdx + 1}</td>
              {columns.map((col, colIdx) => (
                <td key={col.key || colIdx} className="px-2 py-1.5 text-gray-600">
                  <div className="truncate max-w-[120px]">{row[col.key]}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows > 3 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          ... və daha {maxRows - 3} sətir
        </p>
      )}
    </div>
  );
}
