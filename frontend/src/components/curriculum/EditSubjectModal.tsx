/**
 * EditSubjectModal Component
 *
 * Modal for editing an existing subject in grade curriculum.
 * Similar to AddSubjectModal but for updates (subject cannot be changed).
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Clock } from 'lucide-react';
import curriculumService from '../../services/curriculumService';
import type { GradeSubject, UpdateGradeSubjectDTO, GradeSubjectFormData, EducationType } from '../../types/curriculum';
import { WEEKLY_HOURS_OPTIONS, GROUP_COUNT_OPTIONS, EDUCATION_TYPE_LABELS } from '../../types/curriculum';

interface EditSubjectModalProps {
  gradeId: number;
  gradeName: string;
  gradeSubject: GradeSubject;
  onClose: () => void;
  onSuccess: () => void;
  categoryLimits?: Record<number, any>;
  currentSubjects?: any[];
}

const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  gradeId,
  gradeName,
  gradeSubject,
  onClose,
  onSuccess,
  categoryLimits,
  currentSubjects = [],
}) => {
  const [formData, setFormData] = useState<Omit<GradeSubjectFormData, 'subject_id'>>({
    education_type: gradeSubject.education_type || 'umumi',
    weekly_hours: gradeSubject.weekly_hours,
    is_teaching_activity: gradeSubject.is_teaching_activity,
    is_extracurricular: gradeSubject.is_extracurricular,
    is_club: gradeSubject.is_club,
    is_split_groups: gradeSubject.is_split_groups,
    group_count: gradeSubject.group_count,
    teacher_id: gradeSubject.teacher_id,
    notes: gradeSubject.notes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masterLimit, setMasterLimit] = useState<number | null>(null);

  useEffect(() => {
    const fetchLimit = async () => {
      try {
        const subjects = await curriculumService.getAvailableSubjects(gradeId, formData.education_type);
        const match = subjects.find(s => s.id === gradeSubject.subject_id);
        if (match) {
          setMasterLimit(match.weekly_hours);
        }
      } catch (err) {
        console.error("Error fetching master limit:", err);
      }
    };
    fetchLimit();
  }, [gradeId, gradeSubject.subject_id, formData.education_type]);

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
        if (s.id === gradeSubject.id) return false; // Exclude self
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

    const budget = getCategoryBudgetInfo();

    if (masterLimit !== null && formData.weekly_hours > masterLimit) {
      setError(`HƏDİNDƏN ARTIQ SAAT: Master Planda bu fənn üçün limit ${masterLimit} saatdır.`);
      return;
    }

    if (budget && formData.weekly_hours > budget.remaining) {
      setError(`KATEQORİYA LİMİTİ AŞILIB: Bu kateqoriya üçün qalan limit ${budget.remaining} saatdır.`);
      return;
    }

    const dto: UpdateGradeSubjectDTO = {
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
      await curriculumService.updateGradeSubject(gradeId, gradeSubject.id, dto);
      onSuccess();
    } catch (err: any) {
      console.error('Error updating subject:', err);
      setError(err.response?.data?.message || 'Fənn yenilənərkən xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotalHours = () => {
    return curriculumService.calculateTotalHours(formData.weekly_hours, formData.group_count);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-black/5">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Save className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Fənn Düzəlişi</h2>
              <p className="text-sm font-medium text-slate-400">
                {gradeSubject.subject_name} - {gradeName}
              </p>
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
                <p className="text-xs font-bold text-rose-800 leading-tight">{error}</p>
              </div>
            )}

            {masterLimit !== null && formData.weekly_hours > masterLimit && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 mb-4">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-black text-amber-800 uppercase tracking-tighter">LİMİT AŞILIB!</p>
                    <p className="text-[11px] font-bold text-amber-700 leading-tight">
                    Bu fənn üçün Master Planda <b>{masterLimit} saat</b> təyin edilib. 
                    Siz <b>{formData.weekly_hours} saat</b> yazmağa çalışırsınız.
                    </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Selected Subject Display */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Seçilmiş Fənn</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-800 tracking-tight">{gradeSubject.subject_name}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 border border-slate-200 rounded uppercase">Dəyişdirilə bilməz</span>
                </div>
              </div>

              {/* Row 1: Program & Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Təhsil Proqramı</label>
                  <select
                    value={formData.education_type}
                    onChange={(e) => {
                      setFormData({ ...formData, education_type: e.target.value as EducationType });
                      setError(null);
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all cursor-pointer"
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
                          return <span className="ml-2 text-amber-600">(Limit: {budget.remaining})</span>;
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
                        className="w-full h-10 px-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 uppercase pointer-events-none">saat</span>
                    </div>
                  </div>
              </div>

              {/* Row 2: Activity Types */}
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
                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {activity.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Grouping & Total */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className={`p-3 rounded-xl border transition-all ${
                  formData.is_split_groups ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-100' : 'bg-slate-50 border-slate-100 text-slate-700'
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_split_groups}
                      onChange={(e) => setFormData({
                        ...formData,
                        is_split_groups: e.target.checked,
                        group_count: e.target.checked ? Math.max(2, formData.group_count) : 1
                      })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-offset-0 focus:ring-0"
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
                              ? 'bg-white text-amber-700 shadow-sm' 
                              : 'bg-amber-400/30 text-white/70 hover:bg-amber-400/50'
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
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none placeholder:text-slate-300"
                  placeholder="Fənn üçün əlavə qeydlər..."
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 font-bold text-xs hover:text-slate-700 transition-colors uppercase tracking-widest">
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 active:scale-95 disabled:opacity-40 select-none"
              >
                {submitting ? 'Saxlanılır...' : 'Yadda Saxla'}
              </button>
          </div>
        </form>
      </div>
    </div>

  );
};

export default EditSubjectModal;
