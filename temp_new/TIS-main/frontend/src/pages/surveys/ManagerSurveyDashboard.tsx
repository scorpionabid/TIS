import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Inbox, ClipboardList,
  RefreshCw, BarChart3,
  Eye, Info, FileText, Activity,
} from 'lucide-react';
import { surveyService, Survey } from '@/services/surveys';
import { cn } from '@/lib/utils';
import { SurveyModal } from '@/components/modals/SurveyModal';
import { SurveyMonitoringPanel } from '@/components/surveys/management/SurveyMonitoringPanel';
import SurveyViewDashboard from '@/components/approval/survey-view/SurveyViewDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useSurveyActions } from '@/hooks/useSurveyActions';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SurveyResponseForm } from '@/components/surveys/SurveyResponseForm';
import { IncomingPanel } from '@/components/surveys/management/IncomingPanel';
import { SurveyListItem } from '@/components/surveys/management/SurveyListItem';
import { toast as sonnerToast } from 'sonner';
import { SurveyDashboardHeader } from '@/components/surveys/management/SurveyDashboardHeader';
import { SurveyFilterBar } from '@/components/surveys/management/SurveyFilterBar';
import { SurveyDetailHeader } from '@/components/surveys/management/SurveyDetailHeader';
import { SurveyInfoTab } from '@/components/surveys/management/SurveyInfoTab';
import { ViewModeToggle, ViewMode } from '@/components/surveys/management/ViewModeToggle';
import { useSurveyIncoming } from '@/hooks/useSurveyIncoming';
import { SURVEY_ROLE_LABELS, SURVEY_STATUS_BADGE } from '@/utils/surveyHelpers';

type MgmtFilter = 'active' | 'draft' | 'archived';

type SubTab = 'preview' | 'monitoring' | 'reports' | 'info';

const SUB_TABS: { value: SubTab; label: string; Icon: React.ElementType }[] = [
  { value: 'preview',    label: 'Baxış',      Icon: Eye      },
  { value: 'monitoring', label: 'Monitorinq', Icon: Activity },
  { value: 'reports',    label: 'Hesabat',    Icon: FileText },
  { value: 'info',       label: 'Məlumatlar', Icon: Info     },
];

interface ManagerSurveyDashboardProps {
  readonly?: boolean;
}

const ManagerSurveyDashboard: React.FC<ManagerSurveyDashboardProps> = ({ readonly = false }) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const roleLabel       = SURVEY_ROLE_LABELS[(currentUser?.role ?? '').toLowerCase()] ?? 'İstifadəçi';
  const institutionName = (currentUser as any)?.institution?.name ?? '';
  const userId          = currentUser?.id;
  const isSuperAdmin    = (currentUser?.role ?? '').toLowerCase() === 'superadmin';

  const [mainTab,      setMainTab]      = useState<'management' | 'incoming'>('management');
  const [mgmtFilter,   setMgmtFilter]   = useState<MgmtFilter>('active');
  const [searchMgmt,   setSearchMgmt]   = useState('');
  const [selectedMgmt, setSelectedMgmt] = useState<number | null>(null);
  const [showModal,    setShowModal]     = useState(false);
  const [surveyToEdit, setSurveyToEdit]  = useState<Survey | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('preview');

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('mgr-survey-view') as ViewMode) ?? 'card'
  );
  useEffect(() => { localStorage.setItem('mgr-survey-view', viewMode); }, [viewMode]);

  const isManagement = useMemo(() => {
    const role = (currentUser?.role ?? '').toLowerCase();
    return ['regionadmin', 'regionoperator', 'sektoradmin'].includes(role);
  }, [currentUser?.role]);

  // ── Öz sorğuları ────────────────────────────────────────────────────────────
  const { data: myRaw = [], isLoading: loadingMy } = useQuery({
    queryKey: ['mgr-my-surveys', userId, isSuperAdmin, isManagement],
    queryFn: async () => {
      const params: Record<string, unknown> = { per_page: 100 };
      // Manager roles should see everything in their hierarchy (handled by backend visibility filtering)
      // Non-management roles only see their own creations
      if (!isSuperAdmin && !isManagement) {
        params.creator_id = userId;
      }
      const res = await surveyService.getAll(params as any, false);
      return (res as any)?.data?.data ?? (res as any)?.data ?? res ?? [];
    },
    enabled: !!userId,
  });

  // ── Gələn sorğular (shared hook) ────────────────────────────────────────────
  const {
    items: incomingList,
    counts: incomingCounts,
    isLoading: loadingIncoming,
    refetch: refetchIncoming,
  } = useSurveyIncoming();

  const [selectedIn, setSelectedIn] = useState<string | null>(null);
  const [searchIn,   setSearchIn]   = useState('');

  const incomingFiltered = useMemo(() => {
    if (!searchIn.trim()) return incomingList;
    return incomingList.filter((i) => i.title.toLowerCase().includes(searchIn.toLowerCase()));
  }, [incomingList, searchIn]);

  useEffect(() => {
    if (incomingFiltered.length > 0 && !incomingFiltered.some((i) => i.id === selectedIn)) {
      setSelectedIn(incomingFiltered[0].id);
    }
    if (incomingFiltered.length === 0) setSelectedIn(null);
  }, [incomingFiltered]);

  const selectedIncoming = incomingFiltered.find((i) => i.id === selectedIn) ?? null;

  // ── Idarəetmə siyahısı ───────────────────────────────────────────────────────
  const mgmtCounts = useMemo(() => {
    if (!Array.isArray(myRaw)) return { active: 0, draft: 0, archived: 0 };
    return {
      active:   myRaw.filter((s: Survey) => ['active', 'published', 'paused'].includes(s.status)).length,
      draft:    myRaw.filter((s: Survey) => s.status === 'draft').length,
      archived: myRaw.filter((s: Survey) => s.status === 'archived').length,
    };
  }, [myRaw]);

  const kpis = useMemo(() => ({ total: Array.isArray(myRaw) ? myRaw.length : 0 }), [myRaw]);

  const mgmtList = useMemo<Survey[]>(() => {
    if (!Array.isArray(myRaw)) return [];
    let list = myRaw.filter((s: Survey) => {
      if (mgmtFilter === 'active')   return ['active', 'published', 'paused'].includes(s.status);
      if (mgmtFilter === 'draft')    return s.status === 'draft';
      if (mgmtFilter === 'archived') return s.status === 'archived';
      return true;
    });
    if (searchMgmt.trim()) {
      list = list.filter((s: Survey) => s.title.toLowerCase().includes(searchMgmt.toLowerCase()));
    }
    return list;
  }, [myRaw, mgmtFilter, searchMgmt]);

  useEffect(() => {
    if (mgmtList.length > 0 && !mgmtList.some((s) => s.id === selectedMgmt)) {
      setSelectedMgmt(mgmtList[0].id);
    }
    if (mgmtList.length === 0) setSelectedMgmt(null);
  }, [mgmtList, mgmtFilter]);

  const { data: fullSurvey, isLoading: loadingFull } = useQuery({
    queryKey: ['survey-full-details', selectedMgmt],
    queryFn: () => selectedMgmt ? surveyService.getById(selectedMgmt).then((r) => r.data) : null,
    enabled: !!selectedMgmt,
  });

  const selectedSurvey = fullSurvey || mgmtList.find((s) => s.id === selectedMgmt) || null;

  const invalidateMy = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mgr-my-surveys'] });
  }, [queryClient]);

  const { confirm, dialogProps: confirmDialogProps } = useConfirm();

  const {
    publishMut, pauseMut, resumeMut,
    handleArchiveSurvey, handleRestoreSurvey, handleResumeSurvey,
    handleSaveAsTemplate, handleDeleteSurvey, handleExportXlsx,
    handleExportResponse: handleExport,
    isDeleting, isArchiving, isRestoring, isResuming, isDuplicating, exportingId,
  } = useSurveyActions({ selectedSurvey, invalidateMy, onSelectSurvey: setSelectedMgmt, confirm });

  const handleEditSurvey = useCallback(() => {
    if (!selectedSurvey) return;
    setSurveyToEdit(selectedSurvey);
    setShowModal(true);
  }, [selectedSurvey]);

  const handleNewSurvey = useCallback(() => {
    setSurveyToEdit(null);
    setShowModal(true);
  }, []);

  const handleSaveSurvey = async (data: any) => {
    if (surveyToEdit) {
      await surveyService.update(surveyToEdit.id, data);
    } else {
      await surveyService.create(data);
    }
    invalidateMy();
    setShowModal(false);
    setSurveyToEdit(null);
  };

  if (loadingMy || loadingIncoming) {
    return (
      <div className="flex gap-3 h-[600px] animate-pulse p-2">
        <div className="w-72 shrink-0"><Skeleton className="h-full w-full rounded-lg" /></div>
        <div className="flex-1"><Skeleton className="h-full w-full rounded-lg" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50/50 -m-4 p-4">
      {/* Header */}
      <div className="shrink-0 flex flex-col gap-4 mb-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <SurveyDashboardHeader
          roleLabel={roleLabel} institutionName={institutionName}
          mainTab={mainTab} setMainTab={setMainTab}
          kpis={kpis} incomingCounts={incomingCounts}
          isSuperAdmin={isSuperAdmin} readonly={readonly}
          setShowModal={handleNewSurvey}
          onRefresh={() => { invalidateMy(); refetchIncoming(); }}
        />
        {mainTab === 'management' && (
          <SurveyFilterBar mgmtFilter={mgmtFilter} setMgmtFilter={setMgmtFilter} mgmtCounts={mgmtCounts} />
        )}
      </div>

      {/* Panellər */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        {mainTab === 'management' && (
          <>
            {/* Sol: siyahı */}
            <div className="w-72 xl:w-80 shrink-0 flex flex-col gap-2 min-h-0">
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <ViewModeToggle value={viewMode} onChange={setViewMode} />
                  <span className="text-xs text-slate-400 font-medium">{mgmtList.length} sorğu</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Axtar..."
                    value={searchMgmt}
                    onChange={(e) => setSearchMgmt(e.target.value)}
                    className="pl-8 h-8 text-sm border-slate-200 bg-slate-50 focus:bg-white rounded"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 pb-4">
                {mgmtList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Inbox className="h-8 w-8 mb-2" />
                    <p className="text-sm">
                      {myRaw.length === 0 ? 'Hələ sorğu yaratmamısınız' : 'Bu kateqoriyada sorğu yoxdur'}
                    </p>
                  </div>
                ) : (
                  mgmtList.map((item: Survey) => {
                    const tc  = item.target_institutions_count ?? (Array.isArray(item.target_institutions) ? item.target_institutions.length : 0);
                    const rc  = item.responded_institutions_count ?? 0;
                    const pct = tc > 0 ? Math.min(100, Math.round((rc / tc) * 100)) : 0;
                    const metaParts = [`${item.response_count ?? 0} cavab`, `${item.questions_count ?? 0} sual`];
                    if (tc > 0) metaParts.push(`${pct}%`);

                    const creatorName = item.creator?.full_name ?? item.creator?.username;

                    return (
                      <SurveyListItem
                        key={item.id}
                        title={item.title}
                        badge={SURVEY_STATUS_BADGE[item.status]?.label ?? item.status}
                        badgeCls={SURVEY_STATUS_BADGE[item.status]?.cls}
                        meta={metaParts.join(' · ')}
                        creator={creatorName}
                        isSelected={selectedMgmt === item.id}
                        viewMode={viewMode}
                        onClick={() => setSelectedMgmt(item.id)}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Sağ: detallar */}
            <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
              {selectedSurvey ? (
                <>
                  <SurveyDetailHeader
                    selectedSurvey={selectedSurvey}
                    readonly={readonly}
                    isOwner={selectedSurvey.creator?.id === userId}
                    publishMut={publishMut} pauseMut={pauseMut} resumeMut={resumeMut}
                    handleEditSurvey={handleEditSurvey} handleResumeSurvey={handleResumeSurvey}
                    handleExportXlsx={handleExportXlsx}
                    handleSaveAsTemplate={handleSaveAsTemplate} handleRestoreSurvey={handleRestoreSurvey}
                    handleArchiveSurvey={handleArchiveSurvey} handleDeleteSurvey={handleDeleteSurvey}
                    isDuplicating={isDuplicating} isRestoring={isRestoring}
                    isArchiving={isArchiving} isDeleting={isDeleting}
                    surveyStatusBadge={SURVEY_STATUS_BADGE}
                  />

                  {/* Sub-tab navigasiyası */}
                  <div className="px-6 border-b border-slate-100 shrink-0">
                    <div className="flex gap-6 h-11">
                      {SUB_TABS.map(({ value, label, Icon }) => (
                        <button
                          key={value}
                          onClick={() => setActiveSubTab(value)}
                          className={cn(
                            'flex items-center rounded-none border-b-2 bg-transparent text-slate-500 font-medium text-sm px-0 pb-0 transition-all',
                            activeSubTab === value
                              ? 'border-[hsl(220_85%_25%)] text-[hsl(220_85%_25%)]'
                              : 'border-transparent hover:text-slate-700',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 mr-1.5" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab məzmunu */}
                  <div className="flex-1 overflow-y-auto relative bg-white">
                    {loadingFull && (
                      <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
                        <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                      </div>
                    )}
                    {activeSubTab === 'preview' && (
                      <div className="p-6">
                        <div className="max-w-4xl mx-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-8">
                          <SurveyResponseForm surveyId={selectedSurvey.id} readonly={true} />
                        </div>
                      </div>
                    )}
                    {activeSubTab === 'monitoring' && (
                      <SurveyMonitoringPanel key={`mon-${selectedSurvey.id}`} surveyId={selectedSurvey.id} />
                    )}
                    {activeSubTab === 'reports' && (
                      <div className="h-full">
                        <SurveyViewDashboard key={`view-${selectedSurvey.id}`} forceSurveyId={selectedSurvey.id} initialData={selectedSurvey as any} isCompact headerActions={null} />
                      </div>
                    )}
                    {activeSubTab === 'info' && <SurveyInfoTab selectedSurvey={selectedSurvey} />}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <ClipboardList className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700">Sorğu seçilməyib</h3>
                  <p className="text-sm text-slate-400 mt-1 max-w-xs">
                    {mgmtList.length === 0 && myRaw.length === 0
                      ? 'Hələ sorğu yaratmamısınız. "Yeni Sorğu" düyməsindən başlayın.'
                      : 'Sol siyahıdan bir sorğu seçin.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {mainTab === 'incoming' && (
          <IncomingPanel
            incomingFiltered={incomingFiltered}
            incomingCounts={incomingCounts}
            selectedIn={selectedIn}
            setSelectedIn={setSelectedIn}
            selectedIncoming={selectedIncoming}
            searchIn={searchIn}
            setSearchIn={setSearchIn}
            handleExport={handleExport}
            exportingId={exportingId}
            onResponseComplete={() => {
              refetchIncoming();
              sonnerToast.success('Sorğu göndərildi');
            }}
            onResponseSave={refetchIncoming}
          />
        )}
      </div>

      {!readonly && (
        <SurveyModal
          open={showModal}
          onClose={() => { setShowModal(false); setSurveyToEdit(null); }}
          survey={surveyToEdit}
          onSave={handleSaveSurvey}
        />
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
};

export default ManagerSurveyDashboard;
