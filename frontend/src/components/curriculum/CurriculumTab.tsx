/**
 * CurriculumTab Component
 *
 * Displays and manages curriculum subjects for a grade with features:
 * - List of subjects with weekly hours and activity types
 * - Group splitting with automatic hour calculation
 * - Add/Edit/Delete subject functionality
 * - Teacher assignment
 * - Statistics display
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit, BookOpen, Users, Clock, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import curriculumService from '../../services/curriculumService';
import type { GradeSubject, CurriculumMeta, CurriculumStatistics } from '../../types/curriculum';
import AddSubjectModal from './AddSubjectModal';
import EditSubjectModal from './EditSubjectModal';

interface CurriculumTabProps {
  gradeId: number;
  gradeName: string;
  onUpdate?: () => void;
}

type SortField = 'name' | 'weekly_hours' | 'calculated_hours' | null;
type SortDirection = 'asc' | 'desc';

const CurriculumTab: React.FC<CurriculumTabProps> = ({ gradeId, gradeName, onUpdate }) => {
  const [subjects, setSubjects] = useState<GradeSubject[]>([]);
  const [meta, setMeta] = useState<CurriculumMeta | null>(null);
  const [statistics, setStatistics] = useState<CurriculumStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<GradeSubject | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Sort & Filter states
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterActivityType, setFilterActivityType] = useState<'all' | 'teaching' | 'extracurricular' | 'club'>('all');
  const [filterGroupSplit, setFilterGroupSplit] = useState<'all' | 'split' | 'nosplit'>('all');

  const loadCurriculum = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await curriculumService.getCurriculumSubjects(gradeId);
      setSubjects(data.subjects || []);
      setMeta(data.meta);
    } catch (err: any) {
      console.error('Error loading curriculum:', err);
      setError(err.response?.data?.message || 'Kurikulum yüklənərkən xəta baş verdi');
      setSubjects([]); // Set empty array on error
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

  const handleAddSuccess = () => {
    loadCurriculum();
    loadStatistics();
    setIsAddModalOpen(false);
    onUpdate?.();
  };

  const handleEditSuccess = () => {
    loadCurriculum();
    loadStatistics();
    setEditingSubject(null);
    onUpdate?.();
  };

  const handleDelete = async (gradeSubjectId: number, subjectName: string) => {
    if (!confirm(`"${subjectName}" fənnini kurikulumdan silmək istədiyinizə əminsiniz?`)) {
      return;
    }

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

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorted and filtered subjects
  const filteredAndSortedSubjects = useMemo(() => {
    // Guard clause: ensure subjects is a valid array
    if (!subjects || !Array.isArray(subjects)) {
      return [];
    }

    let filtered = [...subjects];

    // Apply activity type filter
    if (filterActivityType !== 'all') {
      filtered = filtered.filter(subject => {
        switch (filterActivityType) {
          case 'teaching':
            return subject.is_teaching_activity;
          case 'extracurricular':
            return subject.is_extracurricular;
          case 'club':
            return subject.is_club;
          default:
            return true;
        }
      });
    }

    // Apply group split filter
    if (filterGroupSplit !== 'all') {
      filtered = filtered.filter(subject => {
        return filterGroupSplit === 'split' ? subject.is_split_groups : !subject.is_split_groups;
      });
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'name':
            aValue = a.subject_name.toLowerCase();
            bValue = b.subject_name.toLowerCase();
            break;
          case 'weekly_hours':
            aValue = a.weekly_hours;
            bValue = b.weekly_hours;
            break;
          case 'calculated_hours':
            aValue = a.weekly_hours * a.group_count;
            bValue = b.weekly_hours * b.group_count;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [subjects, sortField, sortDirection, filterActivityType, filterGroupSplit]);

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
        <button
          onClick={loadCurriculum}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Yenidən cəhd et
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Cəmi Fənn</p>
                <p className="text-2xl font-bold text-blue-900">{statistics?.total_subjects || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            (statistics?.total_weekly_hours || 0) > 35
              ? 'bg-red-50 border-2 border-red-200'
              : (statistics?.total_weekly_hours || 0) > 30
              ? 'bg-yellow-50 border-2 border-yellow-200'
              : 'bg-green-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  (statistics?.total_weekly_hours || 0) > 35
                    ? 'text-red-600'
                    : (statistics?.total_weekly_hours || 0) > 30
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>Həftəlik Saat</p>
                <p className={`text-2xl font-bold ${
                  (statistics?.total_weekly_hours || 0) > 35
                    ? 'text-red-900'
                    : (statistics?.total_weekly_hours || 0) > 30
                    ? 'text-yellow-900'
                    : 'text-green-900'
                }`}>{statistics?.total_weekly_hours || 0}</p>
                {(statistics?.total_weekly_hours || 0) > 35 && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Maksimum limitdən çox</p>
                )}
                {(statistics?.total_weekly_hours || 0) > 30 && (statistics?.total_weekly_hours || 0) <= 35 && (
                  <p className="text-xs text-yellow-600 mt-1">⚠️ Limite yaxındır</p>
                )}
              </div>
              <Clock className={`h-8 w-8 ${
                (statistics?.total_weekly_hours || 0) > 35
                  ? 'text-red-400'
                  : (statistics?.total_weekly_hours || 0) > 30
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`} />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Hesablanmış Saat</p>
                <p className="text-2xl font-bold text-purple-900">{statistics?.total_calculated_hours || 0}</p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Qruplara Bölünən</p>
                <p className="text-2xl font-bold text-orange-900">{statistics?.split_groups_count || 0}</p>
              </div>
              <Users className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Fənnlər və Dərs Yükü</h3>
          <p className="text-sm text-gray-500 mt-1">
            {meta?.grade_name ? `${meta.grade_name} sinfi üçün kurikulum` : gradeName}
            {subjects && filteredAndSortedSubjects.length !== subjects.length && (
              <span className="ml-2 text-blue-600">
                ({filteredAndSortedSubjects.length} / {subjects.length} fənn göstərilir)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Fənn Əlavə Et
        </button>
      </div>

      {/* Filter Bar */}
      {subjects && subjects.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filtrlər</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Activity Type Filter */}
            <select
              value={filterActivityType}
              onChange={(e) => setFilterActivityType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Bütün fəaliyyət növləri</option>
              <option value="teaching">📘 Tədris fəaliyyəti</option>
              <option value="extracurricular">🌟 Dərsdənkənar</option>
              <option value="club">🎭 Dərnək</option>
            </select>

            {/* Group Split Filter */}
            <select
              value={filterGroupSplit}
              onChange={(e) => setFilterGroupSplit(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Hamısı</option>
              <option value="split">Qruplara bölünən</option>
              <option value="nosplit">Qruplara bölünməyən</option>
            </select>

            {/* Clear Filters */}
            {(filterActivityType !== 'all' || filterGroupSplit !== 'all' || sortField) && (
              <button
                onClick={() => {
                  setFilterActivityType('all');
                  setFilterGroupSplit('all');
                  setSortField(null);
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Filttrləri təmizlə
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subjects Table */}
      {!subjects || subjects.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Fənn əlavə edilməyib</h3>
          <p className="text-gray-500">Bu sinfə hələ fənn əlavə edilməyib. Yuxarıdakı "Fənn Əlavə Et" düyməsindən istifadə edin.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Fənn
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'name' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('weekly_hours')}
                  >
                    <div className="flex items-center gap-2">
                      Həftəlik Saat
                      {sortField === 'weekly_hours' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                      {sortField !== 'weekly_hours' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tədris Fəaliyyəti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dərsdənkənar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dərnək
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qrupa Bölünür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müəllim
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Əməliyyatlar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedSubjects?.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {subject.subject_name}
                          </div>
                          <div className="text-sm text-gray-500">{subject.subject_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subject.formatted_hours}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subject.is_teaching_activity ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          <span className="mr-1">📘</span> Tədris
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-400">−</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subject.is_extracurricular ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <span className="mr-1">🌟</span> Dərsdənkənar
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-400">−</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subject.is_club ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          <span className="mr-1">🎭</span> Dərnək
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-400">−</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subject.is_split_groups ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {subject.group_count} qrup
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">−</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {subject.teacher_name || (
                          <span className="text-gray-400 italic">Təyin edilməyib</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingSubject(subject)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Düzəliş et"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(subject.id, subject.subject_name)}
                          disabled={deletingId === subject.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
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
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <AddSubjectModal
          gradeId={gradeId}
          gradeName={gradeName}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {editingSubject && (
        <EditSubjectModal
          gradeId={gradeId}
          gradeName={gradeName}
          gradeSubject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default CurriculumTab;
