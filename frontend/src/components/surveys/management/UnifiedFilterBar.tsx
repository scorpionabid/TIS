import React from 'react';
import { Play, FileEdit, BarChart3, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UnifiedFilter = 'active' | 'draft' | 'monitoring' | 'submitted';

const FILTER_CONFIG: Record<UnifiedFilter, { label: string; icon: React.ElementType }> = {
  active:     { label: 'Aktiv',      icon: Play        },
  draft:      { label: 'Qaralama',   icon: FileEdit    },
  monitoring: { label: 'Nəzarət',    icon: BarChart3   },
  submitted:  { label: 'Göndərilib', icon: CheckCircle2 },
};

interface UnifiedFilterBarProps {
  filter: UnifiedFilter;
  setFilter: (f: UnifiedFilter) => void;
  counts: Record<UnifiedFilter, number>;
}

export const UnifiedFilterBar: React.FC<UnifiedFilterBarProps> = ({ filter, setFilter, counts }) => (
  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
    {(Object.keys(FILTER_CONFIG) as UnifiedFilter[]).map(key => {
      const { label, icon: Icon } = FILTER_CONFIG[key];
      const isActive = filter === key;
      return (
        <button
          key={key}
          onClick={() => setFilter(key)}
          className={cn(
            'flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-extrabold transition-all border whitespace-nowrap',
            isActive
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
              : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700',
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-blue-600' : 'text-slate-400')} />
          {label.toUpperCase()}
          <span className={cn(
            'ml-1 px-1.5 py-0.5 rounded text-[10px]',
            isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500',
          )}>
            {counts[key]}
          </span>
        </button>
      );
    })}
  </div>
);
