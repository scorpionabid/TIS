import React, { useState, useEffect } from 'react';
import { ratingService } from '@/services/ratingService';
import { RatingItem, PaginatedResponse } from '@/types/rating';
import { logger } from '@/utils/logger';
import { RatingStatsCards } from './RatingStatsCards';
import { RatingActionToolbar } from './RatingActionToolbar';
import { RatingDataTable } from './RatingDataTable';
import { ManualScoreDialog } from './ManualScoreDialog';

interface SectorRatingTabProps {
  institutionId?: number;
  academicYearId?: number;
}

export const SectorRatingTab: React.FC<SectorRatingTabProps> = ({
  institutionId,
  academicYearId
}) => {
  const [data, setData] = useState<RatingItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<RatingItem> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Manual score dialog state
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualDialogItem, setManualDialogItem] = useState<RatingItem | null>(null);
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [period, institutionId, academicYearId, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAllRatings({
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'sektoradmin',
        page: currentPage,
        per_page: 15
      });

      if (response && response.data) {
        setData(response.data);
        setPagination(response);
      } else if (Array.isArray(response)) {
        setData(response);
        setPagination({
          data: response,
          current_page: 1,
          per_page: response.length,
          total: response.length,
          last_page: 1,
          path: '',
          from: 1,
          to: response.length
        });
      }
    } catch (error) {
      logger.error('Error loading sector ratings:', { error });
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAllRatings({
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'sektoradmin',
        page: currentPage,
        per_page: 15,
        force_calculate: true,
      });
      if (response && response.data) {
        setData(response.data);
        setPagination(response);
      }
    } catch (error) {
      logger.error('Error force refreshing sector ratings:', { error });
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Seçilmiş ${selectedItems.length} qeydi silmək istədiyinizdən əminsiniz?`)) return;

    try {
      setLoading(true);
      for (const rowId of selectedItems) {
        const item = data.find(d => (d.id || d.user_id) === rowId);
        if (item?.id) {
          await ratingService.deleteRating(item.id);
        }
      }
      setSelectedItems([]);
      await loadData();
      logger.info('Bulk delete completed', { count: selectedItems.length });
    } catch (error) {
      logger.error('Error in bulk delete:', { error });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const exportData = selectedItems.length > 0
        ? data.filter(item => selectedItems.includes(item.id || item.user_id))
        : filteredData;

      const csv = [
        ['Müəssisə', 'Sektor Admin', 'Email', 'Task', 'Survey', 'Təsdiq', 'Link', 'Manual', 'Manual Kateqoriya', 'Ümumi', 'Status'],
        ...exportData.map(item => [
          item.institution?.name || '',
          item.user?.full_name || '',
          item.user?.email || '',
          item.task_score || 0,
          item.survey_score || 0,
          item.approval_score || 0,
          item.link_score || 0,
          item.manual_score || 0,
          item.manual_score_category || '',
          item.overall_score || 0,
          item.status || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sector-admin-ratings-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting:', { error });
    }
  };

  // Manual score dialog handlers
  const handleManualScoreEdit = (item: RatingItem) => {
    setManualDialogItem(item);
    setManualDialogOpen(true);
  };

  const handleManualSave = async (score: number, category: string, reason: string) => {
    if (!manualDialogItem) return;

    try {
      setManualSaving(true);
      const updatePayload = {
        manual_score: score,
        manual_score_category: category,
        manual_score_reason: reason,
      };

      if (manualDialogItem.id) {
        await ratingService.updateRating(manualDialogItem.id, updatePayload);
      } else {
        await ratingService.createRating({
          ...updatePayload,
          user_id: manualDialogItem.user_id,
          institution_id: manualDialogItem.institution_id,
          academic_year_id: academicYearId || manualDialogItem.academic_year_id,
          period: manualDialogItem.period || period,
        } as Partial<RatingItem>);
      }

      setManualDialogOpen(false);
      setManualDialogItem(null);
      await loadData();
      logger.info('Manual score saved', { score, category });
    } catch (error) {
      logger.error('Error saving manual score:', { error });
    } finally {
      setManualSaving(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredData.map(item => item.id || item.user_id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return item.user?.full_name?.toLowerCase().includes(searchLower) ||
      item.user?.email?.toLowerCase().includes(searchLower) ||
      item.institution?.name?.toLowerCase().includes(searchLower);
  });

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <RatingStatsCards data={filteredData} loading={loading} />

      {/* Toolbar Actions */}
      <RatingActionToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCalculateAll={forceRefresh}
        onBulkSave={async () => {}}
        onBulkDelete={bulkDelete}
        onExport={exportToExcel}
        selectedCount={selectedItems.length}
        loading={loading}
        period={period}
        onPeriodChange={(val) => { setPeriod(val); setCurrentPage(1); }}
      />

      {/* Rating Table */}
      <RatingDataTable
        data={filteredData}
        pagination={pagination}
        onPageChange={setCurrentPage}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onManualScoreEdit={handleManualScoreEdit}
        variant="sector"
      />

      {/* Manual Score Dialog */}
      {manualDialogItem && (
        <ManualScoreDialog
          isOpen={manualDialogOpen}
          onClose={() => {
            setManualDialogOpen(false);
            setManualDialogItem(null);
          }}
          onSave={handleManualSave}
          currentScore={Number(manualDialogItem.manual_score) || 0}
          currentCategory={manualDialogItem.manual_score_category ?? ''}
          currentReason={manualDialogItem.manual_score_reason ?? ''}
          directorName={manualDialogItem.user?.full_name ?? 'Sektor Admin'}
          saving={manualSaving}
        />
      )}
    </div>
  );
};
