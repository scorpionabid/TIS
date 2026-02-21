import { SurveyQuestion } from "@/services/surveys";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface MultipleChoiceQuestionInputProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

type OptionValue = string | { id: number | string; label: string };

export function MultipleChoiceQuestionInput({
  question,
  value,
  onChange,
  disabled = false,
}: MultipleChoiceQuestionInputProps) {
  const options = (question.options ?? []) as OptionValue[];
  const selectedOptions: string[] = Array.isArray(value) ? value : [];

  const toggleOption = (
    option: OptionValue,
    checked: boolean | "indeterminate",
  ) => {
    const normalized = checked === true;
    const optionValue =
      typeof option === "string"
        ? option
        : option.id?.toString() || option.label;

    if (normalized) {
      if (!selectedOptions.includes(optionValue)) {
        onChange([...selectedOptions, optionValue]);
      }
    } else {
      onChange(selectedOptions.filter((item) => item !== optionValue));
    }
  };

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Checkbox
            id={`${question.id}-${index}`}
            checked={selectedOptions.includes(
              typeof option === "string"
                ? option
                : option.id?.toString() || option.label,
            )}
            onCheckedChange={(state) => toggleOption(option, state)}
            disabled={disabled}
          />
          <Label htmlFor={`${question.id}-${index}`}>
            {typeof option === "string" ? option : option.label}
          </Label>
        </div>
      ))}
    </div>
  );
}
