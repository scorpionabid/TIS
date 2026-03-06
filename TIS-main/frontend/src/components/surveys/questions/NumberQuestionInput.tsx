import { Input } from '@/components/ui/input';
import { SurveyQuestion } from '@/services/surveys';

interface NumberQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export function NumberQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: NumberQuestionInputProps) {
  const handleChange = (raw: string) => {
    if (raw === '') {
      onChange(null);
      return;
    }

    const numericValue = Number(raw);
    if (Number.isNaN(numericValue)) {
      return;
    }

    onChange(numericValue);
  };

  return (
    <Input
      type="number"
      value={value ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={question.metadata?.placeholder ?? 'Rəqəm daxil edin...'}
      min={question.min_value ?? question.metadata?.min}
      max={question.max_value ?? question.metadata?.max}
      step={question.metadata?.step ?? 1}
      disabled={disabled}
    />
  );
}
