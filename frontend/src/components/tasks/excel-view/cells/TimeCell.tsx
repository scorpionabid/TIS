/**
 * TimeCell Component
 *
 * Inline editable time input cell for Excel table (HH:MM format)
 */

import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimeCellProps {
  value: string | undefined;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}

export function TimeCell({
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder = 'HH:MM',
  className,
}: TimeCellProps) {
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const validateTime = (timeStr: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(timeStr);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();

    if (!trimmed) {
      // Allow clearing the time
      onSave('');
      return;
    }

    if (validateTime(trimmed)) {
      // Ensure HH:MM format (pad with zeros if needed)
      const [hours, minutes] = trimmed.split(':');
      const formatted = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      onSave(formatted);
    } else {
      // Invalid time, revert
      setEditValue(value || '');
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(value || '');
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="time"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('h-8 text-sm', className)}
      />
    );
  }

  return (
    <div
      onClick={onEdit}
      className={cn(
        'px-3 py-2 cursor-pointer hover:bg-muted/50 rounded transition-colors min-h-[32px] flex items-center gap-2',
        !value && 'text-muted-foreground italic',
        className
      )}
    >
      <Clock className="h-4 w-4" />
      {value || placeholder}
    </div>
  );
}
