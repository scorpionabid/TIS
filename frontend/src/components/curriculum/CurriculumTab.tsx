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
import { Plus, Trash2, Edit, BookOpen, Users, Clock, ArrowUpDown, ArrowUp, ArrowDown, Filter, LayoutDashboard } from 'lucide-react';
import curriculumService from '../../services/curriculumService';
import type { GradeSubject, CurriculumMeta, CurriculumStatistics as ICurriculumStatistics } from '../../types/curriculum';
import AddSubjectModal from './AddSubjectModal';
import EditSubjectModal from './EditSubjectModal';
import CurriculumStatistics from './CurriculumStatistics';
import { Card, CardContent } from '@/components/ui/card';

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
  const [statistics, setStatistics] = useState<ICurriculumStatistics | null>(null);
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
      setError(err.response?.data?.message || 'Tədris planı yüklənərkən xəta baş verdi');
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
    if (!confirm(`"${subjectName}" fənnini tədris planından silmək istədiyinizə əminsiniz?`)) {
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
    <div className="flex flex-col h-full space-y-6">
      {/* Upper Section: Stats Overview */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Tədris Planı İdarəetməsi</h3>
            <p className="text-sm text-muted-foreground">
              {meta?.grade_name ? `${meta.grade_name} sinfi üçün tədris planı` : gradeName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 font-medium"
          >
            <Plus className="h-5 w-5" />
            Yeni Fənn Əlavə Et
          </button>
        </div>
      </div>

      {/* Main Content Area: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left Side: Subjects Table (8/12) */}
        <div className="lg:col-span-9 flex flex-col min-h-0 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold text-gray-700">Tədris Planındakı Fənnlər</span>
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                {filteredAndSortedSubjects.length} fənn
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterActivityType}
                onChange={(e) => setFilterActivityType(e.target.value as any)}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
              >
                <option value="all">Fəaliyyət növü (Hamısı)</option>
                <option value="teaching">📘 Dərs</option>
                <option value="extracurricular">🌟 Dərsdənkənar məşğələ</option>
                <option value="club">🎭 Dərnək</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {!subjects || subjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center opacity-60">
                <BookOpen className="h-16 w-16 mb-4 text-muted-foreground" />
                <h4 className="text-xl font-medium">Tədris planı boşdur</h4>
                <p className="max-w-xs mx-auto mt-2">Bu sinfə hələ heç bir fənn əlavə edilməyib.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-2">
                        Fənn {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('weekly_hours')}>
                      <div className="flex items-center gap-2">
                        Saat {sortField === 'weekly_hours' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Fəaliyyət</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Bölünmə</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAndSortedSubjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{subject.subject_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{subject.subject_code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-bold">
                          <Clock className="h-3.5 w-3.5" />
                          {subject.formatted_hours}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {subject.is_teaching_activity && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Dərs</span>
                          )}
                          {subject.is_extracurricular && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Dərsdənkənar məşğələ</span>
                          )}
                          {subject.is_club && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase">Dərnək</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {subject.is_split_groups ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">
                            <Users className="h-3 w-3" />
                            {subject.group_count} Qrup
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingSubject(subject)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Düzəliş et"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(subject.id, subject.subject_name)}
                            disabled={deletingId === subject.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
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

        {/* Right Side: Statistics (4/12) */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2">
          <CurriculumStatistics subjects={subjects} />
        </div>
      </div>

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
