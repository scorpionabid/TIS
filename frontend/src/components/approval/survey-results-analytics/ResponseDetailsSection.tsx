import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { ChevronDown, ChevronUp, Table, Download, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import surveyApprovalService from '../../../services/surveyApproval';
import { Survey } from '../../../services/surveys';
import SurveyResponsesDataTable from '../survey-view/SurveyResponsesDataTable';
import { useToast } from '../../../hooks/use-toast';

interface ResponseDetailsSectionProps {
  survey: Survey;
}

const ResponseDetailsSection: React.FC<ResponseDetailsSectionProps> = ({ survey }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Only fetch when expanded
  const { data: responsesData, isLoading } = useQuery({
    queryKey: ['survey-responses-details', survey.id],
    queryFn: () => surveyApprovalService.getResponsesForApproval(survey.id, { per_page: 1000 }),
    enabled: isExpanded,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const responses = responsesData?.responses || [];

  // Export all survey responses (no filters - gets ALL responses for this survey)
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      toast({
        title: 'İxrac başladı',
        description: 'Bütün cavablar ixrac edilir... Bu bir neçə dəqiqə çəkə bilər.',
      });

      const blob = await surveyApprovalService.exportSurveyResponses(survey.id, {
        format: 'xlsx'
        // NO per_page limit - backend will handle all responses with chunking
      });

      surveyApprovalService.downloadExportedFile(blob, survey.id, 'xlsx');

      toast({
        title: 'Uğurlu',
        description: 'Bütün cavablar uğurla ixrac edildi',
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Xəta',
        description: error.message || 'İxrac zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table className="h-5 w-5 text-primary" />
            Cavab Təfərrüatları
          </CardTitle>
          <div className="flex items-center gap-3">
            {responses.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {responses.length} müəssisə
              </span>
            )}
            {/* Export All Button - Always visible */}
            <Button
              variant="default"
              size="sm"
              onClick={handleExportAll}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  İxrac edilir...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Bütün cavabları ixrac et
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Gizlət
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Cavabları göstər
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Cavablar yüklənir...</span>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Table className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Hələ cavab verilməyib</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <SurveyResponsesDataTable
                responses={responses}
                selectedSurvey={{
                  id: survey.id,
                  title: survey.title,
                  description: survey.description,
                  questions: (survey.questions || []).map((q, idx) => ({
                    id: q.id || idx,
                    title: q.title,
                    type: q.type,
                    options: q.options,
                    required: q.required || q.is_required,
                    order_index: q.order_index || q.order || idx
                  }))
                }}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ResponseDetailsSection;
