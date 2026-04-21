import React from 'react';
import { BookOpen, Calculator, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectVacanciesHeaderProps {
  displayStats: {
    totalSelected: number;
    totalAssigned: number;
    vacancy: number;
  };
  isSaving: boolean;
  lastSaved: Date | null;
}

export const SubjectVacanciesHeader: React.FC<SubjectVacanciesHeaderProps> = ({
  displayStats,
  isSaving,
  lastSaved
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 bg-white/40 p-2 rounded-[1.5rem] border border-slate-200/50 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-3 pl-2 pr-4 border-r border-slate-200/50 shrink-0">
        <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100/50">
          <BookOpen className="w-4 h-4 text-blue-600" />
        </div>
        <div className="hidden sm:block">
          <h2 className="text-sm font-bold text-slate-800 leading-tight">Fənlər və Vakansiyalar</h2>
          <p className="text-[10px] text-slate-400 font-medium">İdarəetmə Paneli</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-600 rounded-xl text-white shadow-indigo-200/20 shadow-lg">
          <div>
            <p className="text-[8px] font-bold opacity-70 leading-none mb-0.5 uppercase tracking-wider">CƏMİ</p>
            <h3 className="text-base font-black tabular-nums leading-none">
              {displayStats.totalSelected}
              <span className="text-[8px] ml-0.5 font-medium opacity-60 italic uppercase">s</span>
            </h3>
          </div>
          <Calculator className="w-3.5 h-3.5 opacity-40" />
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 bg-white/80 border border-slate-100 rounded-xl shadow-sm">
          <div>
            <p className="text-[8px] font-bold text-slate-400 leading-none mb-0.5 uppercase tracking-wider">TƏYİN</p>
            <h3 className="text-base font-black tabular-nums text-slate-700 leading-none">
              {displayStats.totalAssigned}
              <span className="text-[8px] ml-0.5 font-medium text-slate-300 italic uppercase">s</span>
            </h3>
          </div>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50" />
        </div>

        <div className={cn(
          "flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all shadow-sm",
          displayStats.vacancy > 0 ? "bg-orange-50/50 border-orange-100" : "bg-emerald-50/50 border-emerald-100"
        )}>
          <div>
            <p className={cn(
              "text-[8px] font-bold leading-none mb-0.5 uppercase tracking-wider",
              displayStats.vacancy > 0 ? "text-orange-400" : "text-emerald-400"
            )}>VAKANT</p>
            <h3 className={cn(
              "text-base font-black tabular-nums leading-none",
              displayStats.vacancy > 0 ? "text-orange-600" : "text-emerald-600"
            )}>
              {displayStats.vacancy.toFixed(1)}
            </h3>
          </div>
          {displayStats.vacancy > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-orange-400/50" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end px-2 shrink-0 border-l border-slate-200/50 min-w-[110px] h-9">
        {isSaving ? (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 text-blue-600 rounded-lg border border-blue-100/50 italic font-medium animate-pulse">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span className="text-[8px] uppercase tracking-wider">Saxlanılır</span>
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-2 px-2 text-emerald-600 transition-all duration-300">
            <CheckCircle2 className="w-3 h-3" />
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase leading-none mb-0.5">Yadda saxlanıldı</span>
              <span className="text-[7px] opacity-60 tabular-nums leading-none">
                {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
