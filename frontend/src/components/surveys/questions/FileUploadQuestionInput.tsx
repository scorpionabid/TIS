import { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { SurveyQuestion } from '@/services/surveys';

interface FileUploadQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: { name: string; size: number; type: string } | null) => void;
  disabled?: boolean;
}

export function FileUploadQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: FileUploadQuestionInputProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      onChange(null);
      return;
    }

    onChange({
      name: file.name,
      size: file.size,
      type: file.type,
    });
  };

  const accepted = question.allowed_file_types?.join(',') ?? '.pdf,.doc,.docx,.xls,.xlsx';

  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept={accepted}
        onChange={handleFileChange}
        disabled={disabled}
      />
      {value && (
        <p className="text-sm text-muted-foreground">
          Seçilmiş fayl: {value.name}
        </p>
      )}
    </div>
  );
}
