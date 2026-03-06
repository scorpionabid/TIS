import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { SurveyQuestion } from '@/services/surveys';

interface TextQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: TextQuestionInputProps) {
  const displayMode = question.metadata?.display_mode ?? 'textarea';
  const placeholder = question.metadata?.placeholder ?? 'Cavabınızı yazın...';

  if (displayMode === 'single-line') {
    return (
      <Input
        data-testid={`question-text-${question.id}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder as string}
        disabled={disabled}
      />
    );
  }

  return (
    <Textarea
      data-testid={`question-text-${question.id}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder as string}
      rows={(question.metadata?.rows as number) ?? 3}
      disabled={disabled}
    />
  );
}
