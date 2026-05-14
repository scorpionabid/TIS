import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '../../ui/alert';
import { AlertTriangle, BarChart3, Search } from 'lucide-react';
import { Input } from '../../ui/input';
import { surveyService, Survey } from '../../../services/surveys';
import surveyApprovalService from '../../../services/surveyApproval';
import UnifiedSurveySelector from '../UnifiedSurveySelector';
import SurveyKPIMetrics from './SurveyKPIMetrics';
import HierarchicalInstitutionAnalysis from './HierarchicalInstitutionAnalysis';
import NonRespondingInstitutions from './NonRespondingInstitutions';
import ResponseDetailsSection from './ResponseDetailsSection';
import SurveyQuestionResults from './SurveyQuestionResults';
import { storageHelpers } from '@/utils/helpers';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'surveyResultsAnalytics_selectedSurveyId';

interface SurveyResultsAnalyticsProps {
  forceSurveyId?: number;
  isCompact?: boolean;
  initialData?: Survey;
  headerActions?: React.ReactNode;
}

const SurveyResultsAnalytics: React.FC<SurveyResultsAnalyticsProps> = ({ forceSurveyId, isCompact, initialData, headerActions }) => {
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(initialData || null);

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

  // Fetch all surveys using the unified approval service
  const { data: surveys, isLoading: surveysLoading, error: surveysError } = useQuery({
    queryKey: ['surveys-for-approval'], // Use common key for consistency
    queryFn: () => surveyApprovalService.getPublishedSurveys(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Restore selected survey from localStorage or auto-select first
  useEffect(() => {
    if (initialData) {
      setSelectedSurvey(initialData);
      return;
    }

    if (forceSurveyId) {

      const forcedFromList = Array.isArray(surveys) 
        ? (surveys as any[]).find((s: any) => s.id === forceSurveyId)
        : null;

      if (forcedFromList) {
        setSelectedSurvey(forcedFromList as any);
      } else {
        // Fallback: Fetch survey directly if not in published list
        surveyService.getById(forceSurveyId).then(response => {
          if (response.data) {
            setSelectedSurvey(response.data as Survey);
          }
        }).catch(err => console.error("Failed to fetch forced survey for analytics:", err));
      }
      return;
    }

    if (Array.isArray(surveys) && surveys.length > 0 && !selectedSurvey) {
      const storedSurveyId = getStoredSurveyId();
      if (storedSurveyId) {
        const storedSurvey = (surveys as any[]).find((s: any) => s.id.toString() === storedSurveyId);
        if (storedSurvey) {
          setSelectedSurvey(storedSurvey as any);
          return;
        }
        storeSurveyId(null);
      }

      // Default to first survey
      const firstSurvey = surveys[0];
      setSelectedSurvey(firstSurvey as any);
      storeSurveyId(firstSurvey.id.toString());
    }
  }, [surveys, initialData, forceSurveyId]);

  // Ensure we have questions for the survey
  const { data: fullSurveyData } = useQuery({
    queryKey: ['survey-full-details-analytics', selectedSurvey?.id],
    queryFn: () => selectedSurvey?.id ? surveyService.getById(selectedSurvey.id) : null,
    enabled: !!selectedSurvey?.id && (!selectedSurvey.questions || selectedSurvey.questions.length === 0),
  });

  const effectiveSurvey = (fullSurveyData as any)?.data || fullSurveyData || selectedSurvey;

  // Fetch analytics data for selected survey
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['survey-analytics-overview', effectiveSurvey?.id],
    queryFn: () => effectiveSurvey?.id ? surveyService.getSurveyAnalyticsOverview(effectiveSurvey.id) : null,
    enabled: !!effectiveSurvey?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch hierarchical data
  const { data: hierarchyData, isLoading: hierarchyLoading } = useQuery({
    queryKey: ['survey-hierarchical-institutions', effectiveSurvey?.id],
    queryFn: () => effectiveSurvey?.id ? surveyService.getHierarchicalInstitutionsAnalytics(effectiveSurvey.id) : null,
    enabled: !!effectiveSurvey?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch full analytics for question-level data
  const { data: fullAnalytics, isLoading: fullAnalyticsLoading } = useQuery({
    queryKey: ['survey-full-analytics', effectiveSurvey?.id],
    queryFn: () => effectiveSurvey?.id ? surveyService.getSurveyAnalytics(effectiveSurvey.id) : null,
    enabled: !!effectiveSurvey?.id,
    staleTime: 5 * 60 * 1000,
  });

  const handleSurveyChange = (survey: Survey) => {
    setSelectedSurvey(survey);
    storeSurveyId(survey.id.toString());
  };

  return (
    <div className={cn("space-y-6", isCompact ? "" : "p-6")}>
      {/* Header */}
      {!isCompact && (
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Sorğu Nəticələri Analitikası
          </h1>
          <p className="text-muted-foreground mt-1">
            Sorğuların statistik təhlili və hesabatlar
          </p>
        </div>
      )}

      {/* Error Alert */}
      {surveysError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Məlumatlar yüklənərkən xəta baş verdi. Səhifəni yeniləyin.
          </AlertDescription>
        </Alert>
      )}

      {/* Compact Header & Filter Bar */}
      {!isCompact ? (
        <UnifiedSurveySelector
          surveys={surveys}
          selectedSurvey={selectedSurvey}
          onSurveySelect={(survey) => handleSurveyChange(survey as Survey)}
          isLoading={surveysLoading}
        />
      ) : (
        <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 bg-white px-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Nəticələrdə axtar..." 
              className="pl-9 h-8 rounded-lg text-xs bg-slate-50 border-transparent focus:bg-white transition-all" 
              disabled
            />
          </div>
          
          {/* Unified Header Stats - Vertical Stack */}
          <div className="flex items-center gap-5 ml-4">
             <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Hədəf</span>
                <span className="text-[13px] font-bold text-blue-600 leading-none">
                  {analyticsData?.kpi_metrics?.target_participants ?? selectedSurvey?.target_institutions?.length ?? 0}
                </span>
             </div>
             <div className="w-px h-6 bg-slate-100" />
             <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Cavab</span>
                <span className="text-[13px] font-bold text-slate-700 leading-none">
                  {analyticsData?.kpi_metrics?.total_responses ?? 0}
                </span>
             </div>
             <div className="w-px h-6 bg-slate-100" />
             <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Gözləyən</span>
                <span className="text-[13px] font-bold text-amber-600 leading-none">
                  {analyticsData?.kpi_metrics?.in_progress_responses ?? 0}
                </span>
             </div>
             <div className="w-px h-6 bg-slate-100" />
             <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Təsdiq</span>
                <span className="text-[13px] font-bold text-emerald-600 leading-none">
                  {analyticsData?.kpi_metrics?.completed_responses ?? 0}
                </span>
             </div>
             <div className="w-px h-6 bg-slate-100" />
             <div className="flex flex-col items-center">
               <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Tamamlanma %</span>
               <span className="text-[13px] font-bold text-indigo-600 leading-none">
                 {analyticsData?.kpi_metrics?.target_participants 
                   ? Math.round(((analyticsData.kpi_metrics.completed_responses || 0) / analyticsData.kpi_metrics.target_participants) * 1000) / 10 
                   : 0}%
               </span>
             </div>
             
             {headerActions && (
               <>
                 <div className="w-px h-6 bg-slate-100" />
                 {headerActions}
               </>
             )}
          </div>
        </div>
      )}

      {/* Analytics Content - Only show when survey is selected */}
      {selectedSurvey && (
        <div className={cn("space-y-4", isCompact ? "px-6 pb-6" : "")}>
          {/* KPI Metrics - Only show in non-compact mode */}
          {!isCompact && (
            <SurveyKPIMetrics
              data={(analyticsData as any)?.kpi_metrics}
              isLoading={analyticsLoading}
            />
          )}

          {/* Hierarchical Institution Analysis */}
          <HierarchicalInstitutionAnalysis
            data={hierarchyData as any}
            isLoading={hierarchyLoading}
          />

          {/* Non-Responding Institutions */}
          <NonRespondingInstitutions
            hierarchyData={hierarchyData as any}
            isLoading={hierarchyLoading}
          />

          {/* Question Level Results */}
          <SurveyQuestionResults 
            stats={(fullAnalytics as any)?.question_analysis} 
            isLoading={fullAnalyticsLoading} 
          />

          {/* Response Details (Expandable) */}
          <ResponseDetailsSection survey={effectiveSurvey} />
        </div>
      )}
    </div>
  );
};

export default React.memo(SurveyResultsAnalytics);
