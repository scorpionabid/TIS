import { X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface FilterBadgeItem {
  /** Unikal açar (filterin adı) */
  key: string;
  /** İstifadəçiyə göstəriləcək etiket */
  label: string;
  /** Filterin cari dəyəri (undefined / '' / 'all' olarsa gizlənir) */
  value: string | number | boolean | undefined | null;
  /** Göstəriləcək mətn (verilməzsə value istifadə olunur) */
  displayValue?: string;
}

interface ActiveFilterBadgesProps {
  filters: FilterBadgeItem[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

const EMPTY_VALUES: unknown[] = [undefined, null, '', 'all'];

function isActive(value: FilterBadgeItem['value']): boolean {
  return !EMPTY_VALUES.includes(value);
}

/**
 * ActiveFilterBadges — aktiv filterləri chip şəklində göstərir.
 *
 * Heç bir aktiv filter yoxdursa komponenti render etmir.
 *
 * İstifadə:
 *   <ActiveFilterBadges
 *     filters={[
 *       { key: 'search', label: 'Axtarış', value: search },
 *       { key: 'status', label: 'Status', value: status, displayValue: 'Aktiv' },
 *     ]}
 *     onRemove={(key) => setFilter(key, '')}
 *     onClearAll={clearFilters}
 *   />
 */
export function ActiveFilterBadges({ filters, onRemove, onClearAll, className }: ActiveFilterBadgesProps) {
  const activeFilters = filters.filter(f => isActive(f.value));

  if (activeFilters.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 p-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 ${className ?? ''}`}>
      <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Aktiv filtrlər:</span>
      </div>

      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="flex items-center gap-1 pl-2 pr-1 py-1 h-7 bg-blue-50 text-blue-700 border-blue-100 animate-in fade-in slide-in-from-left-2"
        >
          <span className="text-[10px] font-bold uppercase opacity-60 mr-1">{filter.label}:</span>
          <span className="max-w-[150px] truncate">
            {filter.displayValue ?? String(filter.value)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 rounded-full p-0 hover:bg-blue-200 hover:text-blue-900 ml-1"
            onClick={() => onRemove(filter.key)}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </Badge>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="text-[10px] font-bold text-slate-400 hover:text-red-500 h-7 px-2 ml-auto shrink-0"
        onClick={onClearAll}
      >
        Hamısını təmizlə
      </Button>
    </div>
  );
}
