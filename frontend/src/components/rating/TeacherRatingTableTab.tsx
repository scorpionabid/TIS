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
  const [pagination, setPagination] = useState<PaginatedResponse<RatingItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculatingId, setCalculatingId] = useState<number | null>(null);
  const [isCalculatingAll, setIsCalculatingAll] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAllRatings({
        page: currentPage,
        per_page: perPage,
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'müəllim'
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
  }, [currentPage, perPage, period, institutionId, academicYearId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const filteredData = data.filter(item =>
    item.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <TeacherStatsCards data={data} loading={loading} />

      <RatingActionToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCalculateAll={handleCalculateAll}
        onBulkSave={() => { }}
        onBulkDelete={() => { }}
        onExport={handleExport}
        selectedCount={selectedItems.length}
        loading={loading || isCalculatingAll}
      />

      <TeacherRatingDataTable
        data={filteredData}
        pagination={pagination}
        onPageChange={setCurrentPage}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onCalculateItem={handleCalculateItem}
        calculatingId={calculatingId}
      />
    </div>
  );
};
