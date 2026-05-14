import React from 'react';
import { Layers, SortAsc } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GroupingMode } from '@/hooks/useResourceGrouping';

interface ResourceGroupingToolbarProps {
  groupingMode: GroupingMode;
  onGroupingModeChange: (mode: GroupingMode) => void;
  sortBy?: 'created_at' | 'title';
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (sortBy: 'created_at' | 'title', direction: 'asc' | 'desc') => void;
}

export function ResourceGroupingToolbar({
  groupingMode,
  onGroupingModeChange,
  sortBy = 'created_at',
  sortDirection = 'desc',
  onSortChange,
}: ResourceGroupingToolbarProps) {
  const groupingLabels: Record<GroupingMode, string> = {
    none: 'Qruplaşdırma yoxdur',
    sector: 'Sektor üzrə',
    title: 'Başlıq (Əlifba)',
    link_type: 'Link növü',
    date: 'Tarix üzrə',
  };

  const sortLabels: Record<string, string> = {
    created_at_desc: 'Yenidən köhnəyə',
    created_at_asc: 'Köhnədən yeniyə',
    title_asc: 'Başlıq (A-Z)',
    title_desc: 'Başlıq (Z-A)',
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
      {/* Grouping Mode */}
      <div className="flex-1">
        <Label htmlFor="grouping-mode" className="text-sm font-medium flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-primary" />
          Qruplaşdırma
        </Label>
        <Select
          value={groupingMode}
          onValueChange={(val) => onGroupingModeChange(val as GroupingMode)}
        >
          <SelectTrigger id="grouping-mode" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupingLabels).map(([mode, label]) => (
              <SelectItem key={mode} value={mode}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort (Optional - only if onSortChange provided) */}
      {onSortChange && (
        <div className="flex-1">
          <Label htmlFor="sort" className="text-sm font-medium flex items-center gap-2 mb-2">
            <SortAsc className="h-4 w-4 text-primary" />
            Sıralama
          </Label>
          <Select
            value={`${sortBy}_${sortDirection}`}
            onValueChange={(val) => {
              const [by, dir] = val.split('_') as ['created_at' | 'title', 'asc' | 'desc'];
              onSortChange(by, dir);
            }}
          >
            <SelectTrigger id="sort" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
