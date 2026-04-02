/**
 * CurriculumTab Component
 *
 * Displays and manages curriculum subjects for a grade with features:
 * - Tab-based navigation per education type (Ümumi / Fərdi / Evdə / Xüsusi)
 * - Add/Edit/Delete subject functionality per tab
 * - Teacher assignment
 * - Statistics display
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit, BookOpen, Users, Clock, ArrowUp, ArrowDown, Filter, LayoutDashboard } from 'lucide-react';
import curriculumService from '../../services/curriculumService';
import type { GradeSubject, CurriculumMeta, CurriculumStatistics as ICurriculumStatistics, EducationType } from '../../types/curriculum';
import { EDUCATION_TYPE_LABELS } from '../../types/curriculum';
import AddSubjectModal from './AddSubjectModal';
import EditSubjectModal from './EditSubjectModal';
import CurriculumStatistics from './CurriculumStatistics';

interface CurriculumTabProps {
  gradeId: number;
  gradeName: string;
  onUpdate?: () => void;
  categoryLimits?: Record<number, any>;
}

type SortField = 'name' | 'weekly_hours' | null;
type SortDirection = 'asc' | 'desc';

const EDUCATION_TABS: { type: EducationType; label: string }[] = [
  { type: 'umumi',  label: 'Ümumi' },
  { type: 'ferdi',  label: 'Fərdi' },
  { type: 'evde',   label: 'Evdə' },
  { type: 'xususi', label: 'Xüsusi' },
];

const CurriculumTab: React.FC<CurriculumTabProps> = ({ gradeId, gradeName, onUpdate, categoryLimits }) => {
  const [subjects, setSubjects] = useState<GradeSubject[]>([]);
  const [meta, setMeta] = useState<CurriculumMeta | null>(null);
  const [statistics, setStatistics] = useState<ICurriculumStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<GradeSubject | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Active education type tab
  const [activeType, setActiveType] = useState<EducationType>('umumi');

  // Sort states
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter by activity type
  const [filterActivityType, setFilterActivityType] = useState<'all' | 'teaching' | 'extracurricular' | 'club'>('all');

  const loadCurriculum = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await curriculumService.getCurriculumSubjects(gradeId);
      setSubjects(data.subjects || []);
      setMeta(data.meta);
    } catch (err: any) {
      console.error('Error loading curriculum:', err);
      setError(err.response?.data?.message || 'Tədris planı yüklənərkən xəta baş verdi');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

  const loadStatistics = useCallback(async () => {
    try {
      const stats = await curriculumService.getCurriculumStatistics(gradeId);
      setStatistics(stats);
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  }, [gradeId]);

  useEffect(() => {
    void Promise.all([loadCurriculum(), loadStatistics()]);
  }, [loadCurriculum, loadStatistics]);

  const handleAddSuccess = (isContinuous?: boolean) => {
    loadCurriculum();
    loadStatistics();
    if (!isContinuous) {
      setIsAddModalOpen(false);
    }
    onUpdate?.();
  };

  const handleEditSuccess = () => {
    loadCurriculum();
    loadStatistics();
    setEditingSubject(null);
    onUpdate?.();
  };

  const handleDelete = async (gradeSubjectId: number, subjectName: string) => {
    if (!confirm(`"${subjectName}" fənnini tədris planından silmək istədiyinizə əminsiniz?`)) return;
    try {
      setDeletingId(gradeSubjectId);
      await curriculumService.removeSubjectFromCurriculum(gradeId, gradeSubjectId);
      loadCurriculum();
      loadStatistics();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      alert(err.response?.data?.message || 'Fənn silinərkən xəta baş verdi');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Count subjects per education type for tab badges
  const countByType = useMemo(() => {
    const counts: Record<EducationType, number> = { umumi: 0, ferdi: 0, evde: 0, xususi: 0 };
    subjects.forEach(s => {
      const t = (s.education_type || 'umumi') as EducationType;
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [subjects]);

  // Filtered + sorted subjects for the active tab
  const filteredSubjects = useMemo(() => {
    let list = subjects.filter(s => (s.education_type || 'umumi') === activeType);

    if (filterActivityType !== 'all') {
      list = list.filter(s => {
        switch (filterActivityType) {
          case 'teaching':      return s.is_teaching_activity;
          case 'extracurricular': return s.is_extracurricular;
          case 'club':          return s.is_club;
          default:              return true;
        }
      });
    }

    if (sortField === 'name') {
      list = [...list].sort((a, b) => {
        const aVal = a.subject_name.toLowerCase();
        const bVal = b.subject_name.toLowerCase();
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    } else if (sortField === 'weekly_hours') {
      list = [...list].sort((a, b) =>
        sortDirection === 'asc' ? a.weekly_hours - b.weekly_hours : b.weekly_hours - a.weekly_hours
      );
    }

    return list;
  }, [subjects, activeType, filterActivityType, sortField, sortDirection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Kurikulum yüklənir...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <button onClick={loadCurriculum} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
          Yenidən cəhd et
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Upper Section */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Tədris Planı İdarəetməsi</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {meta?.grade_name || gradeName}
              </span>
              <span className="text-[11px] font-medium text-slate-400">| {EDUCATION_TYPE_LABELS[activeType]}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 font-medium"
        >
          <Plus className="h-5 w-5" />
          Yeni Fənn Əlavə Et
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left: Subjects Table */}
        <div className="lg:col-span-9 flex flex-col min-h-0 bg-white rounded-xl border shadow-sm overflow-hidden">

          {/* Education Type Tab Bar */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            {EDUCATION_TABS.map(tab => {
              const isActive = activeType === tab.type;
              const count = countByType[tab.type];
              return (
                <button
                  key={tab.type}
                  onClick={() => setActiveType(tab.type)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
                    isActive
                      ? 'border-primary text-primary bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px] text-center font-black ${
                      isActive ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Table Header */}
          <div className="p-4 border-b bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm text-gray-700 uppercase tracking-tight">
                {EDUCATION_TYPE_LABELS[activeType]}
              </span>
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-black">
                {filteredSubjects.length} QEYD
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterActivityType}
                onChange={(e) => setFilterActivityType(e.target.value as typeof filterActivityType)}
                className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer text-slate-600"
              >
                <option value="all">Fəaliyyət növü (Hamısı)</option>
                <option value="teaching">📘 Dərs</option>
                <option value="extracurricular">🌟 Dərsdənkənar məşğələ</option>
                <option value="club">🎭 Dərnək</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {filteredSubjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center opacity-60">
                <BookOpen className="h-16 w-16 mb-4 text-muted-foreground" />
                <h4 className="text-xl font-medium">Bu proqram üzrə fənn yoxdur</h4>
                <p className="max-w-xs mx-auto mt-2 text-sm">
                  {EDUCATION_TYPE_LABELS[activeType]} proqramı üçün hələ heç bir fənn əlavə edilməyib.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all"
                >
                  <Plus className="h-4 w-4" /> Fənn Əlavə Et
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b z-20 shadow-sm shadow-slate-100">
                  <tr className="bg-slate-50/30">
                    <th
                      className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Fənn {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th
                      className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSort('weekly_hours')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Həft. saat {sortField === 'weekly_hours' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hesab. saat</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fəaliyyət növü</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bölünmə</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İdarəetmə</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-800 text-sm tracking-tight">{s.subject_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">{s.subject_code}</div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-black shadow-sm">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {s.weekly_hours}{s.weekly_hours > 0 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {s.is_split_groups && s.group_count > 1 ? (
                          <span className="text-xs font-bold text-slate-600">
                            {s.weekly_hours}×{s.group_count}={s.calculated_hours}{s.calculated_hours > 0 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-600">{s.calculated_hours}{s.calculated_hours > 0 ? 's' : ''}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {s.is_teaching_activity && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase border border-blue-100">Dərs</span>
                          )}
                          {s.is_extracurricular && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded uppercase border border-emerald-100">Məşğələ</span>
                          )}
                          {s.is_club && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded uppercase border border-indigo-100">Dərnək</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {s.is_split_groups ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded uppercase border border-amber-100">
                            <Users className="h-3 w-3" />
                            {s.group_count} QRUP
                          </div>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingSubject(s)}
                            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Redaktə et"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.subject_name)}
                            disabled={deletingId === s.id}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Statistics */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <CurriculumStatistics
            subjects={subjects}
            title="Ümumi Tədris Planı"
          />
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Filter className="h-3 w-3" /> Info
            </h4>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              Hər təhsil proqramı üzrə fənnlər ayrı tablarda göstərilir.
              Redaktə etmək üçün qələm ikonuna klikləyin.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddSubjectModal
          gradeId={gradeId}
          gradeName={gradeName}
          initialEducationType={activeType}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
          categoryLimits={categoryLimits}
          currentSubjects={subjects}
        />
      )}

      {editingSubject && (
        <EditSubjectModal
          gradeId={gradeId}
          gradeName={gradeName}
          gradeSubject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onSuccess={handleEditSuccess}
          categoryLimits={categoryLimits}
          currentSubjects={subjects}
        />
      )}
    </div>
  );
};

export default CurriculumTab;
