/**
 * AddSubjectModal Component
 *
 * Modal for adding a new subject to grade curriculum with:
 * - Subject selection from available subjects
 * - Weekly hours configuration (1-10)
 * - Activity type checkboxes (Teaching, Extracurricular, Club)
 * - Group splitting with count selection (1-4)
 * - Automatic hour calculation display
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, AlertCircle, BookOpen, Clock } from 'lucide-react';
import curriculumService from '../../services/curriculumService';
import type { AvailableSubject, CreateGradeSubjectDTO, GradeSubjectFormData, EducationType } from '../../types/curriculum';
import { defaultGradeSubjectFormData, WEEKLY_HOURS_OPTIONS, GROUP_COUNT_OPTIONS, EDUCATION_TYPE_LABELS } from '../../types/curriculum';
import { SubjectSelector, SubjectOption } from './SubjectSelector';

interface AddSubjectModalProps {
  gradeId: number;
  gradeName: string;
  onClose: () => void;
  onSuccess: (isContinuous?: boolean) => void;
  initialEducationType?: EducationType;
  categoryLimits?: Record<number, any>;
  currentSubjects?: any[];
}

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  gradeId,
  gradeName,
  onClose,
  onSuccess,
  initialEducationType,
  categoryLimits,
  currentSubjects = [],
}) => {
  const [formData, setFormData] = useState<GradeSubjectFormData>({
    ...defaultGradeSubjectFormData,
    education_type: initialEducationType || 'umumi'
  });
  const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAvailableSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const subjects = await curriculumService.getAvailableSubjects(gradeId, formData.education_type);
      setAvailableSubjects(subjects);
    } catch (err: any) {
      console.error('Error loading available subjects:', err);
      setError('Mövcud fənnlər yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  }, [gradeId, formData.education_type]);

  useEffect(() => {
    void loadAvailableSubjects();
  }, [loadAvailableSubjects]);

  // Scroll to top when modal opens
  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, []);

  const getCategoryBudgetInfo = () => {
    if (!categoryLimits) return null;
    const levelMatch = gradeName.match(/^(\d+)/);
    const level = levelMatch ? Number(levelMatch[1]) : 0;
    const levelLimits = categoryLimits[level];
    if (!levelLimits) return null;

    let category: 'plan' | 'extra' | 'club' | 'ferdi' | 'evde' | 'xususi' = 'plan';
    if (formData.education_type === 'ferdi') category = 'ferdi';
    else if (formData.education_type === 'evde') category = 'evde';
    else if (formData.education_type === 'xususi') category = 'xususi';
    else if (formData.is_club) category = 'club';
    else if (formData.is_extracurricular) category = 'extra';

    const limit = Number(levelLimits[category]) || 0;
    const used = currentSubjects
      .filter(s => {
        if (formData.education_type !== s.education_type) return false;
        if (category === 'club') return s.is_club;
        if (category === 'extra') return s.is_extracurricular;
        if (category === 'plan') return s.is_teaching_activity;
        return true;
      })
      .reduce((acc, s) => acc + (Number(s.weekly_hours) || 0), 0);

    return { category, limit, used, remaining: Math.max(0, limit - used) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const selectedSubj = getSelectedSubject();
    const budget = getCategoryBudgetInfo();

    if (selectedSubj && formData.weekly_hours > selectedSubj.weekly_hours) {
      setError(`HƏDİNDƏN ARTIQ SAAT: Master Planda bu fənn üçün limit ${selectedSubj.weekly_hours} saatdır.`);
      return;
    }

    if (budget && formData.weekly_hours > budget.remaining) {
      setError(`KATEQORİYA LİMİTİ AŞILIB: Bu kateqoriya üçün qalan limit ${budget.remaining} saatdır.`);
      return;
    }

    if (!formData.subject_id) {
      setError('Fənn seçilməlidir');
      return;
    }

    const dto: CreateGradeSubjectDTO = {
      subject_id: formData.subject_id,
      education_type: formData.education_type,
      weekly_hours: formData.weekly_hours,
      is_teaching_activity: formData.is_teaching_activity,
      is_extracurricular: formData.is_extracurricular,
      is_club: formData.is_club,
      is_split_groups: formData.is_split_groups,
      group_count: formData.group_count,
      teacher_id: formData.teacher_id || null,
      notes: formData.notes || null,
    };

    const validation = curriculumService.validateSubjectData(dto);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setSubmitting(true);
      await curriculumService.addSubjectToCurriculum(gradeId, dto);
      setFormData(defaultGradeSubjectFormData);
      setError(null);
      onSuccess(true);
    } catch (err: any) {
      console.error('Error adding subject:', err);
      // Laravel validation errors object check
      const validationErrors = err.response?.data?.errors;
      let errorMsg = 'Fənn əlavə edilərkən xəta baş verdi';
      
      if (validationErrors) {
        errorMsg = Object.values(validationErrors).flat().join(', ');
      } else {
        errorMsg = err.response?.data?.error || err.response?.data?.message || errorMsg;
      }
      
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotalHours = () => {
    return curriculumService.calculateTotalHours(formData.weekly_hours, formData.group_count);
  };

  const getSelectedSubject = () => {
    return availableSubjects.find((s) => s.id === formData.subject_id);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-black/5">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Fənn Əlavə Et</h2>
              <p className="text-sm font-medium text-slate-400">{gradeName} sinfi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
            {error && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 mb-4">
                <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-sm font-semibold text-rose-800 leading-snug">{error}</p>
              </div>
            )}

            {(() => {
              const selSubj = getSelectedSubject();
              if (selSubj && formData.weekly_hours > selSubj.weekly_hours) {
                return (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 mb-4">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-black text-amber-800 uppercase tracking-tighter">LİMİT AŞILIB!</p>
                        <p className="text-[11px] font-bold text-amber-700 leading-tight">
                        Bu fənn üçün Master Planda <b>{selSubj.weekly_hours} saat</b> təyin edilib. 
                        Siz <b>{formData.weekly_hours} saat</b> yazmağa çalışırsınız.
                        </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-100 border-t-indigo-600"></div>
                <span className="text-xs font-bold text-slate-400">Yüklənir...</span>
              </div>
            ) : !availableSubjects || availableSubjects.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center">
                <p className="text-sm font-bold text-slate-600">Bu sinif üçün bütün fənlər artıq kurikulumda var.</p>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg shadow-indigo-100">
                  Bağla
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in transition-all duration-300">
                {/* Row 1: Program & Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Təhsil Proqramı</label>
                    <select
                      value={formData.education_type}
                      onChange={(e) => {
                        setFormData({ ...formData, education_type: e.target.value as EducationType, subject_id: null });
                        setError(null);
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="umumi">Ümumi təhsil</option>
                      <option value="ferdi">Fərdi təhsil</option>
                      <option value="evde">Evdə təhsil</option>
                      <option value="xususi">Xüsusi təhsil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Həftəlik Saat 
                      {(() => {
                        const budget = getCategoryBudgetInfo();
                        if (budget) {
                          return <span className="ml-2 text-indigo-500">(Limit: {budget.remaining})</span>;
                        }
                        return null;
                      })()}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={0.5}
                        min={0.5}
                        max={10}
                        value={formData.weekly_hours}
                        onChange={(e) => setFormData({ ...formData, weekly_hours: Number(e.target.value) })}
                        className="w-full h-10 px-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 uppercase pointer-events-none">saat</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Subject */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fənn Seçimi</label>
                  <SubjectSelector
                    subjects={availableSubjects.map((s): SubjectOption => ({
                      id: s.id,
                      name: s.name,
                      code: s.code,
                      category: s.category,
                      weekly_hours: s.weekly_hours,
                    }))}
                    value={formData.subject_id}
                    onChange={(id) => setFormData({ ...formData, subject_id: id || 0 })}
                    placeholder="Bir fənn axtarın..."
                  />
                </div>

                {/* Row 3: Activity Types */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fəaliyyət Növü</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'teaching', label: 'Dərs', checked: formData.is_teaching_activity },
                      { id: 'extra', label: 'Məşğələ', checked: formData.is_extracurricular },
                      { id: 'club', label: 'Dərnək', checked: formData.is_club }
                    ].map((activity) => (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          is_teaching_activity: activity.id === 'teaching',
                          is_extracurricular: activity.id === 'extra',
                          is_club: activity.id === 'club'
                        })}
                        className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all border-2 ${
                          activity.checked
                            ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {activity.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 4: Grouping & Total */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className={`p-3 rounded-xl border transition-all ${
                    formData.is_split_groups ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.is_split_groups}
                        onChange={(e) => setFormData({
                          ...formData,
                          is_split_groups: e.target.checked,
                          group_count: e.target.checked ? 2 : 1
                        })}
                        className="w-4 h-4 rounded text-indigo-500 focus:ring-offset-0 focus:ring-0"
                      />
                      <span className="text-xs font-bold">Qruplara bölünür</span>
                    </label>
                    {formData.is_split_groups && (
                      <div className="mt-3 flex gap-1.5 animate-in slide-in-from-top-1">
                        {[2, 3, 4].map(count => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setFormData({ ...formData, group_count: count })}
                            className={`flex-1 h-7 rounded-lg text-[10px] font-black tracking-tight transition-all ${
                              formData.group_count === count 
                                ? 'bg-white text-indigo-700 shadow-sm' 
                                : 'bg-indigo-500/30 text-white/70 hover:bg-indigo-500/50'
                            }`}
                          >
                            {count} QRUP
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-slate-300"
                    placeholder="Fənn üçün əlavə qeydlər..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 font-bold text-xs hover:text-slate-700 transition-colors uppercase tracking-widest">
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={submitting || loading || !availableSubjects || availableSubjects.length === 0}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-40 select-none"
              >
                {submitting ? 'Saxlanılır...' : 'Yadda Saxla'}
              </button>
          </div>
        </form>
      </div>
    </div>

  );
};

export default AddSubjectModal;
