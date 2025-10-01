import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { ChevronDown, ChevronUp, Table, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import surveyApprovalService from '../../../services/surveyApproval';
import { Survey } from '../../../services/surveys';
import SurveyResponsesDataTable from '../survey-view/SurveyResponsesDataTable';

interface ResponseDetailsSectionProps {
  survey: Survey;
}

const ResponseDetailsSection: React.FC<ResponseDetailsSectionProps> = ({ survey }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only fetch when expanded
  const { data: responsesData, isLoading } = useQuery({
    queryKey: ['survey-responses-details', survey.id],
    queryFn: () => surveyApprovalService.getResponsesForApproval(survey.id, { per_page: 100 }),
    enabled: isExpanded,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const responses = responsesData?.responses || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table className="h-5 w-5 text-primary" />
            Cavab Təfərrüatları
          </CardTitle>
          <div className="flex items-center gap-2">
            {responses.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {responses.length} müəssisə
              </span>
            )}
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
                  Bütün cavabları göstər
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
                  ...survey,
                  questions: survey.questions || []
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
