import React, { useState, useEffect, useCallback } from 'react';
import { TeacherRatingDataTable } from './TeacherRatingDataTable';
import { TeacherStatsCards } from './TeacherStatsCards';
import { RatingActionToolbar } from './RatingActionToolbar';
import { ratingService } from '@/services/ratingService';
import { RatingItem, PaginatedResponse } from '@/types/rating';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface TeacherRatingTableTabProps {
  institutionId?: number;
  academicYearId?: number;
}

export const TeacherRatingTableTab: React.FC<TeacherRatingTableTabProps> = ({
  institutionId,
  academicYearId
}) => {
  const { toast } = useToast();
  const [data, setData] = useState<RatingItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<RatingItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [calculatingId, setCalculatingId] = useState<number | null>(null);
  const [isCalculatingAll, setIsCalculatingAll] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ field: string; order: 'asc' | 'desc' | null }>({
    field: 'overall_score',
    order: 'desc'
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadStats = useCallback(async () => {
    if (!academicYearId) return;
    try {
      setStatsLoading(true);
      const res = await ratingService.getTeacherStats({
        academic_year_id: academicYearId,
        institution_id: institutionId
      });
      setStats(res);
    } catch (error) {
      logger.error('Failed to load teacher stats', { error });
    } finally {
      setStatsLoading(false);
    }
  }, [academicYearId, institutionId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAllRatings({
        page: currentPage,
        per_page: perPage,
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'müəllim',
        status: status === 'all' ? undefined : status,
        sort_by: sortConfig.field,
        sort_order: sortConfig.order || undefined,
        search: debouncedSearchTerm || undefined
      });

      setData(response.data || []);
      setPagination(response);
    } catch (error) {
      logger.error('Failed to load teacher ratings', { error });
      toast({
        title: "Xəta",
        description: "Müəllim reytinqlərini yükləmək mümkün olmadı.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, period, institutionId, academicYearId, status, sortConfig, debouncedSearchTerm, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleCalculateItem = async (userId: number) => {
    if (!academicYearId) {
      toast({
        title: "Xəta",
        description: "Zəhmət olmasa tədris ilini seçin.",
        variant: "destructive"
      });
      return;
    }

    try {
      setCalculatingId(userId);
      await ratingService.calculateTeacher(userId, academicYearId);
      toast({
        title: "Uğurlu",
        description: "Reytinq uğurla hesablandı.",
        className: "bg-green-600 text-white"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Hesablama zamanı xəta baş verdi.",
        variant: "destructive"
      });
    } finally {
      setCalculatingId(null);
    }
  };

  const handleCalculateAll = async () => {
    if (!academicYearId) {
      toast({
        title: "Xəta",
        description: "Zəhmət olmasa tədris ilini seçin.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCalculatingAll(true);
      await ratingService.calculateAllTeachers(academicYearId, institutionId);
      toast({
        title: "Uğurlu",
        description: "Bütün müəllim reytinqləri hesablandı.",
        className: "bg-green-600 text-white"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Toplu hesablama zamanı xəta baş verdi.",
        variant: "destructive"
      });
    } finally {
      setIsCalculatingAll(false);
    }
  };

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field ? (prev.order === 'asc' ? 'desc' : 'asc') : 'desc'
    }));
    setCurrentPage(1); // Reset to first page on sort
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = data.map(item => item.id || item.user_id);
      setSelectedItems(allIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = selectedItems.length > 0
        ? data.filter(item => selectedItems.includes(item.id || item.user_id))
        : data;

      const csv = [
        ['Müəllim', 'Email', 'Müəssisə', 'Akademik', 'Müşahidə', 'Qiym.', 'Sert.', 'Olimp.', 'Mükafat', 'Bonus', 'Ümumi', 'Status'],
        ...exportData.map(item => [
          item.user?.full_name || '',
          item.user?.email || '',
          item.institution?.name || '',
          item.academic_score || 0,
          item.observation_score || 0,
          item.assessment_score || 0,
          item.certificate_score || 0,
          item.olympiad_score || 0,
          item.award_score || 0,
          item.growth_bonus || 0,
          item.overall_score || 0,
          item.status || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teacher-ratings-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting teacher ratings:', { error });
    }
  };

  const handleBulkSave = async () => {
    if (selectedItems.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(selectedItems.map(id =>
        ratingService.updateRating(id, { status: 'published' })
      ));
      toast({
        title: "Uğurlu",
        description: `${selectedItems.length} qeyd dərc edildi.`,
        className: "bg-green-600 text-white"
      });
      setSelectedItems([]);
      loadData();
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Toplu saxlama zamanı xəta baş verdi.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`${selectedItems.length} qeydi silmək istədiyinizə əminsiniz?`)) return;

    try {
      setLoading(true);
      await Promise.all(selectedItems.map(id => ratingService.deleteRating(id)));
      toast({
        title: "Uğurlu",
        description: `${selectedItems.length} qeyd silindi.`,
        className: "bg-green-600 text-white"
      });
      setSelectedItems([]);
      loadData();
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Toplu silmə zamanı xəta baş verdi.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <TeacherStatsCards stats={stats} loading={statsLoading} />

      <RatingActionToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCalculateAll={handleCalculateAll}
        onBulkSave={handleBulkSave}
        onBulkDelete={handleBulkDelete}
        onExport={handleExport}
        selectedCount={selectedItems.length}
        loading={loading || isCalculatingAll}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setCurrentPage(1);
        }}
      />

      <TeacherRatingDataTable
        data={data}
        pagination={pagination}
        onPageChange={setCurrentPage}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onCalculateItem={handleCalculateItem}
        calculatingId={calculatingId}
        onSort={handleSort}
        sortConfig={sortConfig as { field: string; order: 'asc' | 'desc' }}
      />
    </div>
  );
};
