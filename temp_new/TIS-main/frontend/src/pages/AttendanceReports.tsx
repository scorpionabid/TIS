import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAttendanceReports } from './hooks/useAttendanceReports';
import { AttendanceFilters } from '@/components/attendance/AttendanceFilters';
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AttendanceReports({ embedded = false }: { embedded?: boolean } = {}) {
  const {
    isSchoolAdmin,
    hasAccess,
    selectedSchool, setSelectedSchool,
    selectedClass, setSelectedClass,
    reportType, setReportType,
    startDate, setStartDate,
    endDate, setEndDate,
    activeDatePreset, setActiveDatePreset,
    page, setPage,
    perPage, setPerPage,
    isExporting,
    sortField, setSortField,
    sortDirection, setSortDirection,
    schools, schoolsError,
    attendanceData,
    attendanceMeta,
    attendanceLoading, attendanceFetching, attendanceError, refetch,
    statsData, statsLoading, statsError,
    classOptions, classOptionsLoading, classOptionsError,
    handleExportReport, handlePresetSelect, handleResetFilters
  } = useAttendanceReports();

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">Bu bölməni görmək üçün Davamiyyət icazəsi tələb olunur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {!embedded && (
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Davamiyyət hesabatları</h1>
          <p className="text-sm text-muted-foreground">Detallı davamiyyət analizi və statistika</p>
        </div>
      )}

      {(attendanceError || schoolsError || classOptionsError) && (
        <Alert variant="destructive">
          <AlertTitle>Xəta baş verdi</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>Məlumatlar yüklənərkən xəta yarandı.</span>
            <Button size="sm" onClick={() => refetch()} variant="secondary">Yenidən cəhd et</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <AttendanceSummaryCards 
        stats={statsData} 
        loading={statsLoading} 
        startDate={startDate} 
        endDate={endDate} 
        activePreset={activeDatePreset} 
      />

      {/* Filters */}
      <AttendanceFilters 
        isSchoolAdmin={isSchoolAdmin}
        schools={schools}
        classOptions={classOptions}
        classOptionsLoading={classOptionsLoading}
        filters={{ selectedSchool, selectedClass, reportType, startDate, endDate, activeDatePreset }}
        setters={{ setSelectedSchool, setSelectedClass, setReportType, setStartDate, setEndDate, setActiveDatePreset }}
        actions={{ refetch, handleExportReport, handlePresetSelect }}
        loading={attendanceLoading}
        isFetching={attendanceFetching}
        isExporting={isExporting}
      />

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Davamiyyət Qeydləri</CardTitle>
          <p className="text-sm text-muted-foreground">
            {attendanceData.length} {reportType === 'daily' ? 'günlük' : reportType === 'weekly' ? 'həftəlik' : 'aylıq'} qeyd tapıldı
          </p>
        </CardHeader>
        <CardContent>
          <AttendanceTable 
            data={attendanceData}
            loading={attendanceLoading}
            isSchoolAdmin={isSchoolAdmin}
            reportType={reportType}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={(field) => {
                setSortField(field);
                setSortDirection(prev => sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
                setPage(1);
            }}
            pagination={{
              currentPage: attendanceMeta?.current_page || page,
              totalPages: attendanceMeta?.last_page || 1,
              totalItems: attendanceMeta?.total || 0,
              itemsPerPage: attendanceMeta?.per_page || perPage,
              startIndex: attendanceMeta?.from ? attendanceMeta.from - 1 : 0,
              endIndex: attendanceMeta?.to || 0,
              onPageChange: setPage,
              onItemsPerPageChange: (val) => { setPerPage(val); setPage(1); }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
