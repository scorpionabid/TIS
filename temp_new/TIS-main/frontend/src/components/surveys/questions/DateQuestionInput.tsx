import { Input } from '@/components/ui/input';
import { SurveyQuestion } from '@/services/surveys';

interface DateQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function DateQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: DateQuestionInputProps) {
  return (
    <Input
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      min={question.metadata?.min}
      max={question.metadata?.max}
      disabled={disabled}
    />
  );
}
