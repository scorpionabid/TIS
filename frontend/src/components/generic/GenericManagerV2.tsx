import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  className 
}: GenericManagerProps<T, TFilters, TCreateData>) {
  
  const manager = useEntityManagerV2(config, customLogic);
  const features = config.features || {};
  const useServerPagination = Boolean(config.serverSide?.pagination);

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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {config.entityNamePlural} İdarəetməsi
          </h2>
          <p className="text-muted-foreground">
            {config.entityNamePlural} idarə edin və izləyin
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button 
            variant="outline" 
            onClick={() => manager.refetch()} 
            disabled={manager.isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", manager.isLoading && "animate-spin")} />
            Yenilə
          </Button>

          {/* Custom Header Actions */}
          {customLogic?.headerActions?.map(action => (
            <Button
              key={action.key}
              variant={action.variant || 'outline'}
              onClick={action.onClick}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}

          {/* Import/Export */}
          {features.import && (
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              İdxal
            </Button>
          )}

          {features.export && (
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              İxrac
            </Button>
          )}

          {/* Create Button */}
          {features.create !== false && (
            <Button
              onClick={() => {
                console.log('🚀 GenericManagerV2 Create button clicked:', {
                  entityType: config.entityType,
                  entityName: config.entityName,
                  hasCustomOnCreateClick: !!customLogic?.onCreateClick
                });

                // Use custom create handler if provided
                if (customLogic?.onCreateClick) {
                  customLogic.onCreateClick();
                } else {
                  manager.setEditingEntity(null);
                  manager.setCreateModalOpen(true);
                }

                console.log('✅ GenericManagerV2 Create handler executed');
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni {config.entityName}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {features.stats !== false && (
        <GenericStatsCards stats={manager.stats} />
      )}

      {/* Bulk Actions */}
      {features.bulk !== false && manager.selectedItems.length > 0 && (
        <GenericBulkActions
          selectedCount={manager.selectedItems.length}
          onClearSelection={manager.clearSelection}
          actions={customLogic?.bulkActions || []}
        />
      )}

      {/* Filters */}
      {features.filters !== false && (
        <div className="space-y-4">
          {customLogic?.renderCustomFilters ? 
            customLogic.renderCustomFilters(manager) :
            <GenericFilters
              searchTerm={manager.searchTerm}
              setSearchTerm={manager.setSearchTerm}
              filters={manager.filters}
              setFilters={manager.setFilters}
              filterFields={config.filterFields}
            />
          }
        </div>
      )}

      {/* Tabs */}
      {features.tabs !== false && config.tabs && config.tabs.length > 1 && (
        <Tabs value={manager.selectedTab} onValueChange={manager.setSelectedTab}>
          <TabsList className={"grid w-full " + (config.tabs.length <= 2 ? 'grid-cols-2' : config.tabs.length === 3 ? 'grid-cols-3' : config.tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-5')}>
            {config.tabs.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label} ({tab.count ?? manager.filteredEntities.length})
              </TabsTrigger>
            ))}
          </TabsList>

          {config.tabs.map(tab => (
            <TabsContent key={tab.key} value={tab.key} className="space-y-4">
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
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Custom Modal Rendering */}
      {customLogic?.renderCustomModal && (() => {
        console.log('🎨 GenericManagerV2 About to render custom modal:', {
          hasRenderCustomModal: !!customLogic.renderCustomModal,
          createModalOpen: manager.createModalOpen,
          editingEntity: manager.editingEntity?.id || 'null',
          isCreating: manager.isCreating,
          isUpdating: manager.isUpdating
        });
        
        return customLogic.renderCustomModal({
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
        });
      })()
      }
    </div>
  );
}
