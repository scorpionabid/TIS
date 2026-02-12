import { useEffect, useCallback, useMemo } from 'react';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { AlertCircle, Database, Loader2 } from 'lucide-react';
import { useLinkDatabaseState } from './hooks/useLinkDatabaseState';
import { useLinkDatabaseData } from './hooks/useLinkDatabaseData';
import { useLinkDatabaseActions } from './hooks/useLinkDatabaseActions';
import { LinkDatabaseHeader } from './components/LinkDatabaseHeader';
import { LinkDatabaseStatsBar } from './components/LinkDatabaseStatsBar';
import { LinkDatabaseFilterBar } from './components/LinkDatabaseFilterBar';
import { LinkDatabaseTabs } from './components/LinkDatabaseTabs';
import { LinkDatabaseFeaturedSection } from './components/LinkDatabaseFeaturedSection';
import { LinkDatabaseContent } from './components/LinkDatabaseContent';
import { LinkFormModal } from './components/LinkFormModal';
import { LinkDeleteModal } from './components/LinkDeleteModal';
import type { CreateLinkData, LinkShare } from './types/linkDatabase.types';

export default function LinkDatabase() {
  const { hasPermission, currentRole } = useRoleCheck();

  // Permissions
  const canCreate = hasPermission('links.create');
  const canEdit = hasPermission('links.update');
  const canDelete = hasPermission('links.delete');
  const canView = hasPermission('links.read');

  // State
  const state = useLinkDatabaseState();

  // Data
  const data = useLinkDatabaseData({
    activeTab: state.activeTab,
    selectedSector: state.selectedSector,
    isOnSectorsTab: state.isOnSectorsTab,
    currentDepartmentId: state.currentDepartmentId,
    debouncedSearch: state.debouncedSearch,
    filters: state.filters,
    currentPage: state.currentPage,
    perPage: state.perPage,
  });

  // Actions
  const actions = useLinkDatabaseActions({
    isOnSectorsTab: state.isOnSectorsTab,
    currentDepartmentId: state.currentDepartmentId,
    selectedSector: state.selectedSector,
    onSuccess: state.closeModals,
  });

  // Auto-select first department tab
  useEffect(() => {
    if (data.departments.length > 0 && !state.activeTab) {
      state.setActiveTab(data.departments[0].id.toString());
    }
  }, [data.departments, state.activeTab, state.setActiveTab]);

  // Auto-select first sector
  useEffect(() => {
    if (data.sectors.length > 0 && state.selectedSector === null) {
      state.setSelectedSector(data.sectors[0].id);
    }
  }, [data.sectors, state.selectedSector, state.setSelectedSector]);

  // Get current tab label for modal
  const currentTabLabel = useMemo(() => {
    if (state.isOnSectorsTab) {
      const sector = data.sectors.find((s) => s.id === state.selectedSector);
      return sector?.name || 'Sektorlar';
    }
    const dept = data.departments.find((d) => d.id.toString() === state.activeTab);
    return dept?.name || state.activeTab;
  }, [state.activeTab, state.isOnSectorsTab, state.selectedSector, data.sectors, data.departments]);

  // Has active filters
  const hasActiveFilters = useMemo(
    () =>
      state.filters.search !== '' ||
      state.filters.linkType !== 'all' ||
      state.filters.status !== 'all' ||
      state.filters.isFeatured !== null,
    [state.filters]
  );

  // Handle create submit
  const handleCreateSubmit = useCallback(
    (formData: CreateLinkData) => {
      actions.createLink(formData);
    },
    [actions]
  );

  // Handle edit submit
  const handleEditSubmit = useCallback(
    (formData: CreateLinkData) => {
      if (state.selectedLink) {
        actions.updateLink({ id: state.selectedLink.id, data: formData });
      }
    },
    [actions, state.selectedLink]
  );

  // Handle delete confirm (soft or hard)
  const handleDeleteConfirm = useCallback((deleteType: 'soft' | 'hard') => {
    if (state.selectedLink) {
      actions.deleteLink(state.selectedLink.id, deleteType);
    }
  }, [actions, state.selectedLink]);

  // Handle restore
  const handleRestore = useCallback((link: LinkShare) => {
    actions.restoreLink(link.id);
  }, [actions]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    if (state.selectedLinkIds.size > 0) {
      actions.bulkDeleteLinks(Array.from(state.selectedLinkIds));
      state.clearSelection();
    }
  }, [actions, state.selectedLinkIds, state.clearSelection]);

  // Permission check
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu bölmədən istifadə etmək üçün səlahiyyətiniz yoxdur.
          </p>
        </div>
      </div>
    );
  }

  // Initial loading
  if (data.isLoadingDepartments) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No departments/sectors
  if (data.departments.length === 0 && data.sectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Heç bir departament və ya sektor tapılmadı</h3>
          <p className="text-muted-foreground">
            Sistem administratoru ilə əlaqə saxlayın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <LinkDatabaseHeader
        canCreate={canCreate}
        onCreateClick={state.openCreateModal}
        selectedCount={state.selectedLinkIds.size}
        onBulkDelete={canDelete ? handleBulkDelete : undefined}
        isBulkDeleting={actions.isBulkDeleting}
      />

      {/* Stats Bar */}
      <LinkDatabaseStatsBar stats={data.stats} />

      {/* Filter Bar */}
      <LinkDatabaseFilterBar
        filters={state.filters}
        viewMode={state.viewMode}
        onFilterChange={state.updateFilter}
        onResetFilters={state.resetFilters}
        onViewModeChange={state.setViewMode}
      />

      {/* Tabs */}
      <LinkDatabaseTabs
        departments={data.departments}
        sectors={data.sectors}
        activeTab={state.activeTab}
        selectedSector={state.selectedSector}
        onTabChange={state.setActiveTab}
        onSectorChange={state.setSelectedSector}
        userRole={currentRole}
      />

      {/* Featured Links */}
      {data.featuredLinks.length > 0 && (
        <LinkDatabaseFeaturedSection links={data.featuredLinks} />
      )}

      {/* Content (Table/Grid) */}
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
        onCreateClick={canCreate ? state.openCreateModal : undefined}
        onClearFilters={state.resetFilters}
      />

      {/* Create Modal */}
      <LinkFormModal
        isOpen={state.isCreateModalOpen}
        onClose={state.closeModals}
        onSubmit={handleCreateSubmit}
        isLoading={actions.isCreating}
        mode="create"
        departments={data.departments}
        sectors={data.sectors}
        currentTabLabel={currentTabLabel}
        isOnSectorsTab={state.isOnSectorsTab}
        currentDepartmentId={state.currentDepartmentId}
        selectedSector={state.selectedSector}
      />

      {/* Edit Modal */}
      <LinkFormModal
        isOpen={state.isEditModalOpen}
        onClose={state.closeModals}
        onSubmit={handleEditSubmit}
        isLoading={actions.isUpdating}
        mode="edit"
        selectedLink={state.selectedLink}
        departments={data.departments}
        sectors={data.sectors}
        currentTabLabel={currentTabLabel}
        isOnSectorsTab={state.isOnSectorsTab}
        currentDepartmentId={state.currentDepartmentId}
        selectedSector={state.selectedSector}
      />

      {/* Delete Modal */}
      <LinkDeleteModal
        link={state.selectedLink}
        isOpen={state.isDeleteModalOpen}
        isLoading={actions.isDeleting}
        onClose={state.closeModals}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
