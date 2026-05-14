import { SurveyQuestion } from "@/services/surveys";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface SingleChoiceQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: string) => void;
  disabled?: boolean;
}

type OptionValue = string | { id: number | string; label: string };

export function SingleChoiceQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: SingleChoiceQuestionInputProps) {
  const options = (question.options ?? []) as OptionValue[];

  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={onChange}
      className="space-y-2"
      disabled={disabled}
    >
      {options.map((option, index) => (
        <div key={index} className="flex items-center space-x-2">
          <RadioGroupItem
            data-testid={`question-radio-${question.id}-${typeof option === "string" ? index : option.id || index}`}
            value={
              typeof option === "string"
                ? option
                : option.id?.toString() || option.label
            }
            id={`${question.id}-${index}`}
          />
          <Label htmlFor={`${question.id}-${index}`}>
            {typeof option === "string" ? option : option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
