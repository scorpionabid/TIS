import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  LayoutGrid,
  List,
  X,
  CheckCircle,
  Clock,
  Star,
  Globe,
  Video,
  FileText,
  LayoutList,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ViewMode, LinkDatabaseFiltersState } from '../types/linkDatabase.types';

interface LinkDatabaseFilterBarProps {
  title: string;
  filters: LinkDatabaseFiltersState;
  viewMode: ViewMode;
  canCreate?: boolean;
  selectedCount?: number;
  isBulkDeleting?: boolean;
  onFilterChange: <K extends keyof LinkDatabaseFiltersState>(key: K, value: LinkDatabaseFiltersState[K]) => void;
  onResetFilters: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateClick?: () => void;
  onBulkDelete?: () => void;
}

const STATUS_CHIPS = [
  { value: 'all',      label: 'Hamısı',      icon: null,         active: (s: string, f: boolean | null) => s === 'all' && !f },
  { value: 'active',   label: 'Aktiv',        icon: CheckCircle,  active: (s: string) => s === 'active' },
  { value: 'disabled', label: 'Deaktiv',      icon: Clock,        active: (s: string) => s === 'disabled' },
  { value: 'featured', label: 'Vurğulananlar', icon: Star,        active: (_s: string, f: boolean | null) => !!f },
] as const;

const TYPE_CHIPS = [
  { value: 'all',      label: 'Hamısı', icon: null },
  { value: 'external', label: 'Xarici', icon: Globe },
  { value: 'video',    label: 'Video',  icon: Video },
  { value: 'form',     label: 'Form',   icon: LayoutList },
  { value: 'document', label: 'Sənəd',  icon: FileText },
] as const;

export function LinkDatabaseFilterBar({
  title,
  filters,
  viewMode,
  canCreate,
  selectedCount = 0,
  isBulkDeleting,
  onFilterChange,
  onResetFilters,
  onViewModeChange,
  onCreateClick,
  onBulkDelete,
}: LinkDatabaseFilterBarProps) {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.linkType !== 'all' ||
    filters.status !== 'all' ||
    filters.isFeatured !== null;

  const handleStatusChip = (value: string) => {
    if (value === 'all') {
      onFilterChange('status', 'all');
      onFilterChange('isFeatured', null);
    } else if (value === 'featured') {
      onFilterChange('isFeatured', filters.isFeatured ? null : true);
    } else {
      onFilterChange('status', filters.status === value ? 'all' : (value as LinkDatabaseFiltersState['status']));
    }
  };

  const isStatusActive = (value: string) => {
    if (value === 'all') return filters.status === 'all' && !filters.isFeatured;
    if (value === 'featured') return !!filters.isFeatured;
    return filters.status === value;
  };

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Title Section */}
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="text-base font-black text-[#0f172a] whitespace-nowrap">{title}</h1>
        <div className="w-px h-6 bg-gray-200" />
      </div>

      {/* Search Input */}
      <div className="relative w-56 shrink-0 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none transition-colors group-focus-within:text-primary" />
        <Input
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          placeholder="Keçid axtar..."
          className="h-10 pl-10 pr-8 text-sm rounded-xl border-gray-200 bg-[#f8fafc] hover:bg-white focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange('search', '')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="w-px h-6 bg-gray-100 shrink-0" />

      {/* Status Chips */}
      <div className="flex items-center gap-1.5 shrink-0">
        {STATUS_CHIPS.map(({ value, label }) => {
          const active = isStatusActive(value);
          return (
            <button
              key={value}
              onClick={() => handleStatusChip(value)}
              className={cn(
                'h-9 px-4 rounded-full text-xs font-bold transition-all border whitespace-nowrap',
                active
                  ? 'bg-[#1e293b] border-[#1e293b] text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-w-[20px]" />

      {/* Type Section */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">NÖV:</span>
        <div className="flex items-center gap-1.5">
          {TYPE_CHIPS.map(({ value, label, icon: Icon }) => {
            const active = filters.linkType === value;
            return (
              <button
                key={value}
                onClick={() => onFilterChange('linkType', value as LinkDatabaseFiltersState['linkType'])}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap',
                  active
                    ? 'bg-[#1e293b] border-[#1e293b] text-white'
                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0 mx-1" />

      {/* View Mode Toggle */}
      <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
        <button
          onClick={() => onViewModeChange('grid')}
          className={cn(
            'h-8 w-8 flex items-center justify-center rounded-lg transition-all',
            viewMode === 'grid' ? 'bg-white shadow-sm text-[#1e293b]' : 'text-gray-400 hover:text-gray-600'
          )}
          title="Böyük Kartlar"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange('compact')}
          className={cn(
            'h-8 w-8 flex items-center justify-center rounded-lg transition-all',
            viewMode === 'compact' ? 'bg-white shadow-sm text-[#1e293b]' : 'text-gray-400 hover:text-gray-600'
          )}
          title="Yığcam Siyahı"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange('table')}
          className={cn(
            'h-8 w-8 flex items-center justify-center rounded-lg transition-all',
            viewMode === 'table' ? 'bg-white shadow-sm text-[#1e293b]' : 'text-gray-400 hover:text-gray-600'
          )}
          title="Cədvəl Görünüşü"
        >
          <LayoutList className="h-4 w-4" />
        </button>
      </div>

      {/* Primary Action */}
      {canCreate && onCreateClick && (
        <Button
          onClick={onCreateClick}
          className="h-10 px-5 rounded-xl font-black bg-[#1e293b] hover:bg-[#0f172a] text-white shadow-lg shadow-gray-200 border-0 text-xs shrink-0 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Yeni Keçid
        </Button>
      )}

      {/* Reset & Bulk Actions (Conditional) */}
      {(hasActiveFilters || selectedCount > 0) && (
        <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
          {hasActiveFilters && (
            <button onClick={onResetFilters} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all" title="Sıfırla">
              <X className="h-4 w-4" />
            </button>
          )}
          {selectedCount > 0 && onBulkDelete && (
            <button onClick={onBulkDelete} disabled={isBulkDeleting} className="p-2 rounded-lg text-red-600 hover:bg-red-100 transition-all" title={`${selectedCount} seçilmişi sil`}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
