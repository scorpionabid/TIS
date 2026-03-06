/**
 * MultiSelectCell Component
 *
 * Inline editable multi-select cell for assignees
 * Shows max 2 users in display mode, with popover for overflow
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
  maxVisible?: number;
}

// Helper to format user name for display
function formatDisplayName(name: string): string {
  if (!name) return '';
  if (name.includes('@')) {
    const username = name.split('@')[0];
    return username
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return name;
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
  maxVisible = 2,
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
                    {formatDisplayName(user.name)}
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
                    <span className="text-sm font-medium">{formatDisplayName(user.name)}</span>
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

  // Display mode: show limited users with overflow popover
  const visibleUsers = selectedUsers.slice(0, maxVisible);
  const hiddenUsers = selectedUsers.slice(maxVisible);
  const hasOverflow = hiddenUsers.length > 0;

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
        <div className="flex items-center gap-1 overflow-hidden">
          {visibleUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="text-xs truncate max-w-[120px] shrink-0">
              {formatDisplayName(user.name)}
            </Badge>
          ))}
          {hasOverflow && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-5 min-w-[28px] px-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  title={`və ${hiddenUsers.length} nəfər daha`}
                >
                  +{hiddenUsers.length}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="start" onClick={(e) => e.stopPropagation()}>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Bütün məsul şəxslər ({selectedUsers.length})
                </div>
                <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
                  {selectedUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/50">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <span className="text-sm truncate">{formatDisplayName(user.name)}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  if (!name) return '??';
  if (name.includes('@')) {
    const parts = name.split('@')[0].split(/[._-]/).filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
