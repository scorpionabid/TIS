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
import type { AvailableSubject, CreateGradeSubjectDTO, GradeSubjectFormData } from '../../types/curriculum';
import { defaultGradeSubjectFormData, WEEKLY_HOURS_OPTIONS, GROUP_COUNT_OPTIONS } from '../../types/curriculum';
import { SubjectSelector, SubjectOption } from './SubjectSelector';

interface AddSubjectModalProps {
  gradeId: number;
  gradeName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  gradeId,
  gradeName,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<GradeSubjectFormData>(defaultGradeSubjectFormData);
  const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAvailableSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const subjects = await curriculumService.getAvailableSubjects(gradeId);
      setAvailableSubjects(subjects);
    } catch (err: any) {
      console.error('Error loading available subjects:', err);
      setError('Mövcud fənnlər yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.subject_id) {
      setError('Fənn seçilməlidir');
      return;
    }

    const dto: CreateGradeSubjectDTO = {
      subject_id: formData.subject_id,
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
      onSuccess();
    } catch (err: any) {
      console.error('Error adding subject:', err);
      setError(err.response?.data?.message || 'Fənn əlavə edilərkən xəta baş verdi');
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Fənn Əlavə Et</h2>
            <p className="text-xs text-gray-500 mt-0.5">{gradeName} sinfi</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
               style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Yüklənir...</span>
            </div>
          ) : !availableSubjects || availableSubjects.length === 0 ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Kurikulum Tamamlandı
                  </h3>
                  <p className="text-sm text-green-700 mb-3">
                    Bu sinif üçün əlavə ediləcək fənn qalmayıb. Bütün mövcud fənnlər artıq kurikulumda var.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-100 rounded-lg px-3 py-2 w-fit">
                    <span className="font-medium">💡 Məsləhət:</span>
                    <span>Yeni fənn əlavə etmək üçün "Fənn İdarəetməsi" bölməsinə keçin</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fənn <span className="text-red-500">*</span>
                </label>
                <SubjectSelector
                  subjects={availableSubjects.map((s): SubjectOption => ({
                    id: s.id,
                    name: s.name,
                    code: s.code,
                    category: s.category,
                    weekly_hours: s.weekly_hours,
                    description: s.description,
                  }))}
                  value={formData.subject_id}
                  onChange={(subjectId) =>
                    setFormData({ ...formData, subject_id: subjectId || 0 })
                  }
                  placeholder="Fənn axtarın və ya seçin..."
                />
                {getSelectedSubject() && (
                  <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                    <span className="font-medium">Kateqoriya:</span>
                    <span className="capitalize">{getSelectedSubject()?.category}</span>
                    {getSelectedSubject()?.weekly_hours && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>Standart: {getSelectedSubject()?.weekly_hours} saat/həftə</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Weekly Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Həftəlik Dərs Yükü (saat) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.weekly_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, weekly_hours: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {WEEKLY_HOURS_OPTIONS.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour} saat
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Types - Grid Layout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Fəaliyyət Növləri
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 rounded-lg p-4">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white px-3 py-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_teaching_activity}
                      onChange={(e) =>
                        setFormData({ ...formData, is_teaching_activity: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">📘 Tədris</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white px-3 py-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_extracurricular}
                      onChange={(e) =>
                        setFormData({ ...formData, is_extracurricular: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">📝 Dərsdənkənar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white px-3 py-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_club}
                      onChange={(e) =>
                        setFormData({ ...formData, is_club: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">🎯 Dərnək</span>
                  </label>
                </div>
              </div>

              {/* Group Splitting */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={formData.is_split_groups}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_split_groups: e.target.checked,
                        group_count: e.target.checked ? 2 : 1,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Qruplara bölünür</span>
                    <p className="text-xs text-gray-600">Dərs saatı avtomatik hesablanacaq</p>
                  </div>
                </label>

                {formData.is_split_groups && (
                  <div className="ml-6 mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qrup sayı
                    </label>
                    <select
                      value={formData.group_count}
                      onChange={(e) =>
                        setFormData({ ...formData, group_count: Number(e.target.value) })
                      }
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {GROUP_COUNT_OPTIONS.map((count) => (
                        <option key={count} value={count}>
                          {count} qrup
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Calculated Hours Display */}
              {formData.is_split_groups && formData.group_count > 1 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-700">
                        Hesablanmış Saat
                      </p>
                      <p className="text-lg font-bold text-blue-900">
                        {formData.weekly_hours} × {formData.group_count} = {calculateTotalHours()} saat
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qeydlər
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Əlavə qeydlər (ixtiyari)"
                />
              </div>
            </>
          )}
          </div>

          {/* Footer - Sticky */}
          <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-5 py-3.5 rounded-b-lg sticky bottom-0">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={submitting || loading || !availableSubjects || availableSubjects.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
              >
                <Save className="h-4 w-4" />
                {submitting ? 'Əlavə edilir...' : 'Yadda Saxla'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubjectModal;
