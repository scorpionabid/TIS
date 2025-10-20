import { SurveyQuestion } from '@/services/surveys';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface RatingQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RatingQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: RatingQuestionInputProps) {
  const min = question.rating_min ?? 1;
  const max = question.rating_max ?? 5;
  const labelMin = question.rating_min_label ?? 'Pis';
  const labelMax = question.rating_max_label ?? 'Əla';

  const ratings = Array.from({ length: max - min + 1 }, (_, index) => index + min);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{labelMin}</span>
        <span>{labelMax}</span>
      </div>
      <RadioGroup
        value={value != null ? value.toString() : ''}
        onValueChange={(raw) => onChange(Number(raw))}
        className="flex flex-wrap gap-3"
        disabled={disabled}
      >
        {ratings.map((rating) => (
          <div key={rating} className="flex flex-col items-center space-y-1">
            <RadioGroupItem
              value={rating.toString()}
              id={`${question.id}-${rating}`}
            />
            <Label htmlFor={`${question.id}-${rating}`} className="text-xs">
              {rating}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
