import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ModernTabs, ModernTabItem } from './ModernTabs';
import { ModernManagerHeader, HeaderStat } from './ModernManagerHeader';
import { Plus, RefreshCw, Download, Upload, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEntityManagerV2 } from '@/hooks/useEntityManagerV2';
import { GenericManagerProps, BaseEntity, BaseFilters } from './types';
import { GenericStatsCards } from './GenericStatsCards';
import { GenericFilters } from './GenericFilters';
import { GenericTable } from './GenericTable';
import { GenericBulkActions } from './GenericBulkActions';
import { TablePagination } from '@/components/common/TablePagination';
import { usePagination } from '@/hooks/usePagination';

export function GenericManagerV2<
  T extends BaseEntity,
  TFilters extends BaseFilters,
  TCreateData
>({
  config,
  customLogic,
  className,
  statsVariant = 'default',
  filterVariant = 'default',
}: GenericManagerProps<T, TFilters, TCreateData>) {
  
  const manager = useEntityManagerV2(config, customLogic);
  const features = config.features || {};
  const useServerPagination = Boolean(config.serverSide?.pagination);

  // Import/Export modal states
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [exportModalOpen, setExportModalOpen] = React.useState(false);

  // Handle import button click
  const handleImportClick = () => {
    if (customLogic?.onImportClick) {
      customLogic.onImportClick();
    } else {
      setImportModalOpen(true);
    }
  };

  // Handle export button click
  const handleExportClick = () => {
    if (customLogic?.onExportClick) {
      customLogic.onExportClick();
    } else {
      setExportModalOpen(true);
    }
  };

  // Pagination for filtered entities (ensure we always pass an array)
  const safeFilteredEntities = manager.filteredEntities || [];
  const pagination = usePagination(safeFilteredEntities, {
    initialPage: 1,
    initialItemsPerPage: 20
  });
  const tableItems = useServerPagination ? safeFilteredEntities : pagination.paginatedItems;

  // Handle bulk selection
  const handleSelectAll = () => {
    if (manager.selectedItems.length === tableItems.length) {
      manager.clearSelection();
    } else {
      manager.setSelectedItems([...tableItems]);
    }
  };

  const isAllSelected = tableItems.length > 0 &&
    manager.selectedItems.length === tableItems.length;
  const isIndeterminate = manager.selectedItems.length > 0 &&
    manager.selectedItems.length < tableItems.length;

  // Prepare stats for header from manager.stats or headerConfig
  const headerStats: HeaderStat[] = React.useMemo(() => {
    return [];
  }, []);

  // Error state
  if (manager.error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {config.entityNamePlural} yüklənərkən xəta baş verdi
              </h3>
              <p className="text-muted-foreground mb-4">
                Zəhmət olmasa yenidən cəhd edin
              </p>
              <Button onClick={() => manager.refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenidən cəhd et
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if old stats cards should be shown (when no stats tab exists and header doesn't show stats)
  const showOldStatsCards = features.stats !== false && 
                           !config.tabs?.some(t => t.isStatsTab) &&
                           !config.headerConfig?.showStats;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Modern Header */}
      <ModernManagerHeader
        title={config.headerConfig?.title || `${config.entityNamePlural} İdarəetməsi`}
        description={config.headerConfig?.description || `${config.entityNamePlural} idarə edin və izləyin`}
        searchTerm={manager.searchTerm}
        onSearchChange={manager.setSearchTerm}
        searchPlaceholder={config.headerConfig?.searchPlaceholder || 'Axtar...'}
        tabs={config.tabs?.map(tab => ({
          key: tab.key,
          label: tab.label,
          count: tab.count !== undefined
            ? tab.count
            : tab.isStatsTab
              ? undefined
              : tab.filter
                ? tab.filter(manager.entities || []).length
                : (manager.entities || []).length,
          icon: tab.icon,
          variant: tab.variant as any
        }))}
        activeTab={manager.selectedTab}
        onTabChange={manager.setSelectedTab}
        primaryAction={features.create !== false ? {
          label: config.headerConfig?.createLabel || `Yeni ${config.entityName}`,
          icon: Plus,
          onClick: () => {
            if (customLogic?.onCreateClick) {
              customLogic.onCreateClick();
            } else {
              manager.setEditingEntity(null);
              manager.setCreateModalOpen(true);
            }
          },
        } : undefined}
        onRefresh={() => manager.refetch()}
        isRefreshing={manager.isLoading}
        onImport={features.import ? customLogic?.onImportClick : undefined}
        onExport={features.export ? customLogic?.onExportClick : undefined}
        showImport={features.import === true}
        showExport={features.export === true}
        showTemplate={config.headerConfig?.showTemplate === true}
        onTemplate={features.import && customLogic?.onTemplateClick ? customLogic.onTemplateClick : undefined}
      />

      {/* Bulk Actions */}
      {features.bulk !== false && manager.selectedItems.length > 0 && (
        <GenericBulkActions
          selectedCount={manager.selectedItems.length}
          onClearSelection={manager.clearSelection}
          actions={customLogic?.bulkActions || []}
        />
      )}

      {/* Tab Content */}
      {config.tabs && config.tabs.map(tab => {
        const isActive = manager.selectedTab === tab.key;
        if (!isActive) return null;

        return (
          <div key={tab.key} className="space-y-4">
            {/* Stats Tab Content */}
            {tab.isStatsTab ? (
              <GenericStatsCards stats={manager.stats} />
            ) : (
              <>
                {/* Table Content */}
                {manager.isLoading ? (
                  <GenericTable
                    columns={config.columns}
                    data={[]}
                    actions={config.actions}
                    isLoading={true}
                    onRowSelect={features.bulk !== false ? manager.toggleItemSelection : undefined}
                    selectedItems={manager.selectedItems}
                    onSelectAll={features.bulk !== false ? handleSelectAll : undefined}
                    isAllSelected={isAllSelected}
                    isIndeterminate={isIndeterminate}
                  />
                ) : (useServerPagination ? tableItems.length > 0 : pagination.totalItems > 0) ? (
                  <>
                    <GenericTable
                      columns={config.columns}
                      data={tableItems}
                      actions={config.actions}
                      isLoading={false}
                      onRowSelect={features.bulk !== false ? manager.toggleItemSelection : undefined}
                      selectedItems={manager.selectedItems}
                      onSelectAll={features.bulk !== false ? handleSelectAll : undefined}
                      isAllSelected={isAllSelected}
                      isIndeterminate={isIndeterminate}
                      customRowRender={customLogic?.renderCustomRow}
                    />
                    
                    {/* Pagination */}
                    {useServerPagination ? (
                      <TablePagination
                        currentPage={manager.pagination?.current_page || manager.filters?.page || 1}
                        totalPages={manager.pagination?.total_pages || manager.pagination?.last_page || 1}
                        totalItems={manager.pagination?.total || tableItems.length}
                        itemsPerPage={manager.pagination?.per_page || manager.filters?.per_page || tableItems.length || 20}
                        startIndex={(manager.pagination?.from ?? 0) > 0 ? (manager.pagination!.from! - 1) : 0}
                        endIndex={manager.pagination?.to ?? tableItems.length}
                        onPageChange={manager.setPage}
                        onItemsPerPageChange={manager.setPerPage}
                        canGoPrevious={manager.pagination ? manager.pagination.current_page > 1 : undefined}
                        canGoNext={
                          manager.pagination
                            ? manager.pagination.current_page < (manager.pagination.total_pages || manager.pagination.last_page || 1)
                            : undefined
                        }
                      />
                    ) : (
                      <TablePagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        itemsPerPage={pagination.itemsPerPage}
                        startIndex={pagination.startIndex}
                        endIndex={pagination.endIndex}
                        onPageChange={pagination.goToPage}
                        onItemsPerPageChange={pagination.setItemsPerPage}
                        onPrevious={pagination.goToPreviousPage}
                        onNext={pagination.goToNextPage}
                        canGoPrevious={pagination.canGoPrevious}
                        canGoNext={pagination.canGoNext}
                      />
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          {config.entityName} tapılmadı
                        </h3>
                        <p className="text-muted-foreground">
                          {manager.searchTerm ? 
                            'Axtarış kriteriyasına uyğun məlumat tapılmadı' : 
                            tab.key === 'all' ? 
                              `Hələ ki yaradılmış ${config.entityName.toLowerCase()} yoxdur` :
                              `${tab.label} ${config.entityName.toLowerCase()} yoxdur`
                          }
                        </p>
                        {features.create !== false && (
                          <Button 
                            className="mt-4" 
                            onClick={() => {
                              manager.setEditingEntity(null);
                              manager.setCreateModalOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            İlk {config.entityName.toLowerCase()}i yarat
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Custom Modal Rendering */}
      {customLogic?.renderCustomModal && (() => {
        const modalProps = {
          open: manager.createModalOpen,
          onClose: () => {
            console.log('🔄 GenericManagerV2 Modal onClose called');
            manager.setCreateModalOpen(false);
            manager.setEditingEntity(null);
          },
          onSave: manager.editingEntity ? 
            (data: any) => manager.handleUpdate(manager.editingEntity!.id, data) :
            manager.handleCreate,
          entity: manager.editingEntity,
          isLoading: manager.isCreating || manager.isUpdating,
        };
        
        console.log('🎨 GenericManagerV2 About to render custom modal:', {
          hasRenderCustomModal: !!customLogic.renderCustomModal,
          createModalOpen: manager.createModalOpen,
          editingEntity: manager.editingEntity?.id || 'null',
          isCreating: manager.isCreating,
          isUpdating: manager.isUpdating,
          modalProps: modalProps
        });
        
        return customLogic.renderCustomModal(modalProps);
      })()}
    </div>
  );
}
