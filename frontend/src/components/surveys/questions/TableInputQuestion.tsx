import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SurveyQuestion, TableInputColumn } from '@/services/surveys/types';

interface TableInputRow {
  [key: string]: string;
}

interface TableInputQuestionProps {
  question: SurveyQuestion;
  value: TableInputRow[] | null;
  onChange: (value: TableInputRow[]) => void;
  disabled?: boolean;
}

export function TableInputQuestion({
  question,
  value,
  onChange,
  disabled = false,
}: TableInputQuestionProps) {
  // Get columns from metadata or table_headers
  const config = question.metadata?.table_input;
  const maxRows = config?.max_rows ?? 20;

  let columns: TableInputColumn[] = config?.columns ?? [];

  // Fallback: if no columns in metadata, use table_headers as simple text columns
  if (columns.length === 0 && question.table_headers && question.table_headers.length > 0) {
    columns = question.table_headers.map((header, index) => ({
      key: `col_${index + 1}`,
      label: header,
      type: 'text' as const,
    }));
  }

  // Initialize with one empty row if no value
  const rows: TableInputRow[] = Array.isArray(value) && value.length > 0
    ? value
    : [createEmptyRow(columns)];

  function createEmptyRow(cols: TableInputColumn[]): TableInputRow {
    const row: TableInputRow = {};
    cols.forEach(col => {
      row[col.key] = '';
    });
    return row;
  }

  const handleCellChange = (rowIndex: number, columnKey: string, cellValue: string) => {
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      [columnKey]: cellValue,
    };
    onChange(newRows);
  };

  const addRow = () => {
    if (rows.length >= maxRows) return;
    const newRows = [...rows, createEmptyRow(columns)];
    onChange(newRows);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    onChange(newRows);
  };

  if (columns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cədvəl strukturu tamamlanmayıb. Zəhmət olmasa sorğu administratoru ilə əlaqə saxlayın.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full border border-border text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-2 py-2 text-center border-b border-border w-10">#</th>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-left border-b border-border">
                  {column.label}
                  {column.type !== 'text' && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({column.type === 'number' ? 'rəqəm' : 'tarix'})
                    </span>
                  )}
                </th>
              ))}
              {!disabled && (
                <th className="px-2 py-2 text-center border-b border-border w-10"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border">
                <td className="px-2 py-2 text-center text-muted-foreground">
                  {rowIndex + 1}
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-1 py-1">
                    <Input
                      type={column.type === 'date' ? 'date' : column.type === 'number' ? 'number' : 'text'}
                      inputMode={column.type === 'number' ? 'numeric' : undefined}
                      value={row[column.key] ?? ''}
                      onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                      disabled={disabled}
                      className="h-9 text-sm"
                      placeholder={column.label}
                    />
                  </td>
                ))}
                {!disabled && (
                  <td className="px-1 py-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(rowIndex)}
                      disabled={rows.length <= 1}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!disabled && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={rows.length >= maxRows}
          >
            <Plus className="h-4 w-4 mr-1" />
            Sətir əlavə et
          </Button>
          <span className="text-xs text-muted-foreground">
            {rows.length} / {maxRows} sətir
          </span>
        </div>
      )}
    </div>
  );
}
