import React from 'react';
import { X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FilterBadgeProps {
  label: string;
  value: string;
  onRemove: () => void;
}

const FilterBadge: React.FC<FilterBadgeProps> = ({ label, value, onRemove }) => (
  <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1 h-7 bg-blue-50 text-blue-700 border-blue-100 animate-in fade-in slide-in-from-left-2 transition-all">
    <span className="text-[10px] font-bold uppercase opacity-60 mr-1">{label}:</span>
    <span className="max-w-[150px] truncate">{value}</span>
    <Button
      variant="ghost"
      size="icon"
      className="h-4 w-4 rounded-full p-0 hover:bg-blue-200 hover:text-blue-900 ml-1"
      onClick={onRemove}
    >
      <X className="h-2.5 w-2.5" />
    </Button>
  </Badge>
);

interface ActiveFilterBarProps {
  filters: {
    label: string;
    value: string | undefined;
    key: string;
  }[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export const ActiveFilterBar: React.FC<ActiveFilterBarProps> = ({ filters, onRemove, onClearAll }) => {
  const activeFilters = filters.filter(f => f.value !== undefined && f.value !== '' && f.value !== 'all');

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
      <div className="flex items-center gap-1.5 text-slate-400 mr-2">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Aktiv Filtrlər:</span>
      </div>
      
      {activeFilters.map((filter) => (
        <FilterBadge
          key={filter.key}
          label={filter.label}
          value={filter.value!}
          onRemove={() => onRemove(filter.key)}
        />
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="text-[10px] font-bold text-slate-400 hover:text-red-500 h-7 px-2 ml-auto"
        onClick={onClearAll}
      >
        Hamsını təmizlə
      </Button>
    </div>
  );
};
