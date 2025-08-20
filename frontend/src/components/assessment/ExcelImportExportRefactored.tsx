import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileSpreadsheet } from 'lucide-react';

import { useExcelImportExport } from './hooks/useExcelImportExport';
import { ImportForm } from './ImportForm';
import { ExportForm } from './ExportForm';
import { ImportResultsDisplay } from './ImportResultsDisplay';
import { ProgressTracker } from './ProgressTracker';
import type { ImportResult } from './hooks/useExcelImportExport';

interface ExcelImportExportProps {
  selectedInstitution?: number;
  selectedAssessmentType?: number;
  onImportComplete?: (result: ImportResult) => void;
}

export const ExcelImportExportRefactored: React.FC<ExcelImportExportProps> = ({
  selectedInstitution,
  selectedAssessmentType,
  onImportComplete
}) => {
  const {
    // State
    selectedTab,
    importing,
    exporting,
    uploadProgress,
    importResult,
    selectedFile,
    importForm,
    exportForm,
    institutions,
    assessmentTypes,
    loadingData,
    fileInputRef,
    
    // Actions
    setSelectedTab,
    setImportForm,
    setExportForm,
    
    // Event handlers
    handleFileSelect,
    handleImport,
    handleExport,
    clearImportResult,
    downloadTemplate,
    
    // Utilities
    validateImportForm,
    validateExportForm,
    getGradeLevels,
    getFormatOptions
  } = useExcelImportExport(selectedInstitution, selectedAssessmentType);

  // Handle import completion callback
  const handleImportInternal = async () => {
    await handleImport();
    if (importResult && onImportComplete) {
      onImportComplete(importResult);
    }
  };

  // Create progress steps for import process
  const importProgressSteps = [
    {
      id: 'validate',
      title: 'Fayl yoxlanılır',
      description: 'Fayl formatı və məzmunu yoxlanılır',
      status: importing ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      title: 'Fayl yüklənir',
      description: 'Fayl serverə göndərilir',
      status: importing ? (uploadProgress > 0 ? 'completed' : 'in_progress') : 'pending',
      progress: uploadProgress
    },
    {
      id: 'process',
      title: 'Məlumatlar emal edilir',
      description: 'Excel məlumatları oxunur və yoxlanılır',
      status: importing ? (uploadProgress >= 90 ? 'in_progress' : 'pending') : 'pending'
    },
    {
      id: 'save',
      title: 'Məlumatlar saxlanılır',
      description: 'Təsdiqlənmiş məlumatlar bazaya yazılır',
      status: importing ? (uploadProgress === 100 ? 'completed' : 'pending') : 'pending'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel İmport/Export
          </CardTitle>
          <CardDescription>
            Qiymətləndirmə məlumatlarını Excel vasitəsilə kütləvi şəkildə idarə edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="import" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                İmport (Daxil etmə)
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export (İxrac)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="space-y-6">
              <ImportForm
                importForm={importForm}
                setImportForm={setImportForm}
                institutions={institutions}
                assessmentTypes={assessmentTypes}
                selectedFile={selectedFile}
                importing={importing}
                loadingData={loadingData}
                validateImportForm={validateImportForm}
                getGradeLevels={getGradeLevels}
                onFileSelect={handleFileSelect}
                onImport={handleImportInternal}
                onDownloadTemplate={downloadTemplate}
                fileInputRef={fileInputRef}
              />

              {/* Import Progress */}
              {importing && (
                <ProgressTracker
                  title="İmport Prosesi"
                  description="Fayl import edilir, zəhmət olmasa gözləyin..."
                  steps={importProgressSteps}
                  overallProgress={uploadProgress}
                  variant="import"
                  showEstimatedTime={true}
                  estimatedTimeRemaining={uploadProgress > 0 ? ((100 - uploadProgress) * 2) : undefined}
                />
              )}

              {/* Import Results */}
              {importResult && !importing && (
                <ImportResultsDisplay
                  importResult={importResult}
                  onClear={clearImportResult}
                />
              )}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <ExportForm
                exportForm={exportForm}
                setExportForm={setExportForm}
                institutions={institutions}
                assessmentTypes={assessmentTypes}
                exporting={exporting}
                loadingData={loadingData}
                validateExportForm={validateExportForm}
                getGradeLevels={getGradeLevels}
                getFormatOptions={getFormatOptions}
                onExport={handleExport}
              />

              {/* Export Progress */}
              {exporting && (
                <ProgressTracker
                  title="Export Prosesi"
                  description="Məlumatlar hazırlanır və fayl yaradılır..."
                  steps={[
                    {
                      id: 'filter',
                      title: 'Məlumatlar filtrlənir',
                      description: 'Seçilmiş kriteriylərə uyğun məlumatlar tapılır',
                      status: 'completed'
                    },
                    {
                      id: 'format',
                      title: 'Fayl formatlanır',
                      description: 'Məlumatlar seçilmiş formata çevrilir',
                      status: 'in_progress'
                    },
                    {
                      id: 'download',
                      title: 'Fayl yüklənir',
                      description: 'Hazır fayl endirilmək üçün təqdim edilir',
                      status: 'pending'
                    }
                  ]}
                  variant="export"
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};