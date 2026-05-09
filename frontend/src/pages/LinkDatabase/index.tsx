import { useCallback, useMemo } from 'react';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { AlertCircle } from 'lucide-react';
import { useLinkDatabaseState } from './hooks/useLinkDatabaseState';
import { useLinkDatabaseData } from './hooks/useLinkDatabaseData';
import { useLinkDatabaseActions } from './hooks/useLinkDatabaseActions';
import { LinkDatabaseFilterBar } from './components/LinkDatabaseFilterBar';
import { LinkDatabaseFeaturedSection } from './components/LinkDatabaseFeaturedSection';
import { LinkDatabaseContent } from './components/LinkDatabaseContent';
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
    filters: state.filters,
    debouncedSearch: state.debouncedSearch,
    currentPage: state.currentPage,
    perPage: state.perPage,
    updateFilter: state.updateFilter,
  });

  const actions = useLinkDatabaseActions({
    currentDepartmentId: state.currentDepartmentId,
    onSuccess: state.closeModals,
  });

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

  return (
    <>
      <div className="flex flex-col min-h-[calc(100vh-4rem)] w-full bg-background">

        {/* Sticky Toolbar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60 px-3 sm:px-6 py-3">
          <LinkDatabaseFilterBar
            filters={state.filters}
            viewMode={state.viewMode}
            departments={data.departments}
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
          {data.featuredLinks.length > 0 && !hasActiveFilters && (
            <div className="px-6 py-4 bg-muted/30 border-b border-border/40">
              <LinkDatabaseFeaturedSection links={data.featuredLinks} />
            </div>
          )}

          <div className="min-h-[400px]">
            <LinkDatabaseContent
              links={data.currentLinks}
              viewMode={state.viewMode}
              isLoading={data.isLoadingLinks || data.isLoadingDepartments}
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
        </div>
      </div>

      {/* Modals */}
      <UnifiedLinkModal
        isOpen={state.isCreateModalOpen || state.isEditModalOpen}
        onClose={state.closeModals}
        activeTab={state.filters.departmentId}
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
