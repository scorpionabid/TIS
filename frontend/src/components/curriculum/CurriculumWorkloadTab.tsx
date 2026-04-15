import { Loader2, Search, Clock } from 'lucide-react';
import { useState } from 'react';
import { SchoolTeacher } from '@/services/schoolAdmin';
import { workloadColumns } from '@/components/teachers/configurations/teacherConfig';
import { LevelTotal } from '@/hooks/useCurriculumPlanData';

interface Props {
  teachers: SchoolTeacher[];
  loadingTeachers: boolean;
  levelTotals: Record<number, LevelTotal>;
  onOpenDrawer: (teacher: SchoolTeacher) => void;
}

export function CurriculumWorkloadTab({ teachers, loadingTeachers, onOpenDrawer }: Props) {
  const [workloadSearch, setWorkloadSearch] = useState('');

  const filtered = teachers.filter(t => {
    if (!workloadSearch) return true;
    const search = workloadSearch.toLowerCase();
    const tRaw = t as Record<string, unknown>;
    return (
      t.first_name?.toLowerCase().includes(search) ||
      t.last_name?.toLowerCase().includes(search) ||
      (tRaw.patronymic as string)?.toLowerCase().includes(search) ||
      (tRaw.specialty as string)?.toLowerCase().includes(search) ||
      t.email?.toLowerCase().includes(search) ||
      (tRaw.employee_id as string)?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-slate-200/60 p-1">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Müəllim axtar (ad, soyad, ixtisas...)"
            value={workloadSearch}
            onChange={(e) => setWorkloadSearch(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
          />
        </div>
      </div>

      {loadingTeachers ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-xs font-bold uppercase tracking-widest">Müəllim siyahısı yüklənir...</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[calc(100vh-350px)] scrollbar-premium">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                <th className="p-5 text-center w-16">№</th>
                {workloadColumns.map((col) => (
                  <th key={String(col.key)} className="p-5">{col.label}</th>
                ))}
                <th className="p-5 text-center">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t, i) => (
                <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="p-5 text-center text-slate-400 font-bold">{i + 1}</td>
                  {workloadColumns.map((col) => (
                    <td key={String(col.key)} className="p-5 text-slate-600 font-medium">
                      {col.render
                        ? col.render(t, (t as Record<string, unknown>)[col.key as string])
                        : String((t as Record<string, unknown>)[col.key as string] ?? '')}
                    </td>
                  ))}
                  <td className="p-5 text-center">
                    <button
                      onClick={() => onOpenDrawer(t)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-600 text-[11px] font-black border border-indigo-100 shadow-sm hover:bg-indigo-600 hover:text-white transition-all transform group-hover:scale-105"
                    >
                      <Clock size={14} className="stroke-[3px]" />
                      DƏRS YÜKÜ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/90 font-bold text-slate-950 border-t-2 border-slate-300 h-14">
                <td className="p-4 text-center text-slate-500 font-black text-sm">#</td>
                <td colSpan={1} className="p-4 font-black text-sm">YEKUN CƏM:</td>
                {workloadColumns.length > 2 && workloadColumns.slice(1).map((col, idx) => {
                  const isNumeric = typeof (filtered[0] as Record<string, unknown> | undefined)?.[col.key as string] === 'number';
                  if (isNumeric) {
                    const total = filtered.reduce((acc, cur) => acc + (Number((cur as Record<string, unknown>)[col.key as string]) || 0), 0);
                    return (
                      <td key={idx} className="p-4 tabular-nums text-indigo-700 font-black text-sm">
                        {total % 1 === 0 ? total.toString() : total.toFixed(1)}
                      </td>
                    );
                  }
                  return <td key={idx} className="p-4" />;
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
