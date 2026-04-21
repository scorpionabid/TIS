import React, { useState } from 'react';
import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Grade } from '@/services/grades';
import { GradeUpdateData } from '@/services/grades';
import { EditableNumber } from '@/components/curriculum/EditableNumber';
import {
  BASE_DATA, GRADE_GROUPS, SPLIT_KEYS, SPLIT_LABELS,
  n, nn,
} from '@/components/curriculum/curriculumConstants';
import { SUBJECT_IDS } from '@/components/curriculum/curriculumConstants';
import { LevelTotal, GrandTotal, calculateGradeHours } from '@/hooks/useCurriculumPlanData';

interface Props {
  reactiveGrades: Grade[];
  activeLevels: { level: number; name: string }[];
  levelTotals: Record<number, LevelTotal>;
  grandTotal: GrandTotal;
  isLocked: boolean;
  loadingGrades: boolean;
  onUpdateGrade: (gradeId: number, data: Partial<GradeUpdateData>) => void;
}

export function CurriculumYigimTab({
  reactiveGrades,
  activeLevels,
  levelTotals,
  grandTotal,
  isLocked,
  loadingGrades,
  onUpdateGrade,
}: Props) {
  const [levelExpanded, setLevelExpanded] = useState<Set<number>>(new Set());

  const toggleLevel = (lvl: number) => {
    setLevelExpanded(prev => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-premium overflow-hidden border border-slate-200/60 transition-all">
      <div className="overflow-x-auto relative scrollbar-premium">
        <table className="w-full text-xs border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-30 shadow-sm border-b border-slate-200">
            <tr className="bg-slate-50/90 backdrop-blur-sm text-slate-500 font-bold uppercase tracking-wider h-14 text-[10px]">
              <th rowSpan={2} className="px-3 text-center border-r border-slate-100 sticky left-0 z-30 bg-slate-50/90" style={{ width: 40 }}>№</th>
              <th rowSpan={2} className="px-4 text-left border-r border-slate-100 sticky left-[40px] z-30 bg-slate-50/90 shadow-[2px_0_10px_rgba(0,0,0,0.03)] font-black text-slate-800" style={{ minWidth: 200 }}>Siniflər</th>
              <th rowSpan={2} className="px-3 text-center border-r border-slate-100">Şagird<br />Sayı</th>
              <th rowSpan={2} className="px-3 text-center border-r border-slate-100">Sinif<br />Sayı</th>
              <th rowSpan={2} className="px-4 text-center border-r border-slate-100 bg-indigo-50/30 text-indigo-900 font-black">Plan<br />Saat</th>
              <th colSpan={8} className="px-3 text-center bg-slate-50/50 border-b border-slate-100 font-black text-[9px] tracking-widest text-slate-400">Bölünən dərslərin sayı</th>
              <th rowSpan={2} className="px-4 text-center border-x border-slate-100 bg-indigo-50/30 text-indigo-900 font-black">Bölünən<br />Cəmi</th>
              <th rowSpan={2} className="px-4 text-center bg-indigo-600 text-white font-black shadow-lg shadow-indigo-100">Yekun<br />Cəmi</th>
              <th colSpan={5} className="px-3 text-center bg-emerald-50/30 border-b border-emerald-100/50 font-black text-[9px] tracking-widest text-emerald-600/80">Kənar / Fərdi Saatlar</th>
              <th rowSpan={2} className="px-4 text-center bg-slate-900 text-white font-black">Cəmi Saat</th>
            </tr>
            <tr className="bg-slate-50/50 text-slate-400 text-[8px] h-10 border-b border-slate-100">
              {SPLIT_LABELS.map((lbl: string[], idx: number) => (
                <th key={idx} className="px-1 text-center border-r border-slate-100 min-w-[45px] font-medium">
                  {lbl[0]}<br />{lbl[1]}
                </th>
              ))}
              <th className="px-2 text-center border-r border-emerald-50 text-emerald-600/60 font-bold">Dərs-kənar</th>
              <th className="px-2 text-center border-r border-emerald-50 text-emerald-600/60 font-bold">Fərdi</th>
              <th className="px-2 text-center border-r border-emerald-50 text-emerald-600/60 font-bold">Evdə</th>
              <th className="px-2 text-center border-r border-emerald-50 text-emerald-600/60 font-bold">Xüsusi</th>
              <th className="px-2 text-center border-emerald-50 text-emerald-600/60 font-bold">Dərnək</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {BASE_DATA.map((b, bidx) => {
              const clsList = reactiveGrades
                .filter(c => c.class_level === b.level)
                .sort((a, bGrade) => a.name.localeCompare(bGrade.name));
              if (clsList.length === 0) return null;

              const isLvlExp = levelExpanded.has(b.level);
              const lt = levelTotals[b.level] || {
                studentCount: 0, classCount: 0, plan: 0, splitBySubject: {}, split: 0,
                extra: 0, indiv: 0, home: 0, special: 0, club: 0, total: 0,
              };

              return (
                <React.Fragment key={b.level}>
                  {/* Level summary row */}
                  <tr
                    className={cn(
                      'cursor-pointer transition-all h-11',
                      isLvlExp ? 'bg-indigo-50/50' : 'bg-slate-50 hover:bg-slate-100/80',
                    )}
                    onClick={() => toggleLevel(b.level)}
                  >
                    <td className="px-2 text-center font-bold text-slate-400 border-r border-slate-100/50 sticky left-0 z-20 bg-slate-50/50" style={{ width: 40 }}>{bidx + 1}</td>
                    <td className="px-3 text-[11px] font-black text-slate-800 flex items-center gap-2 sticky left-[40px] z-20 bg-slate-50/50 border-r border-slate-200/60 shadow-[5px_0_15px_rgba(0,0,0,0.02)]" style={{ minWidth: 200 }}>
                      <div className={cn('p-1.5 rounded-lg transition-all duration-300', isLvlExp ? 'bg-indigo-100 text-indigo-700 rotate-180' : 'text-slate-300 group-hover:text-slate-500')}>
                        <ChevronDown size={14} />
                      </div>
                      {b.label} SİNİF KOMPLEKTLƏRİ
                    </td>
                    <td className="px-2 text-center font-bold text-slate-600 bg-slate-50/20">{lt.studentCount}</td>
                    <td className="px-2 text-center font-bold text-slate-600 bg-slate-50/20">{lt.classCount}</td>
                    <td className="px-3 text-center font-black text-indigo-900 bg-indigo-50/10 tabular-nums text-[13px]">{n(lt.plan)}</td>
                    {SPLIT_KEYS.map(k => (
                      <td key={k} className="px-1 text-center text-slate-400 font-medium tabular-nums border-r border-slate-50/50">{nn(lt.splitBySubject?.[k] || 0)}</td>
                    ))}
                    <td className="px-3 text-center font-black text-indigo-900 bg-indigo-50/20 tabular-nums">{nn(lt.split)}</td>
                    <td className="px-3 text-center font-black text-slate-900 bg-slate-100/80 tabular-nums text-[13px]">{(lt.plan + lt.split).toFixed(1)}</td>
                    <td className="px-2 text-center font-bold text-slate-500 tabular-nums opacity-60">{nn(lt.extra)}</td>
                    <td className="px-2 text-center font-bold text-slate-500 tabular-nums opacity-60">{nn(lt.indiv)}</td>
                    <td className="px-2 text-center font-bold text-slate-500 tabular-nums opacity-60">{nn(lt.home)}</td>
                    <td className="px-2 text-center font-bold text-slate-500 tabular-nums opacity-60">{nn(lt.special)}</td>
                    <td className="px-2 text-center font-bold text-slate-500 tabular-nums opacity-60">{nn(lt.club)}</td>
                    <td className="px-3 text-center font-black text-white bg-slate-800 tabular-nums shadow-inner text-[13px]">{lt.total.toFixed(1)}</td>
                  </tr>

                  {/* Expanded grade rows */}
                  {isLvlExp && clsList.map((c, cidx) => {
                    const gh = calculateGradeHours(c);
                    const cGrade = c as Record<string, unknown>;

                    return (
                      <tr key={c.id} className="hover:bg-indigo-50/20 transition-all h-10 border-b border-slate-50 group">
                        <td className="px-2 text-center font-medium text-slate-300 border-r border-slate-50 sticky left-0 z-10 bg-white group-hover:bg-indigo-50/50" style={{ width: 40 }}>{cidx + 1}</td>
                        <td className="px-3 text-[11px] font-semibold text-slate-500 pl-10 border-r border-slate-50 sticky left-[40px] z-10 bg-white group-hover:bg-indigo-50/50 shadow-[5px_0_15px_rgba(0,0,0,0.01)]" style={{ minWidth: 200 }}>
                          {c.class_level > 0 ? c.class_level : 'MH'} {c.name}
                        </td>
                        <td className="px-2 text-center font-medium text-slate-400 tabular-nums">{c.real_student_count || c.student_count || 0}</td>
                        <td className="px-2 text-center font-medium text-slate-400 tabular-nums opacity-30">1</td>
                        <td className="px-3 text-center tabular-nums bg-indigo-50/10 text-slate-700">
                          <EditableNumber
                            value={c.curriculum_hours}
                            placeholder={gh.plan.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { curriculum_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        {SPLIT_KEYS.map(k => (
                          <td key={k} className="px-1 text-center tabular-nums">
                            <EditableNumber
                              value={c[k]}
                              onChange={(val) => !isLocked && onUpdateGrade(c.id, { [k]: val })}
                              placeholder="0"
                              disabled={isLocked}
                            />
                          </td>
                        ))}
                        <td className="px-3 text-center font-bold text-indigo-500 tabular-nums bg-indigo-50/10">{nn(gh.split)}</td>
                        <td className="px-3 text-center font-bold text-indigo-600 bg-indigo-50/30 tabular-nums">{(gh.plan + gh.split).toFixed(1)}</td>
                        <td className="px-2 text-center bg-emerald-50/5">
                          <EditableNumber
                            value={cGrade.extra_hours as number | null | undefined}
                            placeholder={gh.extra.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { extra_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-2 text-center bg-emerald-50/5">
                          <EditableNumber
                            value={cGrade.individual_hours as number | null | undefined}
                            placeholder={gh.indiv.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { individual_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-2 text-center bg-emerald-50/5">
                          <EditableNumber
                            value={cGrade.home_hours as number | null | undefined}
                            placeholder={gh.home.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { home_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-2 text-center bg-emerald-50/5">
                          <EditableNumber
                            value={cGrade.special_hours as number | null | undefined}
                            placeholder={gh.special.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { special_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-2 text-center bg-emerald-50/5">
                          <EditableNumber
                            value={cGrade.club_hours as number | null | undefined}
                            placeholder={gh.club.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { club_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-3 text-center font-bold text-slate-700 bg-slate-50 tabular-nums">{gh.total.toFixed(1)}</td>
                      </tr>
                    );
                  })}

                  {/* Grade group subtotal rows */}
                  {GRADE_GROUPS.map((group, groupIdx) => {
                    if (group.levels[group.levels.length - 1] !== b.level) return null;
                    const gt: LevelTotal & { splitBySubject: Record<string, number> } = {
                      studentCount: 0, classCount: 0, plan: 0,
                      splitBySubject: Object.fromEntries(SPLIT_KEYS.map(k => [k, 0])),
                      split: 0, extra: 0, indiv: 0, home: 0, special: 0, club: 0, total: 0,
                    };
                    group.levels.forEach(l => {
                      const levelTot = levelTotals[l];
                      if (!levelTot) return;
                      gt.studentCount += levelTot.studentCount;
                      gt.classCount += levelTot.classCount;
                      gt.plan += levelTot.plan;
                      gt.split += levelTot.split;
                      gt.extra += levelTot.extra;
                      gt.indiv += levelTot.indiv;
                      gt.home += levelTot.home;
                      gt.special += levelTot.special;
                      gt.club += levelTot.club || 0;
                      gt.total += levelTot.total;
                      SPLIT_KEYS.forEach(k => { gt.splitBySubject[k] += levelTot.splitBySubject?.[k] || 0; });
                    });
                    return (
                      <tr key={`group-${groupIdx}`} className="bg-slate-100/60 text-slate-800 h-10 border-b border-slate-200 text-[10px] font-black uppercase">
                        <td colSpan={2} className="px-4 text-left sticky left-0 z-20 bg-slate-100 border-r border-slate-200 shadow-sm">
                          <div className="absolute left-0 top-0 bottom-0 w-[40px] border-r border-slate-100 bg-slate-100"></div>
                          <span className="relative z-10 pl-[40px] tracking-tight">{group.label} KOMPLEKTLƏRİ ÜZRƏ:</span>
                        </td>
                        <td className="px-2 text-center tabular-nums text-slate-600 active-group">{gt.studentCount}</td>
                        <td className="px-2 text-center tabular-nums text-slate-600">{gt.classCount}</td>
                        <td className="px-3 text-center tabular-nums text-indigo-900 bg-indigo-50/20">{n(gt.plan)}</td>
                        {SPLIT_KEYS.map(k => (
                          <td key={k} className="px-1 text-center tabular-nums text-slate-400 font-bold">{n(gt.splitBySubject?.[k])}</td>
                        ))}
                        <td className="px-3 text-center tabular-nums text-indigo-950 bg-indigo-50/30">{n(gt.split)}</td>
                        <td className="px-3 text-center tabular-nums bg-slate-200/40 text-slate-900">{(gt.plan + gt.split).toFixed(1)}</td>
                        <td className="px-2 text-center tabular-nums text-slate-500">{n(gt.extra)}</td>
                        <td className="px-2 text-center tabular-nums text-slate-500">{n(gt.indiv)}</td>
                        <td className="px-2 text-center tabular-nums text-slate-500">{n(gt.home)}</td>
                        <td className="px-2 text-center tabular-nums text-slate-500">{n(gt.special)}</td>
                        <td className="px-2 text-center tabular-nums text-slate-500">{n(gt.club)}</td>
                        <td className="px-3 text-center tabular-nums font-black text-white bg-slate-900/90">{gt.total.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Footer: CƏMİ (Dərnəksiz) */}
            <tr className="bg-slate-100/80 text-slate-800 h-12 font-bold border-t-2 border-slate-200">
              <td colSpan={2} className="px-4 text-left text-xs sticky left-0 z-30 bg-slate-100/80 border-r border-slate-200 shadow-[2px_0_15px_rgba(0,0,0,0.05)]">
                <div className="absolute left-0 top-0 bottom-0 w-[40px] border-r border-slate-200 bg-slate-100/80"></div>
                <span className="relative z-10 pl-[40px]">CƏMİ:</span>
              </td>
              <td className="px-2 text-center tabular-nums">{grandTotal.studentCount}</td>
              <td className="px-2 text-center tabular-nums">{grandTotal.classCount}</td>
              <td className="px-3 text-center tabular-nums">{n(grandTotal.plan)}</td>
              {SPLIT_KEYS.map((k, idx) => {
                const groupSplit = (Object.values(levelTotals) as LevelTotal[]).reduce((a, lt) => a + (lt.splitBySubject?.[k] || 0), 0);
                return <td key={idx} className="px-1 text-center tabular-nums opacity-50">{n(groupSplit)}</td>;
              })}
              <td className="px-3 text-center tabular-nums">{nn(grandTotal.split)}</td>
              <td className="px-3 text-center tabular-nums">{(grandTotal.plan + grandTotal.split).toFixed(1)}</td>
              <td className="px-2 text-center tabular-nums">{n(grandTotal.extra)}</td>
              <td className="px-2 text-center tabular-nums">{n(grandTotal.indiv)}</td>
              <td className="px-2 text-center tabular-nums">{n(grandTotal.home)}</td>
              <td className="px-2 text-center tabular-nums">{n(grandTotal.special)}</td>
              <td className="px-2 text-center tabular-nums">—</td>
              <td className="px-3 text-center text-sm bg-slate-200/50 text-slate-900 tabular-nums font-bold">
                {(grandTotal.total - (grandTotal.club || 0)).toFixed(1)}
              </td>
            </tr>



            {/* Footer: ÜMUMİ YEKUN CƏM */}
            <tr className="bg-slate-800 text-white h-14 shadow-lg relative z-20 font-bold tracking-wide text-xs">
              <td colSpan={2} className="px-4 text-left sticky left-0 z-30 bg-slate-800 border-r border-slate-700">YEKUN CƏM:</td>
              <td className="px-2 text-center text-sm tabular-nums">{grandTotal.studentCount}</td>
              <td className="px-2 text-center text-sm tabular-nums">{grandTotal.classCount}</td>
              <td className="px-3 text-center text-sm tabular-nums opacity-90">{n(grandTotal.plan)}</td>
              {SPLIT_KEYS.map((k, idx) => {
                const groupSplit = (Object.values(levelTotals) as LevelTotal[]).reduce((a, lt) => a + (lt.splitBySubject?.[k] || 0), 0);
                return <td key={idx} className="px-1 text-center tabular-nums opacity-50">{n(groupSplit)}</td>;
              })}
              <td className="px-3 text-center tabular-nums opacity-75">{nn(grandTotal.split)}</td>
              <td className="px-3 text-center tabular-nums opacity-80">{(grandTotal.plan + grandTotal.split).toFixed(1)}</td>
              <td className="px-2 text-center tabular-nums opacity-60">{n(grandTotal.extra)}</td>
              <td className="px-2 text-center tabular-nums opacity-60">{n(grandTotal.indiv)}</td>
              <td className="px-2 text-center tabular-nums opacity-60">{n(grandTotal.home)}</td>
              <td className="px-2 text-center tabular-nums opacity-60">{n(grandTotal.special)}</td>
              <td className="px-2 text-center tabular-nums opacity-60">{n(grandTotal.club)}</td>
              <td className="px-3 text-center text-xl bg-indigo-600 text-white tabular-nums font-black shadow-inner border-l border-indigo-500/50">
                {grandTotal.total.toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>

        {!loadingGrades && reactiveGrades.length === 0 && (
          <div className="p-12 text-center text-slate-400 bg-slate-50/30">
            <Database className="mx-auto h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Məlumat tapılmadı</p>
            <p className="text-xs mt-1">Bu təhsil ili üçün sinif tədris planı yaradılmayıb</p>
          </div>
        )}
      </div>
    </div>
  );
}
