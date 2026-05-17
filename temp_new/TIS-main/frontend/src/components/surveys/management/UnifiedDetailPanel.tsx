import React, { Suspense, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, Eye, Users, BarChart3,
  FileDown, RefreshCw, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Survey } from '@/services/surveys';
import { SurveyDetailHeader } from './SurveyDetailHeader';
import { SurveyResponseForm } from '../SurveyResponseForm';
import { SurveyInfoTab } from './SurveyInfoTab';
import type { UnifiedItem } from '@/pages/surveys/ManagerSurveyDashboard';

const SurveyResultsAnalytics = React.lazy(() =>
  import('@/components/approval/survey-results-analytics/SurveyResultsAnalytics')
);
const SurveyViewDashboard = React.lazy(() =>
  import('@/components/approval/survey-view/SurveyViewDashboard')
);

// ─── Response status badges ────────────────────────────────────────────────

const RESP_BADGE: Record<string, { label: string; cls: string }> = {
  new:         { label: 'Yeni',        cls: 'bg-blue-100 text-blue-700 border-blue-200'    },
  in_progress: { label: 'Davam edir',  cls: 'bg-sky-100 text-sky-700 border-sky-200'       },
  draft:       { label: 'Qaralama',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  submitted:   { label: 'Göndərilib',  cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  approved:    { label: 'Təsdiqlənib', cls: 'bg-green-100 text-green-700 border-green-200' },
  rejected:    { label: 'Rədd edilib', cls: 'bg-red-100 text-red-700 border-red-200'       },
  completed:   { label: 'Tamamlanıb',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const MONITOR_BADGE = { label: 'Nəzarət', cls: 'bg-violet-100 text-violet-700 border-violet-200' };

// ─── Props ────────────────────────────────────────────────────────────────

interface UnifiedDetailPanelProps {
  item: UnifiedItem | null;
  itemCount: number;
  // For 'own' surveys
  surveyData: Survey | null;
  loadingFull: boolean;
  readonly: boolean;
  publishMut: any;
  pauseMut: any;
  resumeMut: any;
  handleEditSurvey: () => void;
  handleExportXlsx: () => void;
  handleSaveAsTemplate: () => void;
  handleRestoreSurvey: () => void;
  handleArchiveSurvey: () => void;
  handleDeleteSurvey: () => void;
  isDuplicating: boolean;
  isRestoring: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  surveyStatusBadge: Record<string, { label: string; cls: string }>;
  currentUserId?: number;
  roleRaw: string;
  regionOperatorPermissions?: Record<string, boolean>;
  // For 'respond' items
  exportingId: number | null;
  handleExportResponse: (responseId: number) => void;
  onResponseComplete: () => void;
  onResponseSave: () => void;
}

// ─── Komponent ───────────────────────────────────────────────────────────

export const UnifiedDetailPanel: React.FC<UnifiedDetailPanelProps> = ({
  item,
  itemCount,
  surveyData,
  loadingFull,
  readonly,
  publishMut,
  pauseMut,
  resumeMut,
  handleEditSurvey,
  handleExportXlsx,
  handleSaveAsTemplate,
  handleRestoreSurvey,
  handleArchiveSurvey,
  handleDeleteSurvey,
  isDuplicating,
  isRestoring,
  isArchiving,
  isDeleting,
  surveyStatusBadge,
  currentUserId,
  roleRaw,
  regionOperatorPermissions,
  exportingId,
  handleExportResponse,
  onResponseComplete,
  onResponseSave,
}) => {
  // Sub-tab for 'own' surveys
  const [ownSubTab, setOwnSubTab] = useState<'preview' | 'monitoring' | 'reports' | 'info'>('preview');
  // Sub-tab for 'respond' items
  const [respSubTab, setRespSubTab] = useState<'form' | 'monitoring'>('form');

  // Reset sub-tabs when item changes
  useEffect(() => {
    setOwnSubTab('preview');
    setRespSubTab('form');
  }, [item?.id]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!item) {
    return (
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col items-center justify-center text-center p-12">
        <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
          <ClipboardList className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">Sorğu seçilməyib</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          {itemCount === 0
            ? 'Bu kateqoriyada sorğu yoxdur.'
            : 'Sol siyahıdan bir sorğu seçin.'}
        </p>
      </div>
    );
  }

  // ── OWN survey ───────────────────────────────────────────────────────────
  if (item.origin === 'own') {
    const survey = surveyData;
    if (!survey) {
      return (
        <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      );
    }

    return (
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
        <SurveyDetailHeader
          selectedSurvey={survey}
          readonly={readonly}
          publishMut={publishMut}
          pauseMut={pauseMut}
          resumeMut={resumeMut}
          handleEditSurvey={handleEditSurvey}
          handleExportXlsx={handleExportXlsx}
          handleSaveAsTemplate={handleSaveAsTemplate}
          handleRestoreSurvey={handleRestoreSurvey}
          handleArchiveSurvey={handleArchiveSurvey}
          handleDeleteSurvey={handleDeleteSurvey}
          isDuplicating={isDuplicating}
          isRestoring={isRestoring}
          isArchiving={isArchiving}
          isDeleting={isDeleting}
          surveyStatusBadge={surveyStatusBadge}
          currentUserId={currentUserId}
          currentUserRole={roleRaw}
          regionOperatorPermissions={regionOperatorPermissions}
        />

        <div className="px-6 border-b border-slate-100 shrink-0">
          <div className="flex gap-6 h-11">
            {[
              { value: 'preview',    label: 'Baxış',      Icon: Eye         },
              { value: 'monitoring', label: 'Monitorinq', Icon: Users       },
              { value: 'reports',    label: 'Hesabat',    Icon: BarChart3   },
              { value: 'info',       label: 'Məlumatlar', Icon: ClipboardList },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setOwnSubTab(value as typeof ownSubTab)}
                className={cn(
                  'flex items-center rounded-none border-b-2 bg-transparent text-slate-500 font-medium text-sm px-0 pb-0 transition-all',
                  ownSubTab === value
                    ? 'border-[hsl(220_85%_25%)] text-[hsl(220_85%_25%)]'
                    : 'border-transparent hover:text-slate-700',
                )}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative bg-white">
          {loadingFull && (
            <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
          )}
          {ownSubTab === 'preview' && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-8 shadow-inner">
                <SurveyResponseForm surveyId={survey.id} readonly={true} />
              </div>
            </div>
          )}
          {ownSubTab === 'monitoring' && (
            <div className="h-full">
              <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>}>
                <SurveyResultsAnalytics key={`mon-${survey.id}`} forceSurveyId={survey.id} initialData={survey} isCompact headerActions={null} initialTab="monitoring" />
              </Suspense>
            </div>
          )}
          {ownSubTab === 'reports' && (
            <div className="h-full">
              <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>}>
                <SurveyViewDashboard key={`view-${survey.id}`} forceSurveyId={survey.id} initialData={survey as any} isCompact headerActions={null} />
              </Suspense>
            </div>
          )}
          {ownSubTab === 'info' && <SurveyInfoTab selectedSurvey={survey} />}
        </div>
      </div>
    );
  }

  // ── MONITORING item ───────────────────────────────────────────────────────
  if (item.origin === 'monitoring') {
    return (
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start gap-3 shrink-0">
          <div className="h-10 w-10 bg-violet-50 rounded-md flex items-center justify-center mt-0.5 shrink-0">
            <BarChart3 className="h-5 w-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">{item.title}</h2>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <Badge variant="outline" className={cn('text-xs border px-1.5 py-0', MONITOR_BADGE.cls)}>
                {MONITOR_BADGE.label}
              </Badge>
              {item.creatorInfo && (
                <span className="text-xs text-slate-400">Yaradan: {item.creatorInfo}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Suspense fallback={
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="text-sm text-slate-500">Analitika yüklənir...</span>
              </div>
            </div>
          }>
            <SurveyResultsAnalytics
              key={`mon-in-${item.surveyId}`}
              forceSurveyId={item.surveyId}
              isCompact
            />
          </Suspense>
        </div>
      </div>
    );
  }

  // ── RESPOND item ─────────────────────────────────────────────────────────
  const respBadge = RESP_BADGE[item.status] ?? { label: item.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 bg-[hsl(220_85%_95%)] rounded-md flex items-center justify-center shrink-0 mt-0.5">
            <ClipboardList className="h-5 w-5 text-[hsl(220_85%_25%)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">{item.title}</h2>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <Badge variant="outline" className={cn('text-xs border px-1.5 py-0', respBadge.cls)}>
                {respBadge.label}
              </Badge>
              {item.questionsCount != null && (
                <span className="text-xs text-slate-400">{item.questionsCount} sual</span>
              )}
              {item.creatorInfo && (
                <span className="text-xs text-slate-500">Yaradan: {item.creatorInfo}</span>
              )}
            </div>
          </div>
        </div>
        {item.responseId && (
          <div className="shrink-0">
            <Button
              variant="outline" size="sm"
              className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm"
              onClick={() => handleExportResponse(item.responseId!)}
              disabled={exportingId === item.responseId}
            >
              <FileDown className="h-3.5 w-3.5" /> Hesabat
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-100 shrink-0">
        <div className="flex gap-6 h-11">
          <button
            onClick={() => setRespSubTab('form')}
            className={cn(
              'flex items-center rounded-none border-b-2 bg-transparent text-slate-500 font-medium text-sm px-0 pb-0 transition-all',
              respSubTab === 'form'
                ? 'border-[hsl(220_85%_25%)] text-[hsl(220_85%_25%)]'
                : 'border-transparent hover:text-slate-700',
            )}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" /> Sual-Cavab
          </button>
          <button
            onClick={() => setRespSubTab('monitoring')}
            className={cn(
              'flex items-center rounded-none border-b-2 bg-transparent font-medium text-sm px-0 pb-0 transition-all',
              respSubTab === 'monitoring'
                ? 'border-[hsl(220_85%_25%)] text-[hsl(220_85%_25%)]'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            <Users className="h-3.5 w-3.5 mr-1.5" /> Monitorinq
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {respSubTab === 'form' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <SurveyResponseForm
                key={`${item.surveyId}-${item.responseId ?? 'new'}`}
                surveyId={item.surveyId}
                responseId={item.responseId}
                onComplete={onResponseComplete}
                onSave={onResponseSave}
              />
            </div>
          </div>
        )}
        {respSubTab === 'monitoring' && (
          <div className="h-full">
            <Suspense fallback={
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            }>
              <SurveyResultsAnalytics
                key={`mon-resp-${item.surveyId}`}
                forceSurveyId={item.surveyId}
                isCompact
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
};
