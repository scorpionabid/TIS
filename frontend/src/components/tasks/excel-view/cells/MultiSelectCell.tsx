/**
 * MultiSelectCell Component
 *
 * Inline editable multi-select cell for assignees
 */

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface MultiSelectOption {
  id: number;
  name: string;
  email?: string;
}

interface MultiSelectCellProps {
  selectedIds: number[];
  options: MultiSelectOption[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: (ids: number[]) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export function MultiSelectCell({
  selectedIds,
  options,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder = 'Seçin...',
  className,
  isLoading = false,
}: MultiSelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(selectedIds);

  useEffect(() => {
    if (isEditing) {
      setIsOpen(true);
    }
  }, [isEditing]);

  useEffect(() => {
    setSelected(selectedIds);
  }, [selectedIds]);

  const selectedUsers = options.filter((opt) => selected.includes(opt.id));

  const handleToggle = (userId: number) => {
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRemove = (userId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => prev.filter((id) => id !== userId));
  };

  const handleSave = () => {
    if (JSON.stringify(selected.sort()) !== JSON.stringify([...selectedIds].sort())) {
      onSave(selected);
    } else {
      onCancel();
    }
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && isEditing) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn('h-auto min-h-[32px] justify-between text-sm', className)}
            disabled={isLoading}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="text-xs">
                    {user.name}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => handleRemove(user.id, e)}
                    />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="İstifadəçi axtar..." />
            <CommandEmpty>İstifadəçi tapılmadı</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-y-auto">
              {options.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => handleToggle(user.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selected.includes(user.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name}</span>
                    {user.email && (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div
      onClick={onEdit}
      className={cn(
        'px-3 py-2 cursor-pointer hover:bg-muted/50 rounded transition-colors min-h-[32px] flex items-center',
        selectedUsers.length === 0 && 'text-muted-foreground italic',
        className
      )}
    >
      {selectedUsers.length === 0 ? (
        placeholder
      ) : (
        <div className="flex flex-wrap gap-1">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="text-xs">
              {user.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
