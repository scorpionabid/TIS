import { useState, useCallback } from 'react';
import { useToast } from '../../../../hooks/use-toast';
import {
  ResponseFilters,
  surveyApprovalService
} from "../../../../services/surveyApproval";

interface UseExportActionsProps {
  selectedSurvey?: { id: number; title: string };
  selectedResponses: number[];
  filters: ResponseFilters;
}

export const useExportActions = ({
  selectedSurvey,
  selectedResponses,
  filters
}: UseExportActionsProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async (format: 'xlsx' | 'csv' = 'xlsx') => {
    console.log('📤 [EXPORT] Export started:', {
      selectedSurvey,
      selectedResponses: selectedResponses.length,
      filters,
      format
    });

    if (!selectedSurvey) {
      toast({
        title: "Xəta",
        description: "İxrac etmək üçün sorğu seçilməlidir",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportFilters = {
        ...filters,
        format,
        // Include selected responses if any are selected
        ...(selectedResponses.length > 0 && { response_ids: selectedResponses })
      };

      console.log('📤 [EXPORT] Calling API with filters:', exportFilters);

      const blob = await surveyApprovalService.exportSurveyResponses(
        selectedSurvey.id,
        exportFilters
      );

      console.log('✅ [EXPORT] File downloaded successfully:', {
        size: blob.size,
        type: blob.type
      });

      // Download the file
      surveyApprovalService.downloadExportedFile(blob, selectedSurvey.id, format);

      const formatText = format === 'xlsx' ? 'Excel' : 'CSV';
      const selectionText = selectedResponses.length > 0
        ? ` (${selectedResponses.length} seçilmiş cavab)`
        : '';

      toast({
        title: "İxrac uğurlu",
        description: `${formatText} faylı uğurla yükləndi${selectionText}`,
        variant: "default",
      });

      console.log('✅ [EXPORT] Export process completed successfully');

    } catch (error: any) {
      console.error('❌ [EXPORT] Export failed:', error);

      let errorMessage = 'İxrac zamanı xəta baş verdi';

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status) {
        switch (error.response.status) {
          case 403:
            errorMessage = 'İxrac etmək üçün icazəniz yoxdur';
            break;
          case 404:
            errorMessage = 'Sorğu və ya cavablar tapılmadı';
            break;
          case 422:
            errorMessage = 'İxrac parametrlərində xəta';
            break;
          case 500:
            errorMessage = 'Server xətası baş verdi';
            break;
          default:
            errorMessage = `Server xətası (${error.response.status})`;
        }
      }

      toast({
        title: "İxrac xətası",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      console.log('🔚 [EXPORT] Export process finished, isExporting set to false');
    }
  }, [selectedSurvey, filters, selectedResponses, toast]);

  return {
    handleExport,
    isExporting,
    canExport: !!selectedSurvey
  };
};