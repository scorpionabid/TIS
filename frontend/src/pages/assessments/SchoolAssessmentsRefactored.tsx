import React from 'react';
import { Plus, Download, Loader2, AlertTriangle, BarChart3, FileText, School, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickAuth } from '@/components/auth/QuickAuth';
import { AssessmentCreateModal } from '@/components/modals/AssessmentCreateModal';
import AssessmentTypeModal from '@/components/modals/AssessmentTypeModal';
import { useSchoolAssessments } from './hooks/useSchoolAssessments';
import { AssessmentFilters } from './AssessmentFilters';
import { AssessmentSummaryStats } from './AssessmentSummaryStats';
import { AssessmentOverviewTab } from './AssessmentOverviewTab';
import { AssessmentTypesTab } from './AssessmentTypesTab';
import { KSQAssessmentsTab } from './KSQAssessmentsTab';
import { BSQAssessmentsTab } from './BSQAssessmentsTab';

export default function SchoolAssessments() {
  const {
    // State
    filters,
    selectedTab,
    searchTerm,
    isCreateModalOpen,
    isAssessmentTypeModalOpen,
    selectedAssessmentType,
    
    // Data
    assessmentTypes,
    assessmentData,
    analyticsData,
    summaryStats,
    
    // Loading states
    isLoading,
    analyticsLoading,
    error,
    
    // Actions
    setFilters,
    setSelectedTab,
    setSearchTerm,
    setIsCreateModalOpen,
    setIsAssessmentTypeModalOpen,
    handleCreateAssessment,
    handleExportData,
    handleApproveAssessment,
    handleCreateAssessmentType,
    handleEditAssessmentType,
    handleAssessmentTypeSuccess,
    handleDeleteAssessmentType,
    handleToggleAssessmentTypeStatus,
    refetch,
    
    // Utilities
    getScoreColor
  } = useSchoolAssessments();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Qiymətləndirmə məlumatları yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Assessment fetch error:', error);
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Xəta baş verdi</h3>
              <p className="text-muted-foreground">Qiymətləndirmə məlumatları yüklənərkən problem yarandı.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Error: {error instanceof Error ? error.message : 'Bilinməyən xəta'}
              </p>
            </div>
            <Button onClick={() => refetch()}>Yenidən cəhd et</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <QuickAuth />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Qiymətləndirmələr</h1>
          <p className="text-muted-foreground">Təhsil müəssisəsinin performans qiymətləndirilməsi və analitikası</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
          <Button variant="outline" onClick={handleCreateAssessmentType}>
            <Plus className="h-4 w-4 mr-2" />
            Qiymətləndirmə Növü
          </Button>
          <Button onClick={handleCreateAssessment}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Qiymətləndirmə
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AssessmentFilters
        filters={filters}
        setFilters={setFilters}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Summary Statistics */}
      <AssessmentSummaryStats
        summaryStats={summaryStats}
        getScoreColor={getScoreColor}
      />

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Ümumi Baxış</span>
          </TabsTrigger>
          <TabsTrigger value="assessment-types" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Qiymətləndirmə Növləri</span>
          </TabsTrigger>
          <TabsTrigger value="ksq" className="flex items-center space-x-2">
            <School className="h-4 w-4" />
            <span>KSQ Qiymətləndirmələr</span>
          </TabsTrigger>
          <TabsTrigger value="bsq" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>BSQ Qiymətləndirmələr</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AssessmentOverviewTab
            assessmentData={assessmentData}
            analyticsData={analyticsData}
            analyticsLoading={analyticsLoading}
            getScoreColor={getScoreColor}
            getStatusBadge={() => null} // Utility function moved to component
          />
        </TabsContent>

        <TabsContent value="assessment-types" className="space-y-4">
          <AssessmentTypesTab
            assessmentTypes={assessmentTypes}
            handleCreateAssessmentType={handleCreateAssessmentType}
            handleEditAssessmentType={handleEditAssessmentType}
            handleToggleAssessmentTypeStatus={handleToggleAssessmentTypeStatus}
            handleDeleteAssessmentType={handleDeleteAssessmentType}
          />
        </TabsContent>

        <TabsContent value="ksq" className="space-y-4">
          <KSQAssessmentsTab
            assessmentData={assessmentData}
            handleApproveAssessment={handleApproveAssessment}
            getScoreColor={getScoreColor}
          />
        </TabsContent>

        <TabsContent value="bsq" className="space-y-4">
          <BSQAssessmentsTab
            assessmentData={assessmentData}
            handleApproveAssessment={handleApproveAssessment}
            getScoreColor={getScoreColor}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AssessmentCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAssessmentCreated={() => {
          refetch();
          setIsCreateModalOpen(false);
        }}
      />

      <AssessmentTypeModal
        isOpen={isAssessmentTypeModalOpen}
        onClose={() => setIsAssessmentTypeModalOpen(false)}
        assessmentType={selectedAssessmentType}
        onSuccess={handleAssessmentTypeSuccess}
      />
    </div>
  );
}