import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  LayoutGrid,
  List,
  X,
  ArrowUpDown,
} from 'lucide-react';
import type {
  ViewMode,
  LinkDatabaseFiltersState,
} from '../types/linkDatabase.types';
import {
  LINK_TYPE_OPTIONS,
  STATUS_OPTIONS,
  SORT_OPTIONS,
} from '../constants/linkDatabase.constants';

interface LinkDatabaseFilterBarProps {
  filters: LinkDatabaseFiltersState;
  viewMode: ViewMode;
  onFilterChange: <K extends keyof LinkDatabaseFiltersState>(
    key: K,
    value: LinkDatabaseFiltersState[K]
  ) => void;
  onResetFilters: () => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function LinkDatabaseFilterBar({
  filters,
  viewMode,
  onFilterChange,
  onResetFilters,
  onViewModeChange,
}: LinkDatabaseFilterBarProps) {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.linkType !== 'all' ||
    filters.status !== 'all' ||
    filters.isFeatured !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Search + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Linklərdə axtar..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="rounded-r-none px-2.5"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="rounded-l-none px-2.5"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Row 2: Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Link Type */}
        <Select
          value={filters.linkType}
          onValueChange={(v) => onFilterChange('linkType', v as any)}
        >
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Link növü" />
          </SelectTrigger>
          <SelectContent>
            {LINK_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(v) => onFilterChange('status', v as any)}
        >
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) => onFilterChange('sortBy', v as any)}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Direction */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-2.5 text-sm"
          onClick={() =>
            onFilterChange(
              'sortDirection',
              filters.sortDirection === 'asc' ? 'desc' : 'asc'
            )
          }
        >
          {filters.sortDirection === 'asc' ? 'A→Z' : 'Z→A'}
        </Button>

        {/* Featured Toggle */}
        <Button
          variant={filters.isFeatured ? 'default' : 'outline'}
          size="sm"
          className="h-9 text-sm"
          onClick={() =>
            onFilterChange('isFeatured', filters.isFeatured ? null : true)
          }
        >
          Seçilmişlər
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-sm text-muted-foreground"
            onClick={onResetFilters}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Təmizlə
          </Button>
        )}
      </div>
    </div>
  );
}
