/**
 * DropdownCell Component
 *
 * Inline editable dropdown/select cell for Excel table
 */

import { useState, useRef, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DropdownOption {
  label: string;
  value: string;
  color?: string;
}

interface DropdownCellProps {
  value: string | undefined;
  options: DropdownOption[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  showBadge?: boolean;
  className?: string;
}

export function DropdownCell({
  value,
  options,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder = 'Seçin...',
  showBadge = true,
  className,
}: DropdownCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (isEditing) {
      setIsOpen(true);
    }
  }, [isEditing]);

  const handleValueChange = (newValue: string) => {
    onSave(newValue);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && isEditing) {
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <Select value={value} onValueChange={handleValueChange} open={isOpen} onOpenChange={handleOpenChange}>
        <SelectTrigger className={cn('h-8 text-sm', className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      onClick={onEdit}
      className={cn(
        'px-3 py-2 cursor-pointer hover:bg-muted/50 rounded transition-colors min-h-[32px] flex items-center',
        className
      )}
    >
      {selectedOption ? (
        showBadge ? (
          <Badge variant="outline" className={cn('text-xs', selectedOption.color)}>
            {selectedOption.label}
          </Badge>
        ) : (
          <span>{selectedOption.label}</span>
        )
      ) : (
        <span className="text-muted-foreground italic">{placeholder}</span>
      )}
    </div>
  );
}
