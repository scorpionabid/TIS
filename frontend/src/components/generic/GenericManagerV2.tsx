import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

  // Pagination for filtered entities
  const pagination = usePagination(manager.filteredEntities, {
    initialPage: 1,
    initialItemsPerPage: 20
  });

  // Handle bulk selection
  const handleSelectAll = () => {
    if (manager.selectedItems.length === pagination.paginatedItems.length) {
      manager.clearSelection();
    } else {
      manager.setSelectedItems([...pagination.paginatedItems]);
    }
  };

  const isAllSelected = pagination.paginatedItems.length > 0 && 
    manager.selectedItems.length === pagination.paginatedItems.length;
  const isIndeterminate = manager.selectedItems.length > 0 && 
    manager.selectedItems.length < pagination.paginatedItems.length;

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
                manager.setEditingEntity(null);
                manager.setCreateModalOpen(true);
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
      {features.tabs !== false && config.tabs.length > 1 && (
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
              ) : pagination.totalItems > 0 ? (
                <>
                  <GenericTable
                    columns={config.columns}
                    data={pagination.paginatedItems}
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
      {customLogic?.renderCustomModal && 
        customLogic.renderCustomModal({
          open: manager.createModalOpen,
          onClose: () => {
            manager.setCreateModalOpen(false);
            manager.setEditingEntity(null);
          },
          onSave: manager.editingEntity ? 
            (data: any) => manager.handleUpdate(manager.editingEntity!.id, data) :
            manager.handleCreate,
          entity: manager.editingEntity,
          isLoading: manager.isCreating || manager.isUpdating,
        })
      }
    </div>
  );
}