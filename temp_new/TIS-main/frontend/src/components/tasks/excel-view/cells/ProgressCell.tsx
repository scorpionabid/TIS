/**
 * ProgressCell Component
 *
 * Inline editable progress cell with visual bar and number input
 */

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressCellProps {
  value: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: number) => void;
  onCancel: () => void;
  className?: string;
}

export function ProgressCell({
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  className,
}: ProgressCellProps) {
  const [editValue, setEditValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value.toString());
  }, [value]);

  const handleSave = () => {
    const numValue = parseInt(editValue, 10);

    if (isNaN(numValue)) {
      // Invalid number, revert
      setEditValue(value.toString());
      onCancel();
      return;
    }

    // Clamp between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, numValue));

    if (clampedValue !== value) {
      onSave(clampedValue);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(value.toString());
      onCancel();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = Math.min(100, parseInt(editValue || '0', 10) + 5);
      setEditValue(newValue.toString());
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = Math.max(0, parseInt(editValue || '0', 10) - 5);
      setEditValue(newValue.toString());
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="number"
          min={0}
          max={100}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn('h-8 text-sm w-16', className)}
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    );
  }

  return (
    <div
      onClick={onEdit}
      className={cn(
        'px-3 py-2 cursor-pointer hover:bg-muted/50 rounded transition-colors min-h-[32px]',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Progress value={value} className="h-2 flex-1" />
        <span className="text-xs font-medium text-muted-foreground min-w-[35px]">
          {value}%
        </span>
      </div>
    </div>
  );
}
