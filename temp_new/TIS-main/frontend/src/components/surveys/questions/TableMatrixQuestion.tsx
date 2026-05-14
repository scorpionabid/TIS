import { SurveyQuestion } from '@/services/surveys';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface TableMatrixQuestionProps {
  question: SurveyQuestion;
  value: Record<string, string> | null;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

export function TableMatrixQuestion({
  question,
  value,
  onChange,
  disabled = false,
}: TableMatrixQuestionProps) {
  const headers = question.table_headers ?? [];
  const rows = question.table_rows ?? [];
  const responses = value ?? {};

  if (headers.length === 0 || rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cədvəl strukturu tamamlanmayıb. Zəhmət olmasa sorğu administratoru ilə əlaqə saxlayın.
      </p>
    );
  }

  const updateRow = (rowId: string, columnId: string) => {
    onChange({
      ...responses,
      [rowId]: columnId,
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-border text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-3 py-2 text-left border-b border-border">Sxema</th>
            {headers.map((header, index) => (
              <th key={index} className="px-3 py-2 text-center border-b border-border">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const groupValue = responses[row] ?? '';
            return (
              <tr key={rowIndex} className="border-b border-border">
                <td className="px-3 py-2 font-medium border-r border-border">
                  {row}
                </td>
                <RadioGroup
                  value={groupValue}
                  onValueChange={(column) => updateRow(row, column)}
                  disabled={disabled}
                  className="contents"
                >
                  {headers.map((header, headerIndex) => {
                    const radioId = `${question.id}-${rowIndex}-${headerIndex}`;
                    return (
                      <td key={headerIndex} className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center">
                          <RadioGroupItem
                            value={header}
                            id={radioId}
                          />
                          <Label htmlFor={radioId} className="sr-only">
                            {row} - {header}
                          </Label>
                        </div>
                      </td>
                    );
                  })}
                </RadioGroup>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
