import React, { useState, useEffect } from 'react';
import { ratingService } from '@/services/ratingService';
import { RatingItem, PaginatedResponse } from '@/types/rating';
import { logger } from '@/utils/logger';
import { RatingStatsCards } from './RatingStatsCards';
import { RatingActionToolbar } from './RatingActionToolbar';
import { RatingDataTable } from './RatingDataTable';

interface SchoolAdminRatingTabProps {
  institutionId?: number;
  academicYearId?: number;
}

interface EditingCell {
  itemId: number;
  field: 'task_score' | 'survey_score' | 'manual_score';
}

interface PendingChanges {
  [itemId: number]: Partial<Pick<RatingItem, 'task_score' | 'survey_score' | 'manual_score'>>;
}

export const SchoolAdminRatingTab: React.FC<SchoolAdminRatingTabProps> = ({
  institutionId,
  academicYearId
}) => {
  const [data, setData] = useState<RatingItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<RatingItem> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2025-01');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

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
        user_role: 'schooladmin',
        page: currentPage,
        per_page: 15
      });

      console.log('📥 [SchoolAdminRating] Response structure check:', response);

      if (response && response.data) {
        setData(response.data);
        setPagination(response);
      } else if (Array.isArray(response)) {
        setData(response);
        // Create a fake pagination object if the API returns a direct array
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
      console.error('❌ Error loading school admin ratings:', error);
      logger.error('Error loading school admin ratings:', { error });
    } finally {
      setLoading(false);
    }
  };

  const calculateRating = async (userId: number) => {
    try {
      await ratingService.calculate(userId, {
        academic_year_id: academicYearId || 1, // Fallback if undefined
        period
      });
      loadData();
    } catch (error) {
      logger.error('Error calculating rating:', { error });
    }
  };

  const calculateAllRatings = async () => {
    try {
      setLoading(true);
      await ratingService.calculateAll({
        academic_year_id: academicYearId || 1,
        period
      });
      await loadData();
    } catch (error) {
      logger.error('Error calculating all ratings:', { error });
    } finally {
      setLoading(false);
    }
  };

  const bulkSaveChanges = async () => {
    try {
      setLoading(true);
      const rowIds = Object.keys(pendingChanges);

      for (const rowIdStr of rowIds) {
        const rowId = parseInt(rowIdStr);
        const item = data.find(d => (d.id || d.user_id) === rowId);
        if (!item) continue;

        const changes = pendingChanges[rowId];
        if (item.id) {
          await ratingService.updateRating(item.id, changes);
        } else {
          await ratingService.createRating({
            ...changes,
            user_id: item.user_id,
            institution_id: item.institution_id,
            academic_year_id: item.academic_year_id,
            period: item.period
          } as any);
        }
      }

      setPendingChanges({});
      await loadData();
      logger.info('Bulk save completed', { count: rowIds.length });
    } catch (error) {
      logger.error('Error in bulk save:', { error });
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
        ['Direktor', 'Email', 'Müəssisə', 'Task', 'Survey', 'Manual', 'Ümumi', 'Status'],
        ...exportData.map(item => [
          item.user?.full_name || '',
          item.user?.email || '',
          item.institution?.name || '',
          item.task_score || 0,
          item.survey_score || 0,
          item.manual_score || 0,
          item.overall_score || 0,
          item.status || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school-admin-ratings-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting:', { error });
    }
  };

  const handleCellClick = (itemId: number, field: EditingCell['field']) => {
    setEditingCell({ itemId, field });
  };

  const handleCellChange = (rowId: number, field: EditingCell['field'], value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.min(100, Math.max(0, numValue));

    setPendingChanges(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: clampedValue
      }
    }));

    setData(prev => prev.map(item =>
      (item.id || item.user_id) === rowId ? { ...item, [field]: clampedValue } : item
    ));
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const saveChanges = async (rowId: number) => {
    const changes = pendingChanges[rowId];
    if (!changes) return;

    const item = data.find(d => (d.id || d.user_id) === rowId);
    if (!item) return;

    try {
      setSavingId(rowId);
      if (item.id) {
        await ratingService.updateRating(item.id, changes);
      } else {
        await ratingService.createRating({
          ...changes,
          user_id: item.user_id,
          institution_id: item.institution_id,
          academic_year_id: item.academic_year_id,
          period: item.period
        } as any);
      }

      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      loadData();
    } catch (error) {
      logger.error('Error saving rating:', { error });
    } finally {
      setSavingId(null);
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
      {/* 📊 Summary Cards */}
      <RatingStatsCards data={filteredData} loading={loading} />

      {/* 🛠 Toolbar Actions */}
      <RatingActionToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCalculateAll={calculateAllRatings}
        onBulkSave={bulkSaveChanges}
        onBulkDelete={bulkDelete}
        onExport={exportToExcel}
        onLoadMore={() => { }} // Not needed anymore
        selectedCount={selectedItems.length}
        loading={loading}
      />

      {/* 📋 Rating Table */}
      <RatingDataTable
        data={filteredData}
        pagination={pagination}
        onPageChange={setCurrentPage}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        editingCell={editingCell}
        onCellClick={handleCellClick}
        onCellChange={handleCellChange}
        onCellBlur={handleCellBlur}
        onKeyDown={handleKeyDown}
        onSaveItem={saveChanges}
        onCalculateItem={calculateRating}
        pendingChanges={pendingChanges}
        savingId={savingId}
      />
    </div>
  );
};
