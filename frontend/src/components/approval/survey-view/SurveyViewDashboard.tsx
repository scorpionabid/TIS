import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import {
  Eye,
  Target,
  BarChart3,
  AlertTriangle,
  Users
} from 'lucide-react';
import surveyApprovalService, { PublishedSurvey } from '../../../services/surveyApproval';
import SurveyResponsesDataTable from './SurveyResponsesDataTable';
import { storageHelpers } from '@/utils/helpers';

const STORAGE_KEY = 'surveyViewDashboard_selectedSurveyId';

const SurveyViewDashboard: React.FC = () => {
  const [selectedSurvey, setSelectedSurvey] = useState<PublishedSurvey | null>(null);

  // Helper functions for localStorage
  const getStoredSurveyId = (): string | null => {
    try {
      return storageHelpers.get<string>(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to read from local storage:', error);
      return null;
    }
  };

  const storeSurveyId = (surveyId: string | null) => {
    try {
      if (surveyId) {
        storageHelpers.set(STORAGE_KEY, surveyId);
      } else {
        storageHelpers.remove(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to write to local storage:', error);
    }
  };

  // Fetch published surveys
  const { data: publishedSurveys, isLoading: surveysLoading } = useQuery({
    queryKey: ['published-surveys-view'],
    queryFn: () => surveyApprovalService.getPublishedSurveys(),
    staleTime: 5 * 60 * 1000
  });


  // Fetch survey responses when survey is selected
  const { data: responsesData, isLoading: responsesLoading } = useQuery({
    queryKey: ['survey-responses-view', selectedSurvey?.id],
    queryFn: () => selectedSurvey ? surveyApprovalService.getResponsesForApproval(selectedSurvey.id, { per_page: 100 }) : null,
    enabled: !!selectedSurvey,
    staleTime: 30 * 1000
  });

  // Restore selected survey from localStorage or auto-select first survey
  useEffect(() => {
    if (Array.isArray(publishedSurveys) && publishedSurveys.length > 0 && !selectedSurvey) {
      const storedSurveyId = getStoredSurveyId();

      if (storedSurveyId) {
        // Try to find the stored survey in the current list
        const storedSurvey = publishedSurveys.find(
          (survey: any) => survey.id.toString() === storedSurveyId
        );

        if (storedSurvey) {
          setSelectedSurvey(storedSurvey);
          return;
        }
        // If stored survey not found, clear it from storage
        storeSurveyId(null);
      }

      // Default to first survey if no valid stored survey
      const firstSurvey = publishedSurveys[0];
      setSelectedSurvey(firstSurvey);
      storeSurveyId(firstSurvey.id.toString()); // Save default selection
    }
  }, [publishedSurveys, selectedSurvey]);

  const responses = responsesData?.responses || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Eye className="h-8 w-8 text-primary" />
          Sorğulara Baxış
        </h1>
        <p className="text-muted-foreground mt-1">
          Sorğulara verilən cavabları görüntüləyin və analiz edin
        </p>
      </div>

      {/* Survey Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Sorğu Seçimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {surveysLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              Sorğular yüklənir...
            </div>
          ) : !Array.isArray(publishedSurveys) || publishedSurveys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4" />
              <p>Hazırda yayımlanmış sorğu yoxdur</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Select
                value={selectedSurvey?.id?.toString() || ""}
                onValueChange={(value) => {
                  const survey = publishedSurveys.find((s: any) => s.id.toString() === value);
                  if (survey) {
                    setSelectedSurvey(survey);
                    storeSurveyId(value); // Save selection to localStorage
                  }
                }}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Sorğu seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(publishedSurveys) && publishedSurveys.map((survey: any) => (
                    <SelectItem key={survey.id} value={survey.id.toString()}>
                      {survey.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSurvey && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {selectedSurvey.current_questions_count || selectedSurvey.questions?.length || 0} sual
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {selectedSurvey.target_institutions?.length || 0} müəssisə
                    </div>
                  </div>
                  {selectedSurvey.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedSurvey.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey Responses Data Table */}
      {selectedSurvey && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sorğu Cavabları
              {responses.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {responses.length} müəssisə
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedSurvey.title} sorğusuna verilən cavablar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responsesLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Cavablar yüklənir...</span>
              </div>
            ) : responses.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bu sorğuya hələ cavab verilməyib.
                </AlertDescription>
              </Alert>
            ) : (
              <SurveyResponsesDataTable responses={responses} selectedSurvey={selectedSurvey} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default React.memo(SurveyViewDashboard);
