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
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  }

  return (
    <Textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={question.metadata?.rows ?? 3}
      disabled={disabled}
    />
  );
}
