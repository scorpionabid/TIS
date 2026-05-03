import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, School, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { surveyService } from '@/services/surveys';
import { surveyAnalyticsService } from '@/services/surveys/analytics';
import NonRespondingInstitutions from '@/components/approval/survey-results-analytics/NonRespondingInstitutions';
import { toast } from 'sonner';

interface SurveyMonitoringPanelProps {
  surveyId: number;
}

export const SurveyMonitoringPanel: React.FC<SurveyMonitoringPanelProps> = ({ surveyId }) => {
  const [exporting, setExporting] = React.useState(false);

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['survey-analytics-overview', surveyId],
    queryFn: () => surveyService.getSurveyAnalyticsOverview(surveyId),
    staleTime: 2 * 60 * 1000,
  });

  const { data: hierarchyRaw, isLoading: loadingHierarchy } = useQuery({
    queryKey: ['survey-hierarchical-institutions', surveyId],
    queryFn: () => surveyService.getHierarchicalInstitutionsAnalytics(surveyId),
    staleTime: 2 * 60 * 1000,
  });

  const kpi = (overview as any)?.data ?? overview;
  const totalInstitutions  = kpi?.total_institutions  ?? kpi?.total_targeted_institutions  ?? 0;
  const respondedCount     = kpi?.responded_institutions ?? kpi?.responded_institutions_count ?? 0;
  const nonRespondedCount  = kpi?.non_responded_institutions ?? (totalInstitutions - respondedCount);
  const completionRate     = totalInstitutions > 0
    ? Math.round((respondedCount / totalInstitutions) * 100)
    : 0;

  const hierarchyData = (hierarchyRaw as any)?.data ?? hierarchyRaw;

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const blob = await surveyAnalyticsService.exportNonRespondingInstitutions(surveyId);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `doldurmayan-mektebler-sorgu-${surveyId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Siyahı yükləndi');
    } catch {
      toast.error('Yükləmə zamanı xəta baş verdi');
    } finally {
      setExporting(false);
    }
  }, [surveyId]);

  const isLoading = loadingOverview || loadingHierarchy;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4 max-w-4xl mx-auto">
      {/* KPI kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-9 w-9 bg-blue-50 rounded-md flex items-center justify-center shrink-0">
            <School className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Hədəf məktəblər</p>
            <p className="text-xl font-bold text-slate-800">{totalInstitutions}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-9 w-9 bg-emerald-50 rounded-md flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Cavab verən</p>
            <p className="text-xl font-bold text-emerald-700">{respondedCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-9 w-9 bg-red-50 rounded-md flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Doldurmayan</p>
            <p className="text-xl font-bold text-red-600">{nonRespondedCount}</p>
          </div>
        </div>
      </div>

      {/* Ümumi doldurulma progress */}
      {totalInstitutions > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-medium">Ümumi doldurulma</span>
            <span className={`font-bold ${completionRate >= 80 ? 'text-emerald-600' : completionRate >= 40 ? 'text-blue-600' : 'text-amber-600'}`}>
              {completionRate}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completionRate >= 80 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{respondedCount} / {totalInstitutions} məktəb cavablandırdı</p>
        </div>
      )}

      {/* Export düyməsi */}
      {nonRespondedCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-slate-300 hover:bg-slate-50 text-sm"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />
            }
            {exporting ? 'Yüklənir...' : 'Doldurmayan məktəbləri yüklə (.xlsx)'}
          </Button>
        </div>
      )}

      {/* NonRespondingInstitutions cədvəli */}
      <NonRespondingInstitutions
        hierarchyData={hierarchyData}
        isLoading={false}
      />
    </div>
  );
};
