import React from 'react';
import { Calculator } from 'lucide-react';
import { SubjectRow, SPEC_IDS } from '../hooks/useSubjectVacancies';

interface SubjectVacanciesStatsTableProps {
  rows: SubjectRow[];
  grandStats: {
    totalSelected: number;
    totalAssigned: number;
    vacancy: number;
  };
  getRowSum: (row: SubjectRow) => number;
}

export const SubjectVacanciesStatsTable: React.FC<SubjectVacanciesStatsTableProps> = ({
  rows,
  grandStats,
  getRowSum
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-premium p-6 border border-slate-200/60 flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-slate-100 rounded-2xl">
          <Calculator className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Ümumi Statistika</h3>
          <p className="text-xs text-slate-500">Bütün təhsil növləri üzrə yekun fənn yükü və vakansiya</p>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-2xl border border-slate-200/60 shadow-sm">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
          <tr className="bg-slate-50 relative text-slate-500 text-xs font-semibold border-b border-slate-200">
            <th className="px-5 py-3 text-left w-1/4">Təhsil Növü</th>
            <th className="px-4 py-3 text-center">Plan Saatlar</th>
            <th className="px-4 py-3 text-center">Təyin Edilib</th>
            <th className="px-4 py-3 text-center">Vakant</th>
            <th className="px-4 py-3 text-center">Yerinə Yetirilmə (%)</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { id: 'umumi_plus_extra', label: 'Ümumi / Məşğələ', icon: '🏫', ids: [null, 0, SPEC_IDS.EXTRACURRICULAR], exclude: [SPEC_IDS.CLUB] },
              { id: 'ferdi', label: 'Fərdi', icon: '👤', eduType: 'ferdi' },
              { id: 'evde', label: 'Evdə', icon: '🏠', eduType: 'evde' },
              { id: 'xususi', label: 'Xüsusi', icon: '🌟', eduType: 'xususi' },
              { id: 'dernek', label: 'Dərnək', icon: '🎭', ids: [SPEC_IDS.CLUB] },
            ].map((config: any) => {
              const catRows = rows.filter(r => {
                if (config.id === 'umumi_plus_extra') {
                  return r.educationType === 'umumi' && r.subjectId !== SPEC_IDS.CLUB;
                }
                if (config.ids) {
                  return config.ids.includes(r.subjectId);
                }
                return r.educationType === config.eduType;
              });
              const tSel = catRows.reduce((a, r) => a + getRowSum(r), 0);
              const tAss = catRows.reduce((a, r) => a + r.assignedHours, 0);
              const vac = tSel - tAss;
              return (
                <tr key={config.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3 font-medium flex items-center gap-3">
                    <span className="text-xl">{config.icon}</span>
                    <span className="text-slate-700">{config.label}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 tabular-nums">{tSel.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center font-medium text-emerald-600 tabular-nums">{tAss.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center font-medium text-amber-600 tabular-nums">
                    {vac.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 tabular-nums">
                    {tSel > 0 ? ((tAss / tSel) * 100).toFixed(0) + '%' : '0%'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 text-slate-800 font-semibold border-t-2 border-slate-200">
              <td className="px-5 py-4">Cəmi Ümumi</td>
              <td className="px-4 py-4 text-center tabular-nums">{grandStats.totalSelected.toFixed(1)}</td>
              <td className="px-4 py-4 text-center text-emerald-600 tabular-nums">{grandStats.totalAssigned.toFixed(1)}</td>
              <td className="px-4 py-4 text-center text-amber-600 tabular-nums">{grandStats.vacancy.toFixed(1)}</td>
              <td className="px-4 py-4 text-center tabular-nums">
                {grandStats.totalSelected > 0 ? ((grandStats.totalAssigned / grandStats.totalSelected) * 100).toFixed(0) + '%' : '0%'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
