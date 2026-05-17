import React from 'react';
import { Play, FileEdit, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

type MgmtFilter = 'active' | 'draft' | 'archived';

const MGMT_FILTER_CONFIG: Record<MgmtFilter, { label: string; icon: React.ElementType }> = {
  active:   { label: 'Aktiv',    icon: Play     },
  draft:    { label: 'Qaralama',  icon: FileEdit },
  archived: { label: 'Arxiv',   icon: Archive  },
};

interface SurveyFilterBarProps {
  mgmtFilter: MgmtFilter;
  setMgmtFilter: (filter: MgmtFilter) => void;
  mgmtCounts: Record<string, number>;
}

export const SurveyFilterBar: React.FC<SurveyFilterBarProps> = ({
  mgmtFilter,
  setMgmtFilter,
  mgmtCounts,
}) => {
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar pb-1">
      {(Object.keys(MGMT_FILTER_CONFIG) as MgmtFilter[]).map(key => {
        const { label, icon: Icon } = MGMT_FILTER_CONFIG[key];
        const isActive = mgmtFilter === key;
        return (
          <button
            key={key}
            onClick={() => setMgmtFilter(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-extrabold transition-all border",
              isActive 
                ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", isActive ? "text-blue-600" : "text-slate-400")} />
            {label.toUpperCase()}
            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded text-[10px]",
              isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
            )}>
              {mgmtCounts[key] || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
};
