import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceNumberInputProps {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  onChange: (nextValue: number) => void;
  size?: "default" | "compact";
  className?: string;
}

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const AttendanceNumberInput: React.FC<AttendanceNumberInputProps> = ({
  value,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  disabled,
  id,
  onChange,
  "aria-label": ariaLabel,
  size = "default",
  className,
}) => {
  const handleStep = (delta: number) => {
    if (disabled) return;
    const next = clampValue((value ?? 0) + delta, min, max);
    onChange(next);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(event.target.value, 10);
    if (Number.isNaN(parsed)) {
      onChange(min);
      return;
    }
    onChange(clampValue(parsed, min, max));
  };

  const containerClass = size === "compact" ? "h-9" : "h-10";
  const buttonClass =
    size === "compact"
      ? "h-9 w-9 rounded-none"
      : "h-10 w-10 rounded-none";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border border-input bg-background",
        containerClass,
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={() => handleStep(-1)}
        disabled={disabled || value <= min}
        aria-label="1 azalt"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        id={id}
        aria-label={ariaLabel}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        min={min}
        max={max}
        className="flex-1 h-full border-0 text-center focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={() => handleStep(1)}
        disabled={disabled || value >= max}
        aria-label="1 artır"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default AttendanceNumberInput;
