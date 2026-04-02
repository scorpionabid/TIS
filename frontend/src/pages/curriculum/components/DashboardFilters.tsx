import React from 'react';
import { Search, Filter, CheckCircle2, X } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DashboardFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  sectorFilter: string;
  setSectorFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sectors: any[];
  isRegionAdmin: boolean;
  resultCount: number;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  search,
  setSearch,
  sectorFilter,
  setSectorFilter,
  statusFilter,
  setStatusFilter,
  sectors,
  isRegionAdmin,
  resultCount
}) => {
  const hasActiveFilters = search || sectorFilter !== 'all' || statusFilter !== 'all';

  const clearAll = () => {
    setSearch('');
    setSectorFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-4 py-3 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Məktəb adı ilə axtar..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sector Filter - RegionAdmin only */}
        {isRegionAdmin && (
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="h-9 w-[180px] rounded-lg border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Filter size={12} className="text-slate-400 shrink-0" />
                <SelectValue placeholder="Sektor" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all" className="text-sm font-medium">Bütün Sektorlar</SelectItem>
              {Array.isArray(sectors) ? sectors.map((s: any) => (
                <SelectItem key={s.id} value={s.id.toString()} className="text-sm text-slate-700">
                  {s.name}
                </SelectItem>
              )) : null}
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[170px] rounded-lg border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-slate-400" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-100 shadow-xl">
            <SelectItem value="all" className="text-sm font-medium">Bütün Statuslar</SelectItem>
            <SelectItem value="draft" className="text-sm text-slate-600">Qaralamalar</SelectItem>
            <SelectItem value="submitted" className="text-sm text-slate-600">Göndərilənlər</SelectItem>
            <SelectItem value="approved" className="text-sm text-slate-600">Təsdiqlənənlər</SelectItem>
            <SelectItem value="returned" className="text-sm text-slate-600">Geri qaytarılanlar</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear + Count */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-rose-500 hover:border-rose-200 transition-all flex items-center gap-1.5"
            >
              <X size={12} /> Təmizlə
            </button>
          )}
          <div className={cn(
            'h-9 px-3 rounded-lg flex items-center text-xs font-semibold border',
            resultCount === 0
              ? 'bg-rose-50 text-rose-500 border-rose-200'
              : 'bg-indigo-50 text-indigo-600 border-indigo-100'
          )}>
            {resultCount} məktəb
          </div>
        </div>
      </div>
    </div>
  );
};
