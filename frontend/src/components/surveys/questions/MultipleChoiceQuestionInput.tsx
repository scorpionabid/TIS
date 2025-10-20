import { SurveyQuestion } from '@/services/surveys';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface MultipleChoiceQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function MultipleChoiceQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: MultipleChoiceQuestionInputProps) {
  const options = question.options ?? [];
  const selectedOptions: string[] = Array.isArray(value) ? value : [];

  const toggleOption = (option: string, checked: boolean | 'indeterminate') => {
    const normalized = checked === true;

    if (normalized) {
      if (!selectedOptions.includes(option)) {
        onChange([...selectedOptions, option]);
      }
    } else {
      onChange(selectedOptions.filter((item) => item !== option));
    }
  };

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Checkbox
            id={`${question.id}-${index}`}
            checked={selectedOptions.includes(option)}
            onCheckedChange={(state) => toggleOption(option, state)}
            disabled={disabled}
          />
          <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
        </div>
      ))}
    </div>
  );
}
