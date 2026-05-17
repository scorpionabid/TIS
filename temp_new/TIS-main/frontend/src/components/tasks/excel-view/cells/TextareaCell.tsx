/**
 * TextareaCell Component
 *
 * Inline editable textarea cell for longer text content
 */

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';

interface TextareaCellProps {
  value: string | undefined;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
}

export function TextareaCell({
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder = 'Daxil edin...',
  maxLength = 1000,
  rows = 3,
  className,
}: TextareaCellProps) {
  const [editValue, setEditValue] = useState(value || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed !== (value || '').trim()) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter to save
    if (e.key === 'Enter' && e.ctrlKey) {
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
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          className={cn('text-sm resize-none', className)}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Ctrl+Enter: Yadda saxla • Esc: Ləğv et • {editValue.length}/{maxLength}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onEdit}
      className={cn(
        'px-3 py-2 cursor-pointer hover:bg-muted/50 rounded transition-colors min-h-[60px] relative group',
        !value && 'text-muted-foreground italic',
        className
      )}
    >
      <div
        className="text-sm line-clamp-2 overflow-hidden"
        title={value || placeholder}
      >
        {value || placeholder}
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}
