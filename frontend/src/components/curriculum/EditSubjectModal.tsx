/**
 * EditSubjectModal Component
 *
 * Modal for editing an existing subject in grade curriculum.
 * Similar to AddSubjectModal but for updates (subject cannot be changed).
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import curriculumService from '../../services/curriculumService';
import type { GradeSubject, UpdateGradeSubjectDTO, GradeSubjectFormData } from '../../types/curriculum';
import { WEEKLY_HOURS_OPTIONS, GROUP_COUNT_OPTIONS } from '../../types/curriculum';

interface EditSubjectModalProps {
  gradeId: number;
  gradeName: string;
  gradeSubject: GradeSubject;
  onClose: () => void;
  onSuccess: () => void;
}

const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  gradeId,
  gradeName,
  gradeSubject,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Omit<GradeSubjectFormData, 'subject_id'>>({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const dto: UpdateGradeSubjectDTO = {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Fənn Düzəlişi</h2>
            <p className="text-sm text-gray-500 mt-1">
              {gradeSubject.subject_name} - {gradeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Subject Info (Read-only) */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fənn</label>
            <p className="text-base font-semibold text-gray-900">
              {gradeSubject.subject_name}{' '}
              <span className="text-sm text-gray-500">({gradeSubject.subject_code})</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Fənn dəyişdirilə bilməz</p>
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

          {/* Activity Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Fəaliyyət Növləri
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_teaching_activity}
                  onChange={(e) =>
                    setFormData({ ...formData, is_teaching_activity: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Tədris fəaliyyəti</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_extracurricular}
                  onChange={(e) =>
                    setFormData({ ...formData, is_extracurricular: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Dərsdənkənar məşğələ</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_club}
                  onChange={(e) =>
                    setFormData({ ...formData, is_club: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Dərnək</span>
              </label>
            </div>
          </div>

          {/* Group Splitting */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={formData.is_split_groups}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_split_groups: e.target.checked,
                    group_count: e.target.checked ? Math.max(2, formData.group_count) : 1,
                  })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Qruplara bölünür</span>
            </label>

            {formData.is_split_groups && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qrup sayı
                </label>
                <select
                  value={formData.group_count}
                  onChange={(e) =>
                    setFormData({ ...formData, group_count: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">
                Hesablanmış saat yükü:
              </p>
              <p className="text-lg font-bold text-blue-700 mt-1">
                {formData.weekly_hours} saat × {formData.group_count} qrup ={' '}
                {calculateTotalHours()} saat
              </p>
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
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Əlavə qeydlər (ixtiyari)"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Yenilənir...' : 'Yadda Saxla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSubjectModal;
