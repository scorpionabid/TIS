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
  role_display?: string;
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
            className={cn('h-auto min-h-[32px] w-full justify-between text-sm bg-white/50 border-slate-200 hover:bg-white transition-all', className)}
            disabled={isLoading}
          >
            <div className="flex flex-wrap gap-1.5 flex-1 py-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground text-xs">{placeholder}</span>
              ) : (
                selectedUsers.map((user) => (
                  <Badge 
                    key={user.id} 
                    variant="secondary" 
                    className="text-[10px] h-auto py-1.5 px-2 bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-2 group"
                  >
                    <div className="flex flex-col items-start text-left leading-[1.2]">
                      <span className="font-semibold">{formatDisplayName(user.name)}</span>
                      {user.role_display && (
                        <span className="text-[9px] opacity-70 font-normal">
                          {user.role_display}
                        </span>
                      )}
                    </div>
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleRemove(user.id, e)}
                    />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 shadow-xl border-slate-200" align="start">
          <Command className="rounded-lg">
            <CommandInput placeholder="İstifadəçi axtar..." className="h-9 text-sm" />
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">İstifadəçi tapılmadı</CommandEmpty>
            <CommandGroup className="max-h-[250px] overflow-y-auto p-1">
              {options.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => handleToggle(user.id)}
                  className="rounded-md cursor-pointer py-2"
                >
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary/20 mr-2 transition-colors",
                    selected.includes(user.id) ? "bg-primary text-primary-foreground border-primary" : "bg-transparent"
                  )}>
                    {selected.includes(user.id) && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-800">{formatDisplayName(user.name)}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(user.role_display || user.role) && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0 rounded font-medium">
                          {user.role_display || user.role}
                        </span>
                      )}
                      {user.email && (
                        <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                      )}
                    </div>
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
        'px-2 py-1.5 cursor-pointer hover:bg-indigo-50/50 rounded-md transition-all min-h-[36px] flex items-center group/cell',
        selectedUsers.length === 0 && 'text-muted-foreground italic text-xs',
        className
      )}
    >
      {selectedUsers.length === 0 ? (
        placeholder
      ) : (
        <div className="flex items-center gap-2 overflow-hidden w-full">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {visibleUsers.map((user) => (
              <div key={user.id} className="flex flex-col leading-[1.1] min-w-0 group/user">
                <span className="text-[11px] font-bold text-slate-700 truncate group-hover/cell:text-primary transition-colors">
                  {formatDisplayName(user.name)}
                </span>
                {user.role_display ? (
                  <span className="text-[9px] text-muted-foreground/80 font-medium truncate italic">
                    {user.role_display}
                  </span>
                ) : (
                  <span className="text-[9px] text-red-400/60 font-medium truncate italic">
                    Vəzifə təyin edilməyib
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {hasOverflow && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 hover:bg-primary hover:text-white transition-all shrink-0 shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                  title={`və ${hiddenUsers.length} nəfər daha`}
                >
                  +{hiddenUsers.length}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-2 shadow-xl border-slate-200" align="end" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-3 px-1">
                  Məsul şəxslər ({selectedUsers.length})
                </div>
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                  {selectedUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold shrink-0 border border-indigo-100">
                        {getInitials(user.name)}
                      </div>
                      <div className="flex flex-col leading-tight overflow-hidden">
                        <span className="text-xs font-bold text-slate-800 truncate">{formatDisplayName(user.name)}</span>
                        {user.role_display && (
                          <span className="text-[10px] text-muted-foreground truncate italic">{user.role_display}</span>
                        )}
                      </div>
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
