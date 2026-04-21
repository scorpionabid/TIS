import React from 'react';
import { Trash2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { SubjectRow, CLASS_LEVELS, EducationType } from '../hooks/useSubjectVacancies';

interface SubjectVacanciesTableProps {
  rows: SubjectRow[];
  allSubjects: any[];
  activeLevels: (string | number)[];
  currentEducationType: EducationType;
  isLocked: boolean;
  onCellChange: (rowId: string, level: string | number, value: string) => void;
  onDeleteRow: (row: SubjectRow) => void;
  onAddSubject: (subjectId: number) => void;
  specialtyRows: SubjectRow[];
  getRowSum: (row: SubjectRow) => number;
  totalStats: { totalSelected: number; vacancy: number };
}

const SPEC_IDS = { EXTRACURRICULAR: 56, CLUB: 57 };

export const SubjectVacanciesTable: React.FC<SubjectVacanciesTableProps> = ({
  rows,
  allSubjects,
  activeLevels,
  currentEducationType,
  isLocked,
  onCellChange,
  onDeleteRow,
  onAddSubject,
  specialtyRows,
  getRowSum,
  totalStats
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-slate-200/60">
      <div className="overflow-x-auto relative scrollbar-premium">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold">
              <th className="px-5 py-3 text-slate-600 sticky left-0 bg-slate-50/90 z-10 w-52 shadow-sm font-black">FƏNN ADI</th>
              {activeLevels.map(lvl => (
                <th key={lvl} className={cn(
                  "px-2 py-3 text-center w-14",
                  lvl === 'MH' ? "text-indigo-600 font-black bg-indigo-50/20" : "text-slate-500"
                )}>{lvl}</th>
              ))}
              <th className="px-3 py-3 text-blue-600 text-center w-20 bg-blue-50/30 font-black">CƏMİ</th>
              <th className="px-3 py-3 text-orange-600 text-center w-20 bg-orange-50/30 font-black">VAKANT</th>
              <th className="px-2 py-3 text-slate-500 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <AnimatePresence mode='popLayout'>
              {rows.map((row) => {
                const sum = getRowSum(row);
                const vacant = sum - row.assignedHours;
                return (
                  <motion.tr 
                    key={row.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-5 py-3 font-medium text-slate-700 sticky left-0 bg-white/95 group-hover:bg-slate-50 transition-colors z-10 shadow-sm">
                      <span className="truncate">{row.subjectName}</span>
                    </td>
                    {activeLevels.map(lvl => (
                      <td key={lvl} className={cn("p-1 text-center relative", row.groupCount > 1 ? "bg-amber-50/20" : "")}>
                        <input 
                          type="number"
                          step="0.5"
                          className={cn(
                            "w-11 h-7 text-center text-[11px] bg-slate-100 border border-transparent rounded-md focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all tabular-nums",
                            row.hours[lvl] && Number(row.hours[lvl]) > 0 ? "text-blue-700 font-semibold" : "text-slate-400"
                          )}
                          value={row.hours[lvl] ?? ''}
                          onChange={(e) => onCellChange(row.id, lvl, e.target.value)}
                          placeholder="0"
                          disabled={isLocked}
                        />
                        {row.groupCount > 1 && row.hours[lvl] && Number(row.hours[lvl]) > 0 && (
                          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1 rounded-bl-md shadow-sm z-10">
                            x{row.groupCount}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center font-bold text-blue-600 bg-blue-50/5 tabular-nums">
                      {sum > 0 ? `${sum.toFixed(1)}s` : '0'}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-orange-600 bg-orange-50/5 tabular-nums">
                      {vacant > 0 ? `${vacant.toFixed(1)}s` : '0'}
                    </td>
                    <td className="p-4 text-center">
                      {!isLocked && (
                        <button 
                          onClick={() => onDeleteRow(row)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>

            {/* Subject Add Control */}
            <tr className="bg-slate-50/30 border-y border-slate-100">
              <td colSpan={activeLevels.length + 4} className="px-5 py-3 text-center">
                <div className="max-w-xs mx-auto">
                  <Combobox
                    options={allSubjects
                      .filter(s => !rows.some(r => r.subjectId === s.id && r.educationType === currentEducationType))
                      .sort((a,b) => a.name.localeCompare(b.name))
                      .map(s => ({ value: s.id.toString(), label: s.name }))
                    }
                    placeholder={isLocked ? '🚫 REDAKTƏ QAPALIDIR' : '+ YENİ FƏNN ƏLAVƏ ET'}
                    searchPlaceholder="Fənn axtar..."
                    noResultsMessage="Fənn tapılmadı"
                    onChange={(val) => val && onAddSubject(Number(val))}
                    disabled={isLocked}
                  />
                </div>
              </td>
            </tr>

            {/* Fixed Specialty Rows */}
            {currentEducationType === 'umumi' && specialtyRows.map((row) => {
              const sum = getRowSum(row);
              const vacant = sum - row.assignedHours;
              return (
                <tr key={row.id} className="bg-blue-50/10 border-b border-blue-50 group">
                  <td className="px-5 py-3 font-bold text-slate-600 italic sticky left-0 bg-blue-50/30 z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                       <span className={cn(
                         "flex h-2 w-2 rounded-full",
                         row.subjectId === SPEC_IDS.CLUB ? "bg-orange-400" : "bg-blue-400"
                       )} />
                       <span>{row.subjectName}</span>
                    </div>
                  </td>
                  {activeLevels.map(lvl => (
                    <td key={lvl} className={cn("p-1 text-center relative", row.groupCount > 1 ? "bg-amber-50/20" : "")}>
                      <input 
                        type="number"
                        step="0.5"
                        className="w-11 h-7 text-center text-[11px] bg-white border border-slate-200 rounded-md focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all tabular-nums font-semibold text-blue-800"
                        value={row.hours[lvl] ?? ''}
                        onChange={(e) => onCellChange(row.id, lvl, e.target.value)}
                        placeholder="0"
                        disabled={isLocked}
                      />
                      {row.groupCount > 1 && row.hours[lvl] && Number(row.hours[lvl]) > 0 && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1 rounded-bl-md shadow-sm z-10">
                          x{row.groupCount}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center font-black text-blue-600 bg-blue-50/50 tabular-nums">{sum.toFixed(1)}s</td>
                  <td className="px-3 py-3 text-center font-black text-orange-600 bg-orange-50/50 tabular-nums">{vacant > 0 ? `${vacant.toFixed(1)}s` : '0'}</td>
                  <td></td>
                </tr>
              );
            })}
            
            {rows.length === 0 && specialtyRows.length === 0 && (
              <tr>
                <td colSpan={activeLevels.length + 4} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                    <BookOpen className="w-12 h-12 text-slate-300" />
                    <p className="text-sm text-slate-400 font-medium">Bu kateqoriya üzrə fənn əlavə edilməyib</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50/50 font-bold text-slate-700 border-t-2 border-slate-200">
                <td className="p-4 sticky left-0 bg-slate-50/50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] text-right">YEKUN:</td>
                {activeLevels.map(lvl => {
                  const allTabRows = [...rows, ...specialtyRows];
                  const colSum = allTabRows.reduce((acc, r) => acc + (Number(r.hours[lvl]) || 0), 0);
                  return (
                    <td key={lvl} className="p-4 text-center tabular-nums text-slate-500">
                      {colSum > 0 ? `${colSum.toFixed(1)}` : ''}
                    </td>
                  );
                })}
                <td className="p-4 text-center text-blue-700 bg-blue-50/50 tabular-nums">{totalStats.totalSelected}s</td>
                <td className="p-4 text-center text-orange-700 bg-orange-50/50 tabular-nums">{totalStats.vacancy}s</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
