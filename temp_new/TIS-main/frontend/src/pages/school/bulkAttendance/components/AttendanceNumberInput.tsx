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
  "data-testid"?: string;
  "aria-label"?: string;
  onChange: (nextValue: number) => void;
  size?: "default" | "compact";
  className?: string;
}

const clampValue = (value: number, min: number, max: number) => {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(value, safeMin), safeMax);
};

const AttendanceNumberInput: React.FC<AttendanceNumberInputProps> = ({
  value: rawValue,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  disabled,
  id,
  "data-testid": dataTestId,
  onChange,
  "aria-label": ariaLabel,
  size = "default",
  className,
}) => {
  // Ensure value is a valid number
  const value = typeof rawValue === "number" && !isNaN(rawValue) ? rawValue : 0;

  // Safe wrapper to ensure we never pass NaN to parent
  const safeOnChange = (val: number) => {
    const safeVal =
      Number.isFinite(val) && !Number.isNaN(val) ? Math.floor(val) : 0;
    onChange(safeVal);
  };

  const handleStep = (delta: number) => {
    if (disabled) return;
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER;
    // Ensure value is a clean integer before adding delta
    const currentValue = Math.floor(Number(value) || 0);
    const nextValue = currentValue + delta;
    if (!Number.isFinite(nextValue)) {
      safeOnChange(safeMin);
      return;
    }
    const next = clampValue(nextValue, safeMin, safeMax);
    safeOnChange(Number.isFinite(next) ? Math.floor(next) : safeMin);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER;

    // Handle empty string
    if (inputValue === "" || inputValue === "-") {
      safeOnChange(safeMin);
      return;
    }

    // Remove leading zeros and parse
    const cleanedValue = inputValue
      .replace(/^0+(?=[1-9])/, "")
      .replace(/^0+$/, "0");

    const parsed = parseInt(cleanedValue, 10);

    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      safeOnChange(safeMin);
      return;
    }

    const clamped = clampValue(parsed, safeMin, safeMax);
    safeOnChange(Number.isFinite(clamped) ? clamped : safeMin);
  };

  const containerClass = "h-10";
  const buttonClass =
    size === "compact" ? "h-10 w-9 rounded-none" : "h-10 w-10 rounded-none";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border border-input bg-background",
        containerClass,
        className,
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
        data-testid={dataTestId}
        aria-label={ariaLabel}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(value)}
        onChange={handleInputChange}
        disabled={disabled}
        min={Number.isFinite(min) ? min : 0}
        max={Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER}
        className={cn(
          "flex-1 h-full border-0 text-center focus-visible:ring-0",
          size === "compact" && "py-1 text-sm",
        )}
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
