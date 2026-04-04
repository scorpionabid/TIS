import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Building2, MapPin } from 'lucide-react';
import { useRegionalAttendanceData } from './hooks/useRegionalAttendanceData';
import { regionalAttendanceService } from '@/services/regionalAttendance';

// Extracted Components
import { AttendanceFilters } from '@/components/regionadmin/attendance/AttendanceFilters';
import { AttendanceSummaryCards } from '@/components/regionadmin/attendance/AttendanceSummaryCards';
import { SectorAttendanceCharts } from '@/components/regionadmin/attendance/SectorAttendanceCharts';
import { TrendChart } from '@/components/regionadmin/attendance/TrendChart';
import { GradeLevelChart } from '@/components/regionadmin/attendance/GradeLevelChart';
import { SectorIcmalTable } from '@/components/regionadmin/attendance/SectorIcmalTable';
import { AttendanceAlerts } from '@/components/regionadmin/attendance/AttendanceAlerts';
import { SchoolsAttendanceTable } from '@/components/regionadmin/attendance/SchoolsAttendanceTable';
import { SchoolClassesTable } from '@/components/regionadmin/attendance/SchoolClassesTable';
import { GradeLevelStatsTable } from '@/components/regionadmin/attendance/GradeLevelStatsTable';
import { SchoolGradeStatsTable } from '@/components/regionadmin/attendance/SchoolGradeStatsTable';
import { MissingReportsTable } from '@/components/regionadmin/attendance/MissingReportsTable';

export default function RegionAttendanceReports() {
  const {
    currentUser,
    hasAccess,
    startDate, setStartDate,
    endDate, setEndDate,
    datePreset,
    selectedSectorId, setSelectedSectorId,
    selectedSchoolId, setSelectedSchoolId,
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    activeTab, setActiveTab,
    selectedEducationProgram, setSelectedEducationProgram,
    pendingRefresh, setPendingRefresh,
    overview, overviewLoading, overviewFetching, overviewError,
    processedSchools,
    classBreakdown, classLoading, classFetching, classError,
    gradeLevelData, gradeLevelLoading, gradeLevelFetching, gradeLevelError,
    missingReportsData, missingReportsLoading, missingReportsFetching, missingReportsError,
    schoolGradeData, schoolGradeLoading, schoolGradeFetching, schoolGradeError,
    handlePresetChange,
    handleSort,
    filters,
    sectors,
    schools
  } = useRegionalAttendanceData();

  const handleExport = async () => {
    try {
      const blob = await regionalAttendanceService.exportExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `regional_davamiyyet_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleExportGradeLevel = async () => {
    try {
      const blob = await regionalAttendanceService.exportGradeLevelStats(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sinif_statistikasi_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Grade level export error:', error);
    }
  };

  const handleExportMissingReports = async () => {
    try {
      if (!missingReportsData?.schools?.length) return;
      const blob = await regionalAttendanceService.exportMissingReports(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doldurmayan_mektebler_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Missing reports export error:', error);
    }
  };

  const handleExportSchoolGrade = async () => {
    try {
      const blob = await regionalAttendanceService.exportSchoolGradeStats(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mekteb_sinif_statistikasi_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('School grade export error:', error);
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (!error) return '';
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Gözlənilməz xəta baş verdi.';
  };

  const institutionName = currentUser?.region?.name || currentUser?.department?.name || currentUser?.institution?.name || '';
  const selectedSectorName = sectors.find((s) => s.sector_id === Number(selectedSectorId))?.name ?? '';
  const headerChipText = useMemo(() => {
    if (!institutionName) return '';
    if (selectedSectorName) return `${institutionName} · ${selectedSectorName}`;
    return institutionName;
  }, [institutionName, selectedSectorName]);

  const selectedSchoolName = schools.find((s) => s.school_id === Number(selectedSchoolId))?.name ?? '';

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>İcazə yoxdur</AlertTitle>
          <AlertDescription>Bu bölmə üçün Davamiyyət icazəsi (`attendance.read`) tələb olunur.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="px-2 py-4 sm:px-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center shadow-sm">
            <Building2 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Davamiyyət hesabatı</h1>
            <p className="text-sm text-slate-500">Sektorlar və məktəblər üzrə real-vaxt iştirak analitikası</p>
          </div>
        </div>
        {headerChipText && (
          <div className="hidden sm:block">
            <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 shadow-sm max-w-[420px]">
              <div className="flex items-center justify-end gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-700 text-right truncate min-w-0">{headerChipText}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {(overviewError || classError || gradeLevelError || missingReportsError || schoolGradeError) && (
        <Alert variant="destructive">
          <AlertTitle>Hesabat yüklənmədi</AlertTitle>
          <AlertDescription>{getErrorMessage(overviewError || classError || gradeLevelError || missingReportsError || schoolGradeError)}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <AttendanceFilters
        startDate={startDate}
        endDate={endDate}
        selectedSectorId={selectedSectorId}
        selectedEducationProgram={selectedEducationProgram}
        datePreset={datePreset}
        sectors={sectors}
        loading={pendingRefresh || overviewLoading || overviewFetching}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSectorChange={setSelectedSectorId}
        onEducationProgramChange={setSelectedEducationProgram}
        onPresetChange={handlePresetChange}
        onRefresh={() => setPendingRefresh(true)}
        onExport={handleExport}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="inline-flex w-full items-center justify-start overflow-x-auto overflow-y-hidden rounded-2xl bg-slate-100 p-1 gap-1 h-auto scrollbar-hide no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="overview" className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap">Ümumi Panorama</TabsTrigger>
          <TabsTrigger value="classes" className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap">Məktəb & Sinif nəzarəti</TabsTrigger>
          <TabsTrigger value="gradeLevel" className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap">Sinif üzrə statistika</TabsTrigger>
          <TabsTrigger value="schoolGrade" className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap">Məktəb+sinif</TabsTrigger>
          <TabsTrigger value="missingReports" className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap">Doldurmayan məktəblər</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AttendanceSummaryCards summary={overview?.summary} loading={overviewLoading} />
          
          <div className="grid gap-4 md:grid-cols-2">
            <SectorAttendanceCharts sectors={sectors} />
            <TrendChart trends={overview?.trends} />
            <GradeLevelChart gradeLevels={gradeLevelData?.grade_levels} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectorIcmalTable sectors={sectors} loading={overviewLoading} isFetching={overviewFetching} />
            <AttendanceAlerts 
              missingReports={overview?.alerts.missing_reports} 
              lowAttendance={overview?.alerts.low_attendance}
              missingCount={overview?.summary.schools_missing_reports}
            />
          </div>

          <SchoolsAttendanceTable 
            schools={schools}
            processedSchools={processedSchools}
            loading={overviewLoading}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onSort={handleSort}
            onSchoolClick={(id) => { setSelectedSchoolId(id); setActiveTab('classes'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            regionName={institutionName}
          />
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <SchoolClassesTable
            classes={classBreakdown?.classes ?? []}
            loading={classLoading}
            schoolName={selectedSchoolName}
            schools={schools}
            selectedSchoolId={selectedSchoolId}
            onSchoolChange={setSelectedSchoolId}
            summary={classBreakdown?.summary ?? null}
          />
        </TabsContent>

        <TabsContent value="gradeLevel" className="space-y-6">
          <GradeLevelStatsTable 
            gradeLevels={gradeLevelData?.grade_levels ?? []} 
            loading={gradeLevelLoading} 
            onExport={handleExportGradeLevel}
            exportDisabled={gradeLevelLoading || !gradeLevelData}
          />
        </TabsContent>

        <TabsContent value="schoolGrade" className="space-y-6">
          <SchoolGradeStatsTable
            schools={schoolGradeData?.schools ?? []}
            regionalAverages={schoolGradeData?.regional_averages ?? []}
            loading={schoolGradeLoading}
            onExport={handleExportSchoolGrade}
            exportDisabled={schoolGradeLoading || !schoolGradeData}
          />
        </TabsContent>

        <TabsContent value="missingReports" className="space-y-6">
          <MissingReportsTable 
            schools={missingReportsData?.schools ?? []} 
            loading={missingReportsLoading} 
            startDate={startDate} 
            endDate={endDate} 
            onExport={handleExportMissingReports}
            exportDisabled={missingReportsLoading || !missingReportsData?.schools?.length}
            baselineDays={missingReportsData?.summary.period.baseline_days ?? 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
