import { SurveyQuestion } from '@/services/surveys';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface SingleChoiceQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SingleChoiceQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: SingleChoiceQuestionInputProps) {
  const options = question.options ?? [];

  return (
    <RadioGroup
      value={value ?? ''}
      onValueChange={onChange}
      className="space-y-2"
      disabled={disabled}
    >
      {options.map((option, index) => (
        <div key={index} className="flex items-center space-x-2">
          <RadioGroupItem value={option} id={`${question.id}-${index}`} />
          <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
