import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { canAccessInstitutionType } from "@/utils/institutionUtils";
import { institutionService } from "@/services/institutions";
import { useToast } from "@/hooks/use-toast";

// Modular components
import { InstitutionFilters } from './InstitutionFilters';
import { InstitutionsList } from './InstitutionsList';

// Custom hooks
import { useInstitutionsState } from './useInstitutionsState';
import { useInstitutionsData } from './useInstitutionsData';

// Modals
import { InstitutionModalStandardized } from "@/components/modals/InstitutionModalStandardized";
import { DeleteInstitutionModal } from "@/components/modals/DeleteInstitutionModal";
import { InstitutionDetailsModal } from "@/components/modals/InstitutionDetailsModal";
import { InstitutionImportExportModal } from "@/components/modals/InstitutionImportExportModal";

const InstitutionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { isSuperAdmin, isRegionAdmin, isSektorAdmin } = useRoleCheck();
  const { toast } = useToast();

  // State management
  const {
    selectedType,
    isModalOpen,
    selectedInstitution,
    isDeleteModalOpen,
    isDetailsModalOpen,
    institutionToDelete,
    isImportExportModalOpen,
    currentPage,
    perPage,
    searchQuery,
    statusFilter,
    levelFilter,
    parentFilter,
    deletedFilter,
    sortField,
    sortDirection,
    showFilters,
    institutionAdmins,
    setSelectedType,
    setCurrentPage,
    setPerPage,
    setSearchQuery,
    setStatusFilter,
    setLevelFilter,
    setParentFilter,
    setDeletedFilter,
    setSortField,
    setSortDirection,
    setShowFilters,
    openModal,
    closeModal,
    openDeleteModal,
    closeDeleteModal,
    openDetailsModal,
    closeDetailsModal,
    openImportExportModal,
    closeImportExportModal,
    resetFilters,
    updateInstitutionAdmin,
  } = useInstitutionsState();

  // Data fetching and management
  const {
    institutionsResponse,
    isLoading,
    error,
    availableTypes,
    parentInstitutions,
    handleSave,
  } = useInstitutionsData({
    selectedType,
    currentPage,
    perPage,
    searchQuery,
    statusFilter,
    levelFilter,
    parentFilter,
    deletedFilter,
    sortField,
    sortDirection,
    institutionAdmins,
    updateInstitutionAdmin,
  });

  // Check if user can create institutions
  const canCreateInstitutions = isSuperAdmin || isRegionAdmin || isSektorAdmin;

  // Handle save action
  const onSave = async (data: any) => {
    try {
      await handleSave(data, selectedInstitution);
      closeModal();
      
      // Force page refresh to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Save failed:', error);
      // Don't close modal if save fails
    }
  };

  // Handle delete action
  const handleDelete = async (institution: any, deleteType: 'soft' | 'hard') => {
    if (!institution) {
      toast({
        variant: "warning",
        title: "Xəta",
        description: "Müəssisə seçilməyib.",
      });
      return;
    }

    try {
      // Call the institution service delete method
      const result = await institutionService.delete(institution.id, deleteType);

      // Close the modal
      closeDeleteModal();

      // Show success message
      toast({
        variant: "success",
        title: "Uğurlu əməliyyat",
        description: result.message || `Müəssisə uğurla ${deleteType === 'soft' ? 'arxivə köçürüldü' : 'silindi'}.`,
      });

      // Trigger a data refresh using the query client
      // This ensures the list updates after deletion
      window.location.reload();

    } catch (error: any) {
      console.error('❌ Delete failed:', error);

      // Handle different error types and show user-friendly messages
      let errorTitle = 'Silmə Xətası';
      let errorMessage = 'Müəssisə silinərkən xəta baş verdi.';

      if (error?.response?.status === 403) {
        errorTitle = 'İcazə Xətası';
        errorMessage = error.response.data.message || 'Bu əməliyyat üçün icazəniz yoxdur.';
      } else if (error?.response?.status === 422) {
        errorTitle = 'Doğrulama Xətası';
        errorMessage = error.response.data.message || 'Müəssisə silmək mümkün deyil.';
      } else if (error?.response?.status === 404) {
        errorTitle = 'Tapılmadı';
        errorMessage = 'Müəssisə tapılmadı.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Show error toast instead of alert
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">
            Müəssisələri yükləmək mümkün olmadı
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Naməlum xəta baş verdi'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Müəssisələr</h1>
          <p className="text-muted-foreground">
            Təhsil müəssisələrini idarə edin
          </p>
        </div>
        
        <div className="flex gap-2">
          {canCreateInstitutions && (
            <Button onClick={openImportExportModal} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              İdxal/İxrac
            </Button>
          )}
          
          {canCreateInstitutions && (
            <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Yeni müəssisə
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <InstitutionFilters
        selectedType={selectedType}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        levelFilter={levelFilter}
        parentFilter={parentFilter}
        deletedFilter={deletedFilter}
        sortField={sortField}
        sortDirection={sortDirection}
        showFilters={showFilters}
        availableTypes={availableTypes}
        parentInstitutions={parentInstitutions}
        onTypeChange={setSelectedType}
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onLevelFilterChange={setLevelFilter}
        onParentFilterChange={setParentFilter}
        onDeletedFilterChange={setDeletedFilter}
        onSortFieldChange={setSortField}
        onSortDirectionChange={setSortDirection}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onResetFilters={resetFilters}
        isSuperAdmin={isSuperAdmin}
        isRegionAdmin={isRegionAdmin}
      />

      {/* Results Summary */}
      {institutionsResponse && (
        <div className="text-sm text-muted-foreground">
          {institutionsResponse.pagination.total} müəssisədən{' '}
          {Math.min(
            (institutionsResponse.pagination.currentPage - 1) * institutionsResponse.pagination.perPage + 1,
            institutionsResponse.pagination.total
          )}
          -{Math.min(
            institutionsResponse.pagination.currentPage * institutionsResponse.pagination.perPage,
            institutionsResponse.pagination.total
          )}{' '}
          arası göstərilir
        </div>
      )}

      {/* Institutions List */}
      <InstitutionsList
        institutions={institutionsResponse?.institutions || []}
        institutionAdmins={institutionAdmins}
        pagination={institutionsResponse?.pagination || {
          currentPage: 1,
          perPage: 15,
          total: 0,
          lastPage: 1,
        }}
        isLoading={isLoading}
        onEdit={(institution) => openModal(institution)}
        onDelete={openDeleteModal}
        onViewDetails={openDetailsModal}
        onPageChange={setCurrentPage}
        onPerPageChange={setPerPage}
        isSuperAdmin={isSuperAdmin}
        isRegionAdmin={isRegionAdmin}
        isSektorAdmin={isSektorAdmin}
      />

      {/* Modals */}
      {isModalOpen && (
        <InstitutionModalStandardized
          key={`institution-modal-${selectedInstitution?.id || 'new'}-${Date.now()}`}
          open={isModalOpen}
          onClose={closeModal}
          institution={selectedInstitution}
          onSave={onSave}
        />
      )}

      {isDeleteModalOpen && institutionToDelete && (
        <DeleteInstitutionModal
          open={isDeleteModalOpen}
          onClose={closeDeleteModal}
          institution={institutionToDelete}
          onDelete={handleDelete}
        />
      )}

      {isDetailsModalOpen && selectedInstitution && (
        <InstitutionDetailsModal
          key={`details-modal-${selectedInstitution.id}-${Date.now()}`}
          open={isDetailsModalOpen}
          onClose={closeDetailsModal}
          institution={selectedInstitution}
        />
      )}

      {isImportExportModalOpen && (
        <InstitutionImportExportModal
          open={isImportExportModalOpen}
          onClose={closeImportExportModal}
        />
      )}
    </div>
  );
};

export default InstitutionsPage;