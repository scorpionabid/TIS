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
  Building2,
} from 'lucide-react';
import type { ViewMode, LinkDatabaseFiltersState, Department } from '../types/linkDatabase.types';

interface LinkDatabaseFilterBarProps {
  filters: LinkDatabaseFiltersState;
  viewMode: ViewMode;
  departments: Department[];
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
  { value: 'all',      label: 'Hamısı' },
  { value: 'active',   label: 'Aktiv',         icon: CheckCircle },
  { value: 'disabled', label: 'Deaktiv',        icon: Clock },
  { value: 'featured', label: 'Vurğulananlar',  icon: Star },
] as const;

const TYPE_CHIPS = [
  { value: 'all',      label: 'Hamısı' },
  { value: 'external', label: 'Xarici',  icon: Globe },
  { value: 'video',    label: 'Video',   icon: Video },
  { value: 'form',     label: 'Form',    icon: LayoutList },
  { value: 'document', label: 'Sənəd',   icon: FileText },
] as const;

const CHIP_BASE = 'flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap';
const CHIP_ACTIVE = 'bg-[#1e293b] border-[#1e293b] text-white shadow-sm';
const CHIP_INACTIVE = 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50';

export function LinkDatabaseFilterBar({
  filters,
  viewMode,
  departments,
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

  const Divider = () => <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" />;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Row 1: View Toggle + Actions */}
      <div className="flex items-center gap-2">
        {/* View mode */}
        <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
          {([
            { mode: 'grid' as ViewMode,    Icon: LayoutGrid, title: 'Böyük Kartlar' },
            { mode: 'compact' as ViewMode, Icon: List,        title: 'Yığcam Siyahı' },
            { mode: 'table' as ViewMode,   Icon: LayoutList,  title: 'Cədvəl Görünüşü' },
          ] as const).map(({ mode, Icon, title }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              title={title}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg transition-all',
                viewMode === mode ? 'bg-white shadow-sm text-[#1e293b]' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Reset + bulk delete */}
        {(hasActiveFilters || selectedCount > 0) && (
          <div className="flex items-center gap-1">
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

        {canCreate && onCreateClick && (
          <Button
            onClick={onCreateClick}
            className="h-9 px-3 sm:px-5 rounded-xl font-black bg-[#1e293b] hover:bg-[#0f172a] text-white shadow-lg shadow-gray-200 border-0 text-xs shrink-0 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yeni Keçid</span>
          </Button>
        )}
      </div>

      {/* Row 2: Search + chip strip */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-full sm:w-48 shrink-0 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none transition-colors group-focus-within:text-primary" />
          <Input
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Keçid axtar..."
            className="h-9 pl-10 pr-8 text-sm rounded-xl border-gray-200 bg-[#f8fafc] hover:bg-white focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all"
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

        {/* Scrollable chip strip */}
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">

            {/* Department chips */}
            {departments.length > 0 && (
              <>
                {departments.map((dept) => {
                  const active = filters.departmentId === dept.id.toString();
                  return (
                    <button
                      key={dept.id}
                      onClick={() => onFilterChange('departmentId', dept.id.toString())}
                      className={cn(CHIP_BASE, active ? CHIP_ACTIVE : CHIP_INACTIVE)}
                    >
                      <Building2 className="h-3 w-3 shrink-0" />
                      {dept.short_name || dept.name}
                    </button>
                  );
                })}
                <Divider />
              </>
            )}

            {/* Status chips */}
            {STATUS_CHIPS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleStatusChip(value)}
                className={cn(CHIP_BASE, isStatusActive(value) ? CHIP_ACTIVE : CHIP_INACTIVE)}
              >
                {label}
              </button>
            ))}

            <Divider />

            {/* Type chips */}
            {TYPE_CHIPS.map(({ value, label, ...rest }) => {
              const Icon = 'icon' in rest ? rest.icon : null;
              const active = filters.linkType === value;
              return (
                <button
                  key={value}
                  onClick={() => onFilterChange('linkType', value as LinkDatabaseFiltersState['linkType'])}
                  className={cn(CHIP_BASE, active ? CHIP_ACTIVE : CHIP_INACTIVE)}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {label}
                </button>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}
