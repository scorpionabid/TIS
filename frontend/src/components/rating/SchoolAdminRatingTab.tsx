import React, { useState, useEffect, useMemo } from 'react';
import { ratingService } from '@/services/ratingService';
import { RatingItem, PaginatedResponse } from '@/types/rating';
import { logger } from '@/utils/logger';
import { RatingStatsCards } from './RatingStatsCards';
import { RatingActionToolbar } from './RatingActionToolbar';
import { RatingDataTable } from './RatingDataTable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';

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

interface SectorGroup {
  sectorId: number | null;
  sectorName: string;
  items: RatingItem[];
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [period, institutionId, academicYearId, currentPage, statusFilter]);

  // Initialize all sectors as expanded when data first loads
  useEffect(() => {
    if (data.length > 0 && expandedSectors.size === 0) {
      const sectorKeys = new Set(
        data.map(item => String(item.institution?.sector_id ?? 'unknown'))
      );
      setExpandedSectors(sectorKeys);
    }
  }, [data]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAllRatings({
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'schooladmin',
        page: currentPage,
        per_page: 50,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort_by: 'sector',
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
      logger.error('Error loading school admin ratings:', { error });
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
        user_role: 'schooladmin',
        page: currentPage,
        per_page: 50,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort_by: 'sector',
        force_calculate: true,
      });

      if (response && response.data) {
        setData(response.data);
        setPagination(response);
      }
    } catch (error) {
      logger.error('Error force refreshing ratings:', { error });
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
          } as Partial<RatingItem>);
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
    if (!confirm(`Secilmiş ${selectedItems.length} qeydi silmək istədiyinizdən əminsiniz?`)) return;

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
        ['Direktor', 'Email', 'Müəssisə', 'Sektor', 'Task', 'Survey', 'Davamiyyət', 'Link', 'Manual', 'Ümumi', 'Status'],
        ...exportData.map(item => [
          item.user?.full_name || '',
          item.user?.email || '',
          item.institution?.name || '',
          item.institution?.sector_name || '',
          item.task_score || 0,
          item.survey_score || 0,
          item.attendance_score || 0,
          item.link_score || 0,
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
    // Only clamp manual_score to -100...100, task/survey scores are auto-calculated
    const clampedValue = field === 'manual_score'
      ? Math.min(100, Math.max(-100, numValue))
      : numValue;

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
        } as Partial<RatingItem>);
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

  const toggleSector = (sectorKey: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      if (next.has(sectorKey)) {
        next.delete(sectorKey);
      } else {
        next.add(sectorKey);
      }
      return next;
    });
  };

  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return item.user?.full_name?.toLowerCase().includes(searchLower) ||
      item.user?.email?.toLowerCase().includes(searchLower) ||
      item.institution?.name?.toLowerCase().includes(searchLower) ||
      item.institution?.sector_name?.toLowerCase().includes(searchLower);
  });

  // Group data by sector
  const sectorGroups: SectorGroup[] = useMemo(() => {
    const groups = new Map<string, SectorGroup>();

    for (const item of filteredData) {
      const sectorId = item.institution?.sector_id ?? null;
      const sectorName = item.institution?.sector_name ?? 'Təyinsiz';
      const key = String(sectorId ?? 'unknown');

      if (!groups.has(key)) {
        groups.set(key, { sectorId, sectorName, items: [] });
      }
      groups.get(key)!.items.push(item);
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.sectorName.localeCompare(b.sectorName, 'az')
    );
  }, [filteredData]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <RatingStatsCards data={filteredData} loading={loading} />

      {/* Toolbar */}
      <RatingActionToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCalculateAll={forceRefresh}
        onBulkSave={bulkSaveChanges}
        onBulkDelete={bulkDelete}
        onExport={exportToExcel}
        selectedCount={selectedItems.length}
        loading={loading}
        status={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Sector-grouped tables */}
      {sectorGroups.length > 0 ? (
        <div className="space-y-4">
          {sectorGroups.map((group) => {
            const sectorKey = String(group.sectorId ?? 'unknown');
            const isExpanded = expandedSectors.has(sectorKey);
            const avgScore = group.items.length > 0
              ? group.items.reduce((sum, item) => sum + (Number(item.overall_score) || 0), 0) / group.items.length
              : 0;

            return (
              <Collapsible
                key={sectorKey}
                open={isExpanded}
                onOpenChange={() => toggleSector(sectorKey)}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      )}
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-800 text-base">
                        {group.sectorName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        {group.items.length} direktor
                      </span>
                      <span className={`font-semibold px-2.5 py-0.5 rounded-full text-xs ${
                        avgScore >= 3 ? 'bg-green-100 text-green-700' :
                        avgScore >= 0 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        Ort: {avgScore.toFixed(1)}
                      </span>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2">
                    <RatingDataTable
                      data={group.items}
                      pagination={null}
                      onPageChange={() => {}}
                      selectedItems={selectedItems}
                      onSelectItem={handleSelectItem}
                      onSelectAll={(checked) => {
                        if (checked) {
                          const groupIds = group.items.map(item => item.id || item.user_id);
                          setSelectedItems(prev => [...new Set([...prev, ...groupIds])]);
                        } else {
                          const groupIds = new Set(group.items.map(item => item.id || item.user_id));
                          setSelectedItems(prev => prev.filter(id => !groupIds.has(id)));
                        }
                      }}
                      editingCell={editingCell}
                      onCellClick={handleCellClick}
                      onCellChange={handleCellChange}
                      onCellBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      onSaveItem={saveChanges}
                      pendingChanges={pendingChanges}
                      savingId={savingId}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-xl border">
          <Building2 className="h-10 w-10 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Məlumat tapılmadı</h3>
          <p className="text-sm">Seçilmiş kriteriyalara uyğun heç bir direktor reytinqi mövcud deyil.</p>
        </div>
      )}

      {/* Pagination (global, for all sectors) */}
      {pagination && pagination.last_page > 1 && (
        <div className="p-4 bg-white rounded-xl border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Toplam <strong>{pagination.total}</strong> qeyddən <strong>{pagination.from}-{pagination.to}</strong> arası göstərilir
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Əvvəlki
            </button>
            <span className="px-3 py-1.5 text-sm font-medium">
              {currentPage} / {pagination.last_page}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(pagination.last_page, currentPage + 1))}
              disabled={currentPage === pagination.last_page}
              className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Sonrakı
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
