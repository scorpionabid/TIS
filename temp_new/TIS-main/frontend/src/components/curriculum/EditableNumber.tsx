import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface EditableNumberProps {
  value: number | null | undefined;
  placeholder?: string;
  onChange: (val: number | null) => void;
  className?: string;
  step?: number;
  min?: number;
  disabled?: boolean;
}

/**
 * Rəqəm daxil etmə inputu — ondalıq nöqtə/vergül dəstəyi, ▲▼ stepper düymələri.
 * type="text" + inputMode="decimal" — browser number input inconsistencies-dən qaçır.
 * isFocused ref — xarici value dəyişikliyi yazarkən inputu sıfırlamır.
 */
export const EditableNumber: React.FC<EditableNumberProps> = ({
  value,
  placeholder,
  onChange,
  className = 'inp-num',
  step = 0.5,
  min = 0,
  disabled = false,
}) => {
  const [localVal, setLocalVal] = useState<string>(
    value != null ? value.toString() : ''
  );
  const isFocused = useRef(false);

  React.useEffect(() => {
    if (!isFocused.current) {
      setLocalVal(value != null ? value.toString() : '');
    }
  }, [value]);

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = () => {
    isFocused.current = false;
    const normalized = localVal.replace(',', '.').trim();
    if (normalized === '' || normalized === '.') {
      onChange(null);
      setLocalVal('');
      return;
    }
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
      onChange(num);
      setLocalVal(num.toString());
    } else {
      setLocalVal(value != null ? value.toString() : '');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v !== '' && !/^-?[\d]*[.,]?[\d]*$/.test(v)) return;
    setLocalVal(v);
  };

  const currentNum = (): number => {
    const normalized = localVal.replace(',', '.').trim();
    const num = parseFloat(normalized);
    return isNaN(num) ? (value ?? 0) : num;
  };

  const handleStep = (dir: 1 | -1) => {
    if (disabled) return;
    const next = Math.max(min, parseFloat((currentNum() + dir * step).toFixed(10)));
    const str = Number.isInteger(next) ? next.toString() : next.toString();
    setLocalVal(str);
    onChange(next);
  };

  return (
    <div className={cn("relative inline-flex group", disabled && "opacity-60 cursor-not-allowed")} style={{ width: 54 }}>
      <input
        className={cn(className, disabled && "bg-slate-50 border-slate-200 pointer-events-none")}
        style={{ width: '100%', paddingRight: 16 }}
        type="text"
        inputMode="decimal"
        value={localVal}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        disabled={disabled}
      />
      {!disabled && (
        <div className="absolute right-0 top-0 bottom-0 flex flex-col opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10" style={{ width: 14 }}>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); handleStep(1); }}
            className="flex-1 flex items-center justify-center bg-blue-100 hover:bg-blue-200 border-l border-b border-blue-300 text-blue-600 transition-colors rounded-tr-[3px]"
            style={{ fontSize: 7, lineHeight: 1 }}
          >▲</button>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); handleStep(-1); }}
            className="flex-1 flex items-center justify-center bg-blue-100 hover:bg-blue-200 border-l border-blue-300 text-blue-600 transition-colors rounded-br-[3px]"
            style={{ fontSize: 7, lineHeight: 1 }}
          >▼</button>
        </div>
      )}
    </div>
  );
};
