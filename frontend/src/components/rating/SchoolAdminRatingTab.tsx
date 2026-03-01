import React, { useState, useEffect, useMemo } from 'react';
import { ratingService } from '@/services/ratingService';
import { RatingItem } from '@/types/rating';
import { logger } from '@/utils/logger';
import { RatingStatsCards } from './RatingStatsCards';
import { RatingActionToolbar } from './RatingActionToolbar';
import { RatingDataTable } from './RatingDataTable';
import { ManualScoreDialog } from './ManualScoreDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';

interface SchoolAdminRatingTabProps {
  institutionId?: number;
  academicYearId?: number;
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
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  // Manual score dialog state
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualDialogItem, setManualDialogItem] = useState<RatingItem | null>(null);
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [period, institutionId, academicYearId, statusFilter]);

  const loadData = async (forceCalculate = false) => {
    try {
      setLoading(true);
      const response = await ratingService.getAllRatings({
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'schooladmin',
        per_page: 500,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort_by: 'sector',
        force_calculate: forceCalculate || undefined,
      });

      if (response && response.data) {
        setData(response.data);
      } else if (Array.isArray(response)) {
        setData(response);
      }
    } catch (error) {
      logger.error('Error loading school admin ratings:', { error });
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = () => loadData(true);

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
        ['Müəssisə', 'Direktor', 'Email', 'Sektor', 'Task', 'Survey', 'Davamiyyət', 'Link', 'Manual', 'Manual Kateqoriya', 'Ümumi', 'Status'],
        ...exportData.map(item => [
          item.institution?.name || '',
          item.user?.full_name || '',
          item.user?.email || '',
          item.institution?.sector_name || '',
          item.task_score || 0,
          item.survey_score || 0,
          item.attendance_score || 0,
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
      a.download = `school-admin-ratings-${period}.csv`;
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
          academic_year_id: manualDialogItem.academic_year_id,
          period: manualDialogItem.period,
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
        onBulkSave={async () => {}}
        onBulkDelete={bulkDelete}
        onExport={exportToExcel}
        selectedCount={selectedItems.length}
        loading={loading}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        period={period}
        onPeriodChange={setPeriod}
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
                      onManualScoreEdit={handleManualScoreEdit}
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
          directorName={manualDialogItem.user?.full_name ?? 'Direktor'}
          saving={manualSaving}
        />
      )}
    </div>
  );
};
