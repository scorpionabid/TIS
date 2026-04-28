import { useEffect, useCallback, useMemo } from 'react';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Button } from '@/components/ui/button';
import { AlertCircle, Database, Loader2, Plus } from 'lucide-react';
import { useLinkDatabaseState } from './hooks/useLinkDatabaseState';
import { useLinkDatabaseData } from './hooks/useLinkDatabaseData';
import { useLinkDatabaseActions } from './hooks/useLinkDatabaseActions';
import { LinkDatabaseFilterBar } from './components/LinkDatabaseFilterBar';
import { LinkDatabaseTabs } from './components/LinkDatabaseTabs';
import { LinkDatabaseFeaturedSection } from './components/LinkDatabaseFeaturedSection';
import { LinkDatabaseContent } from './components/LinkDatabaseContent';
import { LinkSchoolsContent } from './components/LinkSchoolsContent';
import { UnifiedLinkModal } from './components/UnifiedLinkModal';
import { LinkDeleteModal } from './components/LinkDeleteModal';
import { LinkTrackingPanel } from './components/LinkTrackingPanel';
import type { LinkShare } from './types/linkDatabase.types';
import type { LinkFormValues } from './schemas/linkForm.schema';

export default function LinkDatabase() {
  const { hasPermission } = useRoleCheck();

  const canCreate = hasPermission('links.create');
  const canEdit   = hasPermission('links.update');
  const canDelete = hasPermission('links.delete');
  const canView   = hasPermission('links.read');

  const state = useLinkDatabaseState();

  const data = useLinkDatabaseData({
    activeTab: state.activeTab,
    debouncedSearch: state.debouncedSearch,
    filters: state.filters,
    currentPage: state.currentPage,
    perPage: state.perPage,
  });

  const actions = useLinkDatabaseActions({
    isOnSchoolsTab: state.isOnSchoolsTab,
    currentDepartmentId: state.currentDepartmentId,
    currentSectorId: null,
    selectedSchool: null,
    onSuccess: state.closeModals,
  });

  const sortedDepartments = useMemo(() => {
    const getWeight = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('rəhbər')) return 1;
      if (n.includes('tədris')) return 2;
      if (n.includes('nzibati')) return 3; // Robust for 'İnzibati'
      if (n.includes('maliyy')) return 4;  // Robust for 'Maliyyə'
      if (n.includes('balakən')) return 5;
      if (n.includes('zaqatala')) return 6;
      if (n.includes('qax')) return 7;
      if (n.includes('şəki')) return 8;
      if (n.includes('oğuz')) return 9;
      if (n.includes('qəbələ')) return 10;
      return 999;
    };

    return [...data.departments].sort((a, b) => {
      const weightA = getWeight(a.name);
      const weightB = getWeight(b.name);
      if (weightA !== weightB) return weightA - weightB;
      return a.name.localeCompare(b.name);
    });
  }, [data.departments]);

  useEffect(() => {
    if (!state.activeTab && !data.isLoadingDepartments && sortedDepartments.length > 0) {
      state.setActiveTab(sortedDepartments[0].id.toString());
    }
  }, [sortedDepartments, data.isLoadingDepartments, state.activeTab, state.setActiveTab]);

  const hasActiveFilters = useMemo(
    () =>
      state.filters.search !== '' ||
      state.filters.linkType !== 'all' ||
      state.filters.status !== 'all' ||
      state.filters.isFeatured !== null,
    [state.filters]
  );

  const handleCreateSubmit = useCallback(
    (formData: LinkFormValues) => { actions.createLink(formData); },
    [actions]
  );

  const handleEditSubmit = useCallback(
    (formData: LinkFormValues) => {
      if (state.selectedLink) {
        actions.updateLink({ id: state.selectedLink.id, data: formData });
      }
    },
    [actions, state.selectedLink]
  );

  const handleDeleteConfirm = useCallback(
    (deleteType: 'soft' | 'hard') => {
      if (state.selectedLink) {
        actions.deleteLink(state.selectedLink.id, deleteType);
      }
    },
    [actions, state.selectedLink]
  );

  const handleRestore = useCallback(
    (link: LinkShare) => { actions.restoreLink(link.id); },
    [actions]
  );

  const handleBulkDelete = useCallback(() => {
    if (state.selectedLinkIds.size > 0) {
      actions.bulkDeleteLinks(Array.from(state.selectedLinkIds));
      state.clearSelection();
    }
  }, [actions, state.selectedLinkIds, state.clearSelection]);

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">Bu bölmədən istifadə etmək üçün səlahiyyətiniz yoxdur.</p>
        </div>
      </div>
    );
  }

  // isLoadingDepartments artıq ayrı sidebar skeleton-ə verilir (aşağıya bax)

  const activeDepName = sortedDepartments
    .find((d) => d.id.toString() === state.activeTab)
    ?.name
    .replace(/\s+sektoru\s*$/i, '')
    .trim();

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] w-full bg-background">

        {/* Left Sidebar — yalnız departamentlər */}
        <aside className="w-full md:w-64 lg:w-72 xl:w-80 flex-shrink-0 border-b md:border-b-0 md:border-r border-border/60 bg-card md:min-h-full">
          <div className="md:sticky md:top-0 md:max-h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar">
            <div className="px-4 py-5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-foreground">Keçidlər Paneli</h2>
                  <p className="text-[11px] text-muted-foreground font-medium">Resursların idarəetmə mərkəzi</p>
                </div>
              </div>
            </div>

            {data.isLoadingDepartments ? (
              <div className="flex flex-col w-full py-2 space-y-1 px-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-muted animate-pulse shrink-0" />
                    <div className="h-4 rounded bg-muted animate-pulse flex-1" style={{ animationDelay: `${i * 80}ms` }} />
                  </div>
                ))}
              </div>
            ) : (
              <LinkDatabaseTabs
                departments={sortedDepartments}
                activeTab={state.activeTab}
                onTabChange={state.setActiveTab}
                variant="vertical"
              />
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col bg-background">

          {/* Sticky Toolbar — kompakt, tək blok */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60 px-6 py-3">
            <LinkDatabaseFilterBar
              title={activeDepName ?? 'Keçidlər'}
              filters={state.filters}
              viewMode={state.viewMode}
              onFilterChange={state.updateFilter}
              onResetFilters={state.resetFilters}
              onViewModeChange={state.setViewMode}
              canCreate={canCreate}
              selectedCount={state.selectedLinkIds.size}
              isBulkDeleting={actions.isBulkDeleting}
              onCreateClick={state.openCreateModal}
              onBulkDelete={handleBulkDelete}
            />
          </div>

          {/* Content */}
          <div className="flex-1">
            {state.isOnSchoolsTab ? (
              <LinkSchoolsContent isGrouped={state.isOnSchoolsBulkTab} />
            ) : (
              <>
                {data.featuredLinks.length > 0 && !hasActiveFilters && (
                  <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
                    <LinkDatabaseFeaturedSection links={data.featuredLinks} />
                  </div>
                )}

                <div className="min-h-[400px]">
                  <LinkDatabaseContent
                    links={data.currentLinks}
                    viewMode={state.viewMode}
                    isLoading={data.isLoadingLinks}
                    isFetching={data.isFetchingLinks}
                    hasFilters={hasActiveFilters}
                    canCreate={canCreate}
                    selectedIds={state.selectedLinkIds}
                    sortBy={state.filters.sortBy}
                    sortDirection={state.filters.sortDirection}
                    paginationMeta={data.paginationMeta}
                    onSort={state.toggleSort}
                    onToggleSelect={state.toggleLinkSelection}
                    onSelectAll={state.selectAllLinks}
                    onPageChange={state.setCurrentPage}
                    onPerPageChange={state.setPerPage}
                    onEdit={canEdit ? state.openEditModal : undefined}
                    onDelete={canDelete ? state.openDeleteModal : undefined}
                    onRestore={canEdit ? handleRestore : undefined}
                    onTrack={state.openTrackingPanel}
                    onCreateClick={canCreate ? state.openCreateModal : undefined}
                    onClearFilters={state.resetFilters}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <UnifiedLinkModal
        isOpen={state.isCreateModalOpen || state.isEditModalOpen}
        onClose={state.closeModals}
        departments={data.departments}
        activeTab={state.activeTab}
        mode={state.isEditModalOpen ? 'edit' : 'create'}
        selectedLink={state.selectedLink}
        onEditSubmit={handleEditSubmit}
        onCreateSubmit={handleCreateSubmit}
        isLoading={actions.isCreating || actions.isUpdating}
      />

      <LinkDeleteModal
        link={state.selectedLink}
        isOpen={state.isDeleteModalOpen}
        isLoading={actions.isDeleting}
        onClose={state.closeModals}
        onConfirm={handleDeleteConfirm}
      />

      {state.isTrackingPanelOpen && state.trackingLink && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <LinkTrackingPanel
            link={state.trackingLink}
            onClose={state.closeTrackingPanel}
          />
        </div>
      )}
    </>
  );
}
