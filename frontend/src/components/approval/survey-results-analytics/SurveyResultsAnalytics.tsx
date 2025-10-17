import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '../../ui/alert';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { surveyService, Survey } from '../../../services/surveys';
import SurveySelectionCard from './SurveySelectionCard';
import SurveyKPIMetrics from './SurveyKPIMetrics';
import HierarchicalInstitutionAnalysis from './HierarchicalInstitutionAnalysis';
import NonRespondingInstitutions from './NonRespondingInstitutions';
import ResponseDetailsSection from './ResponseDetailsSection';
import { storageHelpers } from '@/utils/helpers';

const STORAGE_KEY = 'surveyResultsAnalytics_selectedSurveyId';

const SurveyResultsAnalytics: React.FC = () => {
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

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

  // Fetch all surveys
  const { data: surveysData, isLoading: surveysLoading, error: surveysError } = useQuery({
    queryKey: ['surveys-for-analytics'],
    queryFn: () => surveyService.getAll({ per_page: 100 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const surveys = surveysData?.data?.data || surveysData?.data || [];

  // Restore selected survey from localStorage or auto-select first
  useEffect(() => {
    if (Array.isArray(surveys) && surveys.length > 0 && !selectedSurvey) {
      const storedSurveyId = getStoredSurveyId();

      if (storedSurveyId) {
        const storedSurvey = surveys.find((s: Survey) => s.id.toString() === storedSurveyId);
        if (storedSurvey) {
          setSelectedSurvey(storedSurvey);
          return;
        }
        storeSurveyId(null);
      }

      // Default to first survey
      const firstSurvey = surveys[0];
      setSelectedSurvey(firstSurvey);
      storeSurveyId(firstSurvey.id.toString());
    }
  }, [surveys, selectedSurvey]);

  // Fetch analytics data for selected survey
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['survey-analytics-overview', selectedSurvey?.id],
    queryFn: () => selectedSurvey ? surveyService.getSurveyAnalyticsOverview(selectedSurvey.id) : null,
    enabled: !!selectedSurvey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch hierarchical data
  const { data: hierarchyData, isLoading: hierarchyLoading } = useQuery({
    queryKey: ['survey-hierarchical-institutions', selectedSurvey?.id],
    queryFn: () => selectedSurvey ? surveyService.getHierarchicalInstitutionsAnalytics(selectedSurvey.id) : null,
    enabled: !!selectedSurvey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleSurveyChange = (survey: Survey) => {
    setSelectedSurvey(survey);
    storeSurveyId(survey.id.toString());
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Sorğu Nəticələri Analitikası
        </h1>
        <p className="text-muted-foreground mt-1">
          Sorğuların statistik təhlili və hesabatlar
        </p>
      </div>

      {/* Error Alert */}
      {surveysError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Məlumatlar yüklənərkən xəta baş verdi. Səhifəni yeniləyin.
          </AlertDescription>
        </Alert>
      )}

      {/* Survey Selection */}
      <SurveySelectionCard
        surveys={surveys}
        selectedSurvey={selectedSurvey}
        onSurveyChange={handleSurveyChange}
        isLoading={surveysLoading}
      />

      {/* Analytics Content - Only show when survey is selected */}
      {selectedSurvey && (
        <>
          {/* KPI Metrics */}
          <SurveyKPIMetrics
            data={analyticsData?.kpi_metrics}
            isLoading={analyticsLoading}
          />

          {/* Hierarchical Institution Analysis */}
          <HierarchicalInstitutionAnalysis
            data={hierarchyData}
            isLoading={hierarchyLoading}
          />

          {/* Non-Responding Institutions */}
          <NonRespondingInstitutions
            hierarchyData={hierarchyData}
            isLoading={hierarchyLoading}
          />

          {/* Response Details (Expandable) */}
          <ResponseDetailsSection survey={selectedSurvey} />
        </>
      )}
    </div>
  );
};

export default React.memo(SurveyResultsAnalytics);
