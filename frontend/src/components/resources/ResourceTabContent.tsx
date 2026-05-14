import { useState, useMemo, useCallback } from 'react';
import {
  Search, Plus, Loader2,
  LayoutGrid, LayoutList,
  Building2, MapPin, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssignedResourceGrid } from './AssignedResourceGrid';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';
import type { AssignedResource } from '@/types/resources';

type ScopeFilter = 'all' | 'region' | 'sector' | 'school';
type ViewMode    = 'comfortable' | 'compact';

interface ResourceTabContentProps {
  resources: AssignedResource[];
  isLoading: boolean;
  resourceType: 'link' | 'document';
  isManager: boolean | null | undefined;
  currentUserId: number | undefined;
  currentUserRole?: string;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onResourceAction: (resource: AssignedResource, action: 'view' | 'access' | 'download' | 'preview') => void;
  onCardClick: (resource: AssignedResource) => void;
  onEdit: (resource: AssignedResource) => void;
  onDelete: (resource: AssignedResource) => void;
  onCreateNew: () => void;
}

const SCOPE_LEVELS = [
  { value: 'all'    as ScopeFilter, label: 'Hamısı',    icon: null          },
  { value: 'region' as ScopeFilter, label: 'Region',    icon: Building2     },
  { value: 'sector' as ScopeFilter, label: 'Sektor',    icon: MapPin        },
  { value: 'school' as ScopeFilter, label: 'Məktəblər', icon: GraduationCap },
] as const;

// Hədəf institutların minimum level-inə görə tab müəyyən edilir:
// level 2 = region, level 3 = sector, level 4 = school
function getResourceTab(r: AssignedResource): ScopeFilter {
  const level = r.target_institution_level;
  if (level === 2) return 'region';
  if (level === 3) return 'sector';
  if (level === 4) return 'school';

  // Fallback: share_scope / access_level (ictimai və ya köhnə resurslar üçün)
  const scope = r.share_scope ?? r.access_level;
  switch (scope) {
    case 'regional':    return 'region';
    case 'sectoral':    return 'sector';
    case 'institutional':
    case 'institution': return 'school';
    default:            return 'all';
  }
}

function storageKey(resourceType: 'link' | 'document') {
  return `atis-my-resources-${resourceType}-scope`;
}

function readDefault(resourceType: 'link' | 'document'): ScopeFilter {
  try {
    const v = localStorage.getItem(storageKey(resourceType));
    if (v === 'all' || v === 'region' || v === 'sector' || v === 'school') return v;
  } catch { /* ignore */ }
  return 'all';
}

// ScopeChip — long-press ilə default seçim + progress bar
interface ScopeChipProps {
  value: ScopeFilter;
  label: string;
  count: number;
  icon: React.ElementType | null;
  active: boolean;
  onClick: () => void;
  onSetDefault: () => void;
}

function ScopeChip({ value, label, count, icon: Icon, active, onClick, onSetDefault }: ScopeChipProps) {
  const { handlers, pressing, progress } = useLongPress(onSetDefault, 5000);

  return (
    <button
      onClick={onClick}
      {...handlers}
      title={pressing ? `${Math.round(progress * 100)}% — buraxın: default seçilir` : 'Saxlayın: default et'}
      className={cn(
        'relative h-7 flex items-center gap-1.5 px-2.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap border select-none overflow-hidden',
        active
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-white text-muted-foreground border-gray-200 hover:bg-gray-50',
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {label}
      <span className="ml-0.5 opacity-70">({count})</span>

      {/* Long-press progress bar */}
      {pressing && (
        <span
          className="absolute bottom-0 left-0 h-0.5 bg-current opacity-60 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
    </button>
  );
}

export function ResourceTabContent({
  resources,
  isLoading,
  resourceType,
  isManager,
  currentUserId,
  currentUserRole,
  searchTerm,
  onSearchChange,
  onResourceAction,
  onCardClick,
  onEdit,
  onDelete,
  onCreateNew,
}: ResourceTabContentProps) {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(() => readDefault(resourceType));
  const [viewMode, setViewMode]       = useState<ViewMode>('comfortable');

  const isLink = resourceType === 'link';

  const counts = useMemo(() => ({
    all:    resources.length,
    region: resources.filter(r => getResourceTab(r) === 'region').length,
    sector: resources.filter(r => getResourceTab(r) === 'sector').length,
    school: resources.filter(r => getResourceTab(r) === 'school').length,
  }), [resources]);

  const filtered = useMemo(() => {
    if (scopeFilter === 'all') return resources;
    return resources.filter(r => getResourceTab(r) === scopeFilter);
  }, [resources, scopeFilter]);

  const handleSetDefault = useCallback((value: ScopeFilter) => {
    try { localStorage.setItem(storageKey(resourceType), value); } catch { /* ignore */ }
    setScopeFilter(value);
  }, [resourceType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-3">
      {/* Toolbar — 1 sətir */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

        {/* Sol: Axtarış */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
          <Input
            type="text"
            placeholder={isLink ? 'Link axtarın...' : 'Sənəd axtarın...'}
            className="pl-9 h-8 text-sm"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Sağ: ViewMode + Scope chips + Create */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 lg:pb-0 scrollbar-none">

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md shrink-0">
            <button
              onClick={() => setViewMode('comfortable')}
              title="Geniş görünüş"
              className={cn('p-1.5 rounded transition-all', viewMode === 'comfortable' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700')}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              title="Yığcam görünüş"
              className={cn('p-1.5 rounded transition-all', viewMode === 'compact' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700')}
            >
              <LayoutList size={14} />
            </button>
          </div>

          {/* Scope chips */}
          <div className="flex items-center gap-1.5 border-l pl-3 h-6 border-gray-200 shrink-0">
            {SCOPE_LEVELS.map(({ value, label, icon }) => (
              <ScopeChip
                key={value}
                value={value}
                label={label}
                count={counts[value]}
                icon={icon}
                active={scopeFilter === value}
                onClick={() => setScopeFilter(value)}
                onSetDefault={() => handleSetDefault(value)}
              />
            ))}
          </div>

          {/* Create button */}
          {isManager && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 shrink-0 ml-1"
              onClick={onCreateNew}
            >
              <Plus className="h-3.5 w-3.5" />
              {isLink ? 'Yeni Link' : 'Yeni Sənəd'}
            </Button>
          )}
        </div>
      </div>

      <AssignedResourceGrid
        resources={filtered}
        viewMode={viewMode}
        onResourceAction={onResourceAction}
        onCardClick={onCardClick}
        onEdit={onEdit}
        onDelete={onDelete}
        isManager={!!isManager}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
