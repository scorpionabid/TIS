import React from 'react';
import { cn } from '@/lib/utils';

interface RowData {
  label: string;
  master: number;
  cadvel: number;
}

export const CurriculumYigimTable = ({ 
  title, 
  headers, 
  rows, 
  totalLabel = "YEKUN CƏMİ",
  totalMaster, 
  totalFact 
}: { 
  title: string, 
  headers: string[], 
  rows: RowData[], 
  totalLabel?: string,
  totalMaster: number, 
  totalFact: number 
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Simple Header */}
        {/* Simple Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h3>
          <div className="flex items-center gap-6 text-xs font-bold text-slate-400">
             <span className="tabular-nums flex items-center gap-2">
               <span className="text-[10px] text-slate-300 uppercase">Plan:</span> 
               <span className="text-slate-600">{totalMaster.toFixed(1)}</span>
             </span>
             <span className="w-px h-4 bg-slate-200"></span>
             <span className="text-slate-900 tabular-nums flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase">Fakt:</span>
                <span className="font-black underline decoration-indigo-200 underline-offset-4">{totalFact.toFixed(1)}</span>
             </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold text-xs border-b border-slate-100">
                <th className="px-6 py-3 font-semibold">{headers[0]}</th>
                <th className="px-6 py-3 text-center font-semibold">{headers[1]}</th>
                <th className="px-6 py-3 text-center font-semibold">{headers[2]}</th>
                <th className="px-6 py-3 text-center font-semibold">{headers[3]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {rows.map((r, i) => {
                const diff = Math.abs(r.master - r.cadvel);
                const hasError = diff > 0.05;
                
                return (
                  <tr key={i} className={cn(
                    "transition-colors",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                    "hover:bg-indigo-50/40"
                  )}>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {r.label}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400 tabular-nums font-medium">
                      {r.master.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900 tabular-nums">
                      {r.cadvel.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tabular-nums uppercase tracking-tight shadow-sm border",
                        hasError 
                          ? "bg-rose-50 text-rose-600 border-rose-100" 
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                        {hasError ? `FƏRQ: ${diff.toFixed(1)}` : 'UYĞUNDUR'}
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {/* Total Row */}
              <tr className="bg-slate-100/60 font-bold border-t-2 border-slate-200">
                <td className="px-6 py-4 text-slate-800 font-bold">{totalLabel}</td>
                <td className="px-6 py-4 text-center text-slate-500 tabular-nums font-medium">{totalMaster.toFixed(1)}</td>
                <td className="px-6 py-4 text-center text-slate-900 tabular-nums font-bold bg-slate-100/50">{totalFact.toFixed(1)}</td>
                <td className="px-6 py-4 text-center">
                   <div className={cn(
                      "inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1 rounded-full",
                      (Math.abs(totalMaster - totalFact) <= 0.05) ? "bg-emerald-600 text-white shadow-sm" : "bg-rose-600 text-white shadow-sm"
                    )}>
                      <span>{(Math.abs(totalMaster - totalFact) <= 0.05) ? 'TAMAMLADI' : `FƏRQ: ${Math.abs(totalMaster - totalFact).toFixed(1)}`}</span>
                    </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
