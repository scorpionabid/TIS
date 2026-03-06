import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/constants/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Users, School, TrendingUp } from "lucide-react";
import { AcademicYearManager } from "@/components/academic-years/AcademicYearManager";
import { RegionClassImportModal } from "@/components/modals/RegionClassImportModal";

import { useClassManagementState } from "./useClassManagementState";
import { useClassManagementData } from "./useClassManagementData";
import { ClassFilters } from "./ClassFilters";
import { ClassTable } from "./ClassTable";
import { ClassEditDialog } from "./ClassEditDialog";
import { ClassDeleteDialogs } from "./ClassDeleteDialogs";
import type { ActiveTab } from "./types";

export const RegionClassManagement = () => {
  const { currentUser, hasRole } = useAuth();
  const isSuperAdmin = hasRole(USER_ROLES.SUPERADMIN);

  const state = useClassManagementState();

  const data = useClassManagementData({
    isSuperAdmin,
    selectedRegionId: state.selectedRegionId,
    setSelectedRegionId: state.setSelectedRegionId,
    searchTerm: state.searchTerm,
    institutionFilter: state.institutionFilter,
    classLevelFilter: state.classLevelFilter,
    academicYearFilter: state.academicYearFilter,
    statusFilter: state.statusFilter,
    page: state.page,
    perPage: state.perPage,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
    selectedClasses: state.selectedClasses,
    setSelectedClasses: state.setSelectedClasses,
    onEditSuccess: state.handleCloseEditDialog,
    setIsSaving: state.setIsSaving,
    setIsDeleting: state.setIsDeleting,
    setDeleteTarget: (v) => {
      // Only used for cleanup in handleConfirmDelete finally block
      if (v === null) state.closeDeleteDialog();
    },
    setIsBulkDeleting: state.setIsBulkDeleting,
    setIsBulkDeleteDialogOpen: state.setIsBulkDeleteDialogOpen,
  });

  return (
    <div className="p-6">
      <Tabs
        value={state.activeTab}
        onValueChange={(value) => state.setActiveTab(value as ActiveTab)}
        className="space-y-6"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="classes">Siniflər</TabsTrigger>
          <TabsTrigger value="academic-years">Təhsil illəri</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Sinif İdarəetməsi
            </h1>
            <p className="text-muted-foreground mt-2">
              Region daxilindəki bütün sinifləri idarə edin və bulk əməliyyatlar
              aparın
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cəmi Siniflər
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.statsUnavailable
                    ? "..."
                    : (data.stats?.total_classes ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bütün müəssisələrdə
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Aktiv Siniflər
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data.statsUnavailable
                    ? "..."
                    : (data.stats?.active_classes ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cari tədris ilində
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cəmi Şagirdlər
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.statsUnavailable
                    ? "..."
                    : (data.stats?.total_students ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bütün siniflərdə
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Müəssisələr
                </CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isSuperAdmin && data.waitingForRegionSelection
                    ? "..."
                    : (data.classesData?.total_institutions ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isSuperAdmin && data.waitingForRegionSelection
                    ? "Region seçin"
                    : data.classesData?.region_name || "Region"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <ClassFilters
            searchTerm={state.searchTerm}
            institutionFilter={state.institutionFilter}
            classLevelFilter={state.classLevelFilter}
            academicYearFilter={state.academicYearFilter}
            statusFilter={state.statusFilter}
            isSuperAdmin={isSuperAdmin}
            selectedRegionId={state.selectedRegionId}
            regionOptions={data.regionOptions}
            regionsLoading={data.regionsLoading}
            institutions={data.institutions}
            academicYears={data.academicYears}
            selectedClassCount={state.selectedClasses.length}
            hasActiveFilters={state.hasActiveFilters}
            activeFilterCount={state.activeFilterCount}
            onSearchChange={state.handleSearchChange}
            onInstitutionFilterChange={state.setInstitutionFilterAndReset}
            onClassLevelFilterChange={state.setClassLevelFilterAndReset}
            onAcademicYearFilterChange={state.setAcademicYearFilterAndReset}
            onStatusFilterChange={state.setStatusFilterAndReset}
            onClearFilters={state.handleClearFilters}
            onRegionChange={state.setRegionIdAndReset}
            onBulkDelete={state.openBulkDeleteDialog}
            onClearSelection={state.handleClearSelection}
            onImport={() => state.setIsImportModalOpen(true)}
            onExport={data.handleExport}
          />

          {/* Table */}
          <ClassTable
            classes={data.classes}
            totalItems={data.totalItems}
            totalPages={data.totalPages}
            currentPage={data.currentPage}
            perPage={state.perPage}
            classesLoading={data.classesLoading}
            isFetching={data.isFetching}
            classesErrorMessage={data.classesErrorMessage}
            waitingForRegionSelection={data.waitingForRegionSelection}
            regionsLoading={data.regionsLoading}
            selectedClasses={state.selectedClasses}
            allPageSelected={data.allPageSelected}
            partiallySelected={data.partiallySelected}
            sortColumn={state.sortColumn}
            sortDirection={state.sortDirection}
            onSelectRow={state.handleSelectRow}
            onSelectAllOnPage={(checked) =>
              state.handleSelectAllOnPage(checked, data.classesOnPageIds)
            }
            onSort={state.handleSort}
            onEdit={state.openEditDialog}
            onDelete={state.openDeleteDialog}
            onPageChange={state.setPage}
            onPerPageChange={(value) => {
              state.setPerPage(value);
              state.setPage(1);
            }}
            onRetry={() => data.refetch()}
          />

          {/* Edit Dialog */}
          <ClassEditDialog
            isOpen={state.isEditDialogOpen}
            editingClass={state.editingClass}
            editForm={state.editForm}
            setEditForm={state.setEditForm}
            isSaving={state.isSaving}
            onClose={state.handleCloseEditDialog}
            onSubmit={() => {
              if (state.editingClass) {
                data.handleEditSubmit(state.editForm, state.editingClass);
              }
            }}
          />

          {/* Delete Dialogs */}
          <ClassDeleteDialogs
            deleteTarget={state.deleteTarget}
            isDeleting={state.isDeleting}
            onConfirmDelete={() => {
              if (state.deleteTarget) {
                data.handleConfirmDelete(state.deleteTarget);
              }
            }}
            onCancelDelete={state.closeDeleteDialog}
            isBulkDeleteDialogOpen={state.isBulkDeleteDialogOpen}
            isBulkDeleting={state.isBulkDeleting}
            selectedCount={state.selectedClasses.length}
            onConfirmBulkDelete={() =>
              data.handleConfirmBulkDelete(state.selectedClasses)
            }
            onCancelBulkDelete={state.closeBulkDeleteDialog}
          />

          {/* Import Modal */}
          <RegionClassImportModal
            isOpen={state.isImportModalOpen}
            onClose={() => {
              state.setIsImportModalOpen(false);
              data.refetch();
            }}
          />
        </TabsContent>

        <TabsContent value="academic-years" className="mt-6">
          <AcademicYearManager
            currentUser={currentUser}
            enableAutoGeneration
            queryKey={["regionadmin", "academic-years-management"]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegionClassManagement;
