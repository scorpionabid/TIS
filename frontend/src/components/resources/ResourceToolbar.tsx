import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ResourceToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  isUpdating: boolean;
}

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Ən yeni' },
  { value: 'created_at-asc', label: 'Ən köhnə' },
  { value: 'title-asc', label: 'Ad (A-Z)' },
  { value: 'title-desc', label: 'Ad (Z-A)' },
];

export function ResourceToolbar({
  searchTerm,
  onSearchChange,
  sortValue,
  onSortChange,
  isUpdating,
}: ResourceToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Resurs axtarın..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {isUpdating && (
            <Badge
              variant="secondary"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]"
            >
              Yenilənir...
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem value={option.value} key={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
