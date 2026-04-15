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
import { LevelTotal, GrandTotal } from '@/hooks/useCurriculumPlanData';

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
    <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-slate-200/60 transition-all">
      <div className="overflow-x-auto relative scrollbar-premium">
        <table className="w-full text-xs border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-30 shadow-sm border-b border-slate-200">
            <tr className="bg-slate-50/90 backdrop-blur-md text-slate-600 font-bold uppercase tracking-wider h-16">
              <th rowSpan={2} className="px-5 text-center border-r border-slate-100 sticky left-0 z-30 bg-slate-50/90" style={{ width: 50 }}>№</th>
              <th rowSpan={2} className="px-8 text-left border-r border-slate-100 sticky left-[50px] z-30 bg-slate-50/90 shadow-[2px_0_15px_rgba(0,0,0,0.05)] font-black text-slate-800" style={{ minWidth: 260 }}>Siniflər</th>
              <th rowSpan={2} className="px-5 text-center border-r border-slate-100">Şagird<br />Sayı</th>
              <th rowSpan={2} className="px-5 text-center border-r border-slate-100">Sinif<br />Sayı</th>
              <th rowSpan={2} className="px-8 text-center border-r border-slate-100 bg-indigo-50/50 text-indigo-950/80 font-black">Tədris Planı<br />Üzrə Saat</th>
              <th colSpan={8} className="px-5 text-center bg-slate-100/50 border-b border-slate-100 font-black text-[10px] tracking-widest text-slate-500">Bölünən dərslərin sayı</th>
              <th rowSpan={2} className="px-8 text-center border-x border-slate-100 bg-indigo-50/50 text-indigo-950/80 font-black">Bölünən<br />Cəmi</th>
              <th rowSpan={2} className="px-8 text-center bg-indigo-600 text-white font-black shadow-lg shadow-indigo-100">Yekun<br />Cəmi</th>
              <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Dərsdənkənar</th>
              <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Fərdi</th>
              <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Evdə</th>
              <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Xüsusi</th>
              <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Dərnək</th>
              <th rowSpan={2} className="px-8 text-center bg-slate-900 text-white font-black">Cəmi Saat</th>
            </tr>
            <tr className="bg-slate-50/50 text-slate-400 text-[9px] h-12">
              {SPLIT_LABELS.map((lbl: string[], idx: number) => (
                <th key={idx} className="px-2 text-center border-r border-slate-100 min-w-[50px] font-medium">
                  {lbl[0]}<br />{lbl[1]}
                </th>
              ))}
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
                    <td className="px-4 text-center font-bold text-slate-400 border-r border-slate-100/50 sticky left-0 z-20 bg-slate-50/50">{bidx + 1}</td>
                    <td className="px-6 text-[11px] font-black text-slate-700 flex items-center gap-3 sticky left-[40px] z-20 bg-slate-50/50 border-r border-slate-100 shadow-[1px_0_10px_rgba(0,0,0,0.03)]">
                      <div className={cn('p-1 transition-transform duration-300', isLvlExp ? 'text-slate-800 rotate-180' : 'text-slate-300')}>
                        <ChevronDown size={14} />
                      </div>
                      {b.label} SİNİF KOMPLEKTLƏRİ
                    </td>
                    <td className="px-4 text-center font-bold text-slate-500 bg-slate-50/20">{lt.studentCount}</td>
                    <td className="px-4 text-center font-bold text-slate-500 bg-slate-50/20">{lt.classCount}</td>
                    <td className="px-6 text-center font-black text-slate-800 bg-slate-50/20 tabular-nums">{n(lt.plan)}</td>
                    {SPLIT_KEYS.map(k => (
                      <td key={k} className="px-2 text-center text-slate-400 font-medium tabular-nums">{nn(lt.splitBySubject?.[k] || 0)}</td>
                    ))}
                    <td className="px-6 text-center font-black text-slate-800 bg-slate-50/20 tabular-nums">{nn(lt.split)}</td>
                    <td className="px-6 text-center font-black text-slate-900 bg-slate-100 tabular-nums">{(lt.plan + lt.split).toFixed(1)}</td>
                    <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.extra)}</td>
                    <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.indiv)}</td>
                    <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.home)}</td>
                    <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.special)}</td>
                    <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.club)}</td>
                    <td className="px-6 text-center font-black text-white bg-slate-700 tabular-nums">{lt.total.toFixed(1)}</td>
                  </tr>

                  {/* Expanded grade rows */}
                  {isLvlExp && clsList.map((c, cidx) => {
                    const gs = c.grade_subjects || [];

                    const plan = gs.filter(i => {
                      const ed = i.education_type?.toLowerCase() || '';
                      const sid = Number(i.subject_id);
                      return (ed === 'umumi' || ed === 'ümumi' || ed === '') && !i.is_extracurricular && sid !== SUBJECT_IDS.CLUB && !!i.is_teaching_activity;
                    }).reduce((a, bItem) => a + ((Number(bItem.weekly_hours) || 0) * (Number(bItem.group_count) || 1)), 0);

                    const splSum = SPLIT_KEYS.reduce((sum, k) => sum + (Number(c[k]) || 0), 0);

                    const extra = gs.filter(i => i.is_extracurricular && Number(i.subject_id) !== SUBJECT_IDS.CLUB)
                      .reduce((a, bItem) => a + ((Number(bItem.weekly_hours) || 0) * (Number(bItem.group_count) || 1)), 0);
                    const indiv = gs.filter(i => i.education_type?.toLowerCase() === 'ferdi')
                      .reduce((a, bItem) => a + ((Number(bItem.weekly_hours) || 0) * (Number(bItem.group_count) || 1)), 0);
                    const home = gs.filter(i => i.education_type?.toLowerCase() === 'evde')
                      .reduce((a, bItem) => a + ((Number(bItem.weekly_hours) || 0) * (Number(bItem.group_count) || 1)), 0);
                    const special = gs.filter(i => i.education_type?.toLowerCase() === 'xususi')
                      .reduce((a, bItem) => a + ((Number(bItem.weekly_hours) || 0) * (Number(bItem.group_count) || 1)), 0);
                    const club = gs.filter(i => Number(i.subject_id) === SUBJECT_IDS.CLUB)
                      .reduce((a, bItem) => a + ((Number(bItem.weekly_hours) || 0) * (Number(bItem.group_count) || 1)), 0);

                    const total = plan + splSum + extra + indiv + home + special + club;
                    const cGrade = c as Record<string, unknown>;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors h-11 border-b border-slate-50">
                        <td className="px-4 text-center font-medium text-slate-400 border-r border-slate-50 sticky left-0 z-10 bg-white">{cidx + 1}</td>
                        <td className="px-6 text-[11px] font-bold text-slate-600 pl-12 border-r border-slate-50 sticky left-[40px] z-10 bg-white shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                          {c.class_level > 0 ? c.class_level : 'MH'} {c.name}
                        </td>
                        <td className="px-4 text-center font-medium text-slate-500 tabular-nums">{c.real_student_count || c.student_count || 0}</td>
                        <td className="px-4 text-center font-medium text-slate-500 tabular-nums">1</td>
                        <td className="px-6 text-center tabular-nums bg-indigo-50/20">
                          <EditableNumber
                            value={c.curriculum_hours}
                            placeholder={plan.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { curriculum_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        {SPLIT_KEYS.map(k => (
                          <td key={k} className="px-2 text-center tabular-nums">
                            <EditableNumber
                              value={c[k]}
                              onChange={(val) => !isLocked && onUpdateGrade(c.id, { [k]: val })}
                              placeholder="0"
                              disabled={isLocked}
                            />
                          </td>
                        ))}
                        <td className="px-6 text-center font-bold text-indigo-600/70 tabular-nums bg-indigo-50/20">{nn(splSum)}</td>
                        <td className="px-6 text-center font-bold text-indigo-700 bg-indigo-100/50 tabular-nums">{n(plan + splSum)}</td>
                        <td className="px-4 text-center">
                          <EditableNumber
                            value={cGrade.extra_hours as number | null | undefined}
                            placeholder={extra.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { extra_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-4 text-center">
                          <EditableNumber
                            value={cGrade.individual_hours as number | null | undefined}
                            placeholder={indiv.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { individual_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-4 text-center">
                          <EditableNumber
                            value={cGrade.home_hours as number | null | undefined}
                            placeholder={home.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { home_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-4 text-center">
                          <EditableNumber
                            value={cGrade.special_hours as number | null | undefined}
                            placeholder={special.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { special_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-4 text-center">
                          <EditableNumber
                            value={cGrade.club_hours as number | null | undefined}
                            placeholder={club.toString()}
                            onChange={(val) => !isLocked && onUpdateGrade(c.id, { club_hours: val })}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="px-6 text-center font-bold text-emerald-600 bg-emerald-50 tabular-nums">{total.toFixed(1)}</td>
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
                      <tr key={`group-${groupIdx}`} className="bg-slate-50 text-slate-700 h-10 border-b border-slate-200 text-xs font-semibold">
                        <td colSpan={2} className="px-8 text-left sticky left-0 z-20 bg-slate-50">{group.label} SİNİF KOMPLEKTLƏRİ ÜZRƏ:</td>
                        <td className="px-4 text-center tabular-nums text-slate-500">{gt.studentCount}</td>
                        <td className="px-4 text-center tabular-nums text-slate-500">{gt.classCount}</td>
                        <td className="px-6 text-center tabular-nums text-slate-900">{n(gt.plan)}</td>
                        {SPLIT_KEYS.map(k => (
                          <td key={k} className="px-2 text-center tabular-nums text-slate-400">{n(gt.splitBySubject?.[k])}</td>
                        ))}
                        <td className="px-6 text-center tabular-nums text-slate-900">{n(gt.split)}</td>
                        <td className="px-6 text-center tabular-nums bg-slate-200/50">{(gt.plan + gt.split).toFixed(1)}</td>
                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.extra)}</td>
                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.indiv)}</td>
                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.home)}</td>
                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.special)}</td>
                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.club)}</td>
                        <td className="px-6 text-center tabular-nums font-bold text-indigo-700 bg-indigo-50/50">{gt.total.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Footer: CƏMİ (Dərnəksiz) */}
            <tr className="bg-slate-100/80 text-slate-800 h-12 font-bold border-t-2 border-slate-200">
              <td colSpan={2} className="px-8 text-left text-sm sticky left-0 z-30 bg-slate-100/80">CƏMİ (Dərnəksiz):</td>
              <td className="px-4 text-center tabular-nums">{grandTotal.studentCount}</td>
              <td className="px-4 text-center tabular-nums">{grandTotal.classCount}</td>
              <td className="px-6 text-center tabular-nums">{n(grandTotal.plan)}</td>
              {SPLIT_KEYS.map((k, idx) => {
                const groupSplit = (Object.values(levelTotals) as LevelTotal[]).reduce((a, lt) => a + (lt.splitBySubject?.[k] || 0), 0);
                return <td key={idx} className="px-2 text-center tabular-nums opacity-50">{n(groupSplit)}</td>;
              })}
              <td className="px-6 text-center tabular-nums">{nn(grandTotal.split)}</td>
              <td className="px-6 text-center tabular-nums">{(grandTotal.plan + grandTotal.split).toFixed(1)}</td>
              <td className="px-4 text-center tabular-nums">{n(grandTotal.extra)}</td>
              <td className="px-4 text-center tabular-nums">{n(grandTotal.indiv)}</td>
              <td className="px-4 text-center tabular-nums">{n(grandTotal.home)}</td>
              <td className="px-4 text-center tabular-nums">{n(grandTotal.special)}</td>
              <td className="px-4 text-center tabular-nums">—</td>
              <td className="px-6 text-center text-base bg-slate-200/50 text-slate-900 tabular-nums font-bold">
                {(grandTotal.total - (grandTotal.club || 0)).toFixed(1)}
              </td>
            </tr>

            {/* Footer: DƏRNƏK SAATLARI */}
            <tr className="bg-amber-50/80 text-amber-800 h-10 font-medium border-t border-amber-100">
              <td colSpan={2} className="px-8 text-left text-xs sticky left-0 z-30 bg-amber-50/80">Dərnək məşğələləri:</td>
              <td className="px-4 text-center opacity-30">—</td>
              <td className="px-4 text-center opacity-30">—</td>
              <td className="px-6 text-center opacity-30">—</td>
              {SPLIT_KEYS.map((_, idx) => <td key={idx} className="px-2 text-center opacity-30">—</td>)}
              <td className="px-6 text-center opacity-30">—</td>
              <td className="px-6 text-center opacity-30">—</td>
              <td className="px-4 text-center opacity-30">—</td>
              <td className="px-4 text-center opacity-30">—</td>
              <td className="px-4 text-center opacity-30">—</td>
              <td className="px-4 text-center opacity-30">—</td>
              <td className="px-4 text-center font-semibold tabular-nums border-x border-amber-200 bg-amber-100/50">{n(grandTotal.club)}</td>
              <td className="px-6 text-center text-sm bg-amber-100 text-amber-900 tabular-nums font-bold">{n(grandTotal.club)}</td>
            </tr>

            {/* Footer: ÜMUMİ YEKUN CƏM */}
            <tr className="bg-slate-800 text-white h-14 shadow-lg relative z-20 font-bold tracking-wide">
              <td colSpan={2} className="px-8 text-left text-sm sticky left-0 z-30 bg-slate-800 border-r border-slate-700">ÜMUMİ YEKUN CƏM:</td>
              <td className="px-4 text-center text-lg tabular-nums">{grandTotal.studentCount}</td>
              <td className="px-4 text-center text-lg tabular-nums">{grandTotal.classCount}</td>
              <td className="px-6 text-center text-lg tabular-nums opacity-90">{n(grandTotal.plan)}</td>
              {SPLIT_KEYS.map((k, idx) => {
                const groupSplit = (Object.values(levelTotals) as LevelTotal[]).reduce((a, lt) => a + (lt.splitBySubject?.[k] || 0), 0);
                return <td key={idx} className="px-2 text-center tabular-nums opacity-50">{n(groupSplit)}</td>;
              })}
              <td className="px-6 text-center tabular-nums opacity-75">{nn(grandTotal.split)}</td>
              <td className="px-6 text-center tabular-nums opacity-80">{(grandTotal.plan + grandTotal.split).toFixed(1)}</td>
              <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.extra)}</td>
              <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.indiv)}</td>
              <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.home)}</td>
              <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.special)}</td>
              <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.club)}</td>
              <td className="px-6 text-center text-2xl bg-indigo-600 text-white tabular-nums font-black shadow-inner border-l border-indigo-500/50">
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
