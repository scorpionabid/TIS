/**
 * TextCell Component
 *
 * Inline editable text input cell for Excel table
 */

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TextCellProps {
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function TextCell({
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder = 'Daxil edin...',
  maxLength = 255,
  className,
}: TextCellProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit value when value prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
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
      setEditValue(value);
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn('h-8 text-sm', className)}
      />
    );
  }

  return (
    <div
      onClick={onEdit}
      className={cn(
        'px-3 py-2 cursor-pointer hover:bg-muted/50 rounded transition-colors min-h-[32px] flex items-center',
        !value && 'text-muted-foreground italic',
        className
      )}
      title={value || placeholder}
    >
      {value || placeholder}
    </div>
  );
}
