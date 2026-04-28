import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  RefreshCw, 
  Plus, 
  Send, 
  Inbox as InboxIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurveyDashboardHeaderProps {
  roleLabel: string;
  institutionName: string;
  mainTab: 'management' | 'incoming';
  setMainTab: (tab: 'management' | 'incoming') => void;
  kpis: { total: number };
  incomingCounts: { pending: number };
  isSuperAdmin: boolean;
  readonly: boolean;
  setShowModal: (show: boolean) => void;
  onRefresh: () => void;
}

export const SurveyDashboardHeader: React.FC<SurveyDashboardHeaderProps> = ({
  roleLabel,
  institutionName,
  mainTab,
  setMainTab,
  kpis,
  incomingCounts,
  isSuperAdmin,
  readonly,
  setShowModal,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Sol: Başlıq */}
      <div className="min-w-0 w-full lg:w-96">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">
          Sorğu İdarəetmə Paneli
        </h1>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <Building className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="truncate" title={`${roleLabel}${institutionName ? ` · ${institutionName}` : ''}`}>
            {roleLabel}{institutionName ? ` · ${institutionName}` : ''}
          </span>
        </div>
      </div>

      {/* MƏRKƏZ: Əsas Tablar (Sürüşdürülə bilən mobil versiya) */}
      <div className="flex-1 flex justify-center w-full overflow-x-auto no-scrollbar">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
          {[
            { key: 'management', label: isSuperAdmin ? 'Bütün Sorğular' : 'Yaratdıqlarım', icon: Send },
            { key: 'incoming',   label: 'Mənə Gələnlər', icon: InboxIcon },
          ].map(({ key, label, icon: Icon }) => {
            const isActive = mainTab === key;
            const count = key === 'management' ? kpis.total : incomingCounts.pending;
            return (
              <button
                key={key}
                onClick={() => setMainTab(key as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap",
                  isActive 
                    ? "bg-white text-blue-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400")} />
                {label}
                {count > 0 && (
                  <span className={cn(
                    "ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold",
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sağ: Düymələr */}
      <div className="flex items-center gap-2 w-full lg:w-64 justify-between lg:justify-end shrink-0">
        <Button
          variant="ghost" size="icon"
          className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        {!readonly && (
          <Button
            size="sm"
            className="h-9 gap-2 bg-[hsl(220_85%_25%)] hover:bg-[hsl(220_85%_30%)] text-white font-bold px-4"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-4 w-4" />
            YENİ SORĞU
          </Button>
        )}
      </div>
    </div>
  );
};
