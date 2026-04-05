import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, School, Building2, UserCheck, Upload, Download } from 'lucide-react';
import { RegionStudentImportExportModal } from '@/components/modals/RegionStudentImportExportModal';

import { useRegionStudentState } from './useRegionStudentState';
import { useRegionStudentData }  from './useRegionStudentData';
import { StudentFilters }        from './StudentFilters';
import { StudentTable }          from './StudentTable';
import { StudentDetailDialog }   from './StudentDetailDialog';

export const RegionStudents = () => {
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const state = useRegionStudentState();

  const data = useRegionStudentData({
    search:        state.search,
    sectorId:      state.sectorId,
    schoolId:      state.schoolId,
    gradeLevel:    state.gradeLevel,
    className:     state.className,
    isActive:      state.isActive,
    sortColumn:    state.sortColumn,
    sortDirection: state.sortDirection,
    page:          state.page,
    perPage:       state.perPage,
  });

  const totalPages = data.pagination?.last_page ?? 1;
  const totalItems = data.pagination?.total    ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Region Şagirdləri</h1>
          <p className="text-muted-foreground mt-1">
            Region daxilindəki bütün şagirdləri izləyin
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsImportExportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsImportExportOpen(true)}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cəmi Şagird</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.isLoading ? '...' : (data.statistics?.total_students ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bütün məktəblərdə</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Şagird</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.isLoading ? '...' : (data.statistics?.active_students ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cari tədris ilində</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Məktəblər</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.isLoading ? '...' : data.statistics?.total_schools ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Region daxilində</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sektorlar</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.isLoading ? '...' : data.statistics?.total_sectors ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aktiv sektor</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <StudentFilters
        search={state.search}
        sectorId={state.sectorId}
        schoolId={state.schoolId}
        gradeLevel={state.gradeLevel}
        isActive={state.isActive}
        sectors={data.sectors}
        schools={data.schools}
        hasActiveFilters={state.hasActiveFilters}
        onSearchChange={state.handleSearchChange}
        onSectorChange={state.handleSectorChange}
        onSchoolChange={state.handleSchoolChange}
        onGradeChange={state.handleGradeChange}
        onStatusChange={state.handleStatusChange}
        onClearFilters={state.clearFilters}
      />

      {/* Table */}
      <StudentTable
        students={data.students}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={state.page}
        perPage={state.perPage}
        isLoading={data.isLoading}
        isFetching={data.isFetching}
        isError={data.isError}
        errorMessage={data.isError ? data.errorMessage : null}
        sortColumn={state.sortColumn}
        sortDirection={state.sortDirection}
        onSort={state.handleSort}
        onViewDetail={state.openDetail}
        onPageChange={state.setPage}
        onPerPageChange={state.setPerPage}
      />

      {/* Detail dialog */}
      <StudentDetailDialog
        student={state.selectedStudent}
        open={state.isDetailOpen}
        onClose={state.closeDetail}
      />

      {/* Import / Export modal */}
      <RegionStudentImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        currentFilters={{
          sector_id:   state.sectorId,
          school_id:   state.schoolId,
          grade_level: state.gradeLevel || undefined,
          is_active:   state.isActive   || undefined,
        }}
      />
    </div>
  );
};

export default RegionStudents;
