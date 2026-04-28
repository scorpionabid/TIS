import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Inbox, ClipboardList,
  RefreshCw, BarChart3,
  LayoutGrid, List, Rows,
  Plus, Eye,
  Inbox as InboxIcon
} from 'lucide-react';
import { surveyService, Survey } from '@/services/surveys';
import { cn } from '@/lib/utils';
import { SurveyModal } from '@/components/modals/SurveyModal';
import SurveyApprovalDashboard from '@/components/approval/SurveyApprovalDashboard';
import SurveyResultsAnalytics from '@/components/approval/survey-results-analytics/SurveyResultsAnalytics';
import SurveyViewDashboard from '@/components/approval/survey-view/SurveyViewDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useSurveyActions } from '@/hooks/useSurveyActions';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SurveyResponseForm } from '@/components/surveys/SurveyResponseForm';
import { IncomingPanel } from '@/components/surveys/management/IncomingPanel';
import { SurveyListItem } from '@/components/surveys/management/SurveyListItem';
import { toast as sonnerToast } from 'sonner';

// New Modular Components
import { SurveyDashboardHeader } from '@/components/surveys/management/SurveyDashboardHeader';
import { SurveyFilterBar } from '@/components/surveys/management/SurveyFilterBar';
import { SurveyDetailHeader } from '@/components/surveys/management/SurveyDetailHeader';
import { SurveyInfoTab } from '@/components/surveys/management/SurveyInfoTab';

// ─── Tiplər ──────────────────────────────────────────────────────────────────

type MgmtFilter = 'active' | 'draft' | 'archived';
type ViewMode   = 'card' | 'list' | 'compact';

interface IncomingItem {
  id:            string;
  surveyId:      number;
  responseId?:   number;
  title:         string;
  description?:  string;
  status:        'new' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'in_progress';
  deadline?:     string;
  lastUpdated?:  string;
  questionsCount?: number;
}

// ─── Sabitlər ────────────────────────────────────────────────────────────────

const SURVEY_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Qaralama',     cls: 'bg-slate-100 text-slate-700 border-slate-200'  },
  published: { label: 'Yayımlanmış',  cls: 'bg-blue-100 text-blue-700 border-blue-200'    },
  active:    { label: 'Aktiv',        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  paused:    { label: 'Dayandırıldı', cls: 'bg-amber-100 text-amber-700 border-amber-200'  },
  completed: { label: 'Tamamlandı',   cls: 'bg-green-100 text-green-700 border-green-200'  },
  archived:  { label: 'Arxivləndi',   cls: 'bg-gray-100 text-gray-600 border-gray-200'    },
};

const ROLE_LABELS: Record<string, string> = {
  superadmin:     'Superadmin',
  regionadmin:    'Regionadmin',
  sektoradmin:    'Sektoradmin',
  regionoperator: 'Region Operatoru',
  operator:       'Operator',
  admin:          'Administrator',
};

// ─── Əsas komponent ───────────────────────────────────────────────────────────

interface ManagerSurveyDashboardProps {
  readonly?: boolean;
}

const ManagerSurveyDashboard: React.FC<ManagerSurveyDashboardProps> = ({ readonly = false }) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const roleLabel       = ROLE_LABELS[(currentUser?.role ?? '').toLowerCase()] ?? 'İstifadəçi';
  const institutionName = (currentUser as any)?.institution?.name ?? '';
  const userId          = currentUser?.id;
  const isSuperAdmin    = (currentUser?.role ?? '').toLowerCase() === 'superadmin';

  // ── Görünüş ───────────────────────────────────────────────────────────────
  const [mainTab,      setMainTab]      = useState<'management' | 'incoming'>('management');
  const [mgmtFilter,   setMgmtFilter]   = useState<MgmtFilter>('active');
  const [searchMgmt,   setSearchMgmt]   = useState('');
  const [searchIn,     setSearchIn]     = useState('');
  const [selectedMgmt, setSelectedMgmt] = useState<number | null>(null);
  const [selectedIn,   setSelectedIn]   = useState<string | null>(null);
  const [showModal,    setShowModal]     = useState(false);
  const [surveyToEdit, setSurveyToEdit]  = useState<Survey | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('mgr-survey-view') as ViewMode) ?? 'card'
  );
  useEffect(() => { localStorage.setItem('mgr-survey-view', viewMode); }, [viewMode]);

  const [activeSubTab, setActiveSubTab] = useState<'preview' | 'approvals' | 'results' | 'reports' | 'info'>('preview');

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: myRaw = [], isLoading: loadingMy } = useQuery({
    queryKey: ['mgr-my-surveys', userId, isSuperAdmin],
    queryFn: async () => {
      let params: any = { per_page: 100 };
      
      if (!isSuperAdmin) {
        const role = (currentUser?.role ?? '').toLowerCase();
        const isManagement = ['regionadmin', 'regionoperator', 'sektoradmin'].includes(role);
        
        if (isManagement && currentUser?.institution_id) {
          params.institution_id = currentUser.institution_id;
        } else {
          params.creator_id = userId;
        }
      }
      
      const res = await surveyService.getAll(params, false);
      return (res as any)?.data?.data ?? (res as any)?.data ?? res ?? [];
    },
    enabled: !!userId,
  });

  const { data: assignedRaw = [], isLoading: loadingAssigned } = useQuery({
    queryKey: ['mgr-assigned-surveys'],
    queryFn: async () => {
      const res = await surveyService.getAssignedSurveys();
      return (res as any)?.data?.data ?? (res as any)?.data ?? res ?? [];
    },
  });

  const { data: myResponsesRaw = [], refetch: refetchResponses } = useQuery({
    queryKey: ['mgr-my-responses'],
    queryFn: async () => {
      const res = await surveyService.getMyResponses();
      if (Array.isArray(res)) return res;
      const p = (res as any)?.data;
      return p?.data ?? p ?? [];
    },
  });

  const mgmtCounts = useMemo(() => {
    if (!Array.isArray(myRaw)) return { active: 0, draft: 0, archived: 0 };
    return {
      active:   myRaw.filter((s: Survey) => s.status === 'active' || s.status === 'published').length,
      draft:    myRaw.filter((s: Survey) => s.status === 'draft').length,
      archived: myRaw.filter((s: Survey) => s.status === 'archived').length,
    };
  }, [myRaw]);

  const kpis = useMemo(() => ({
    total: Array.isArray(myRaw) ? myRaw.length : 0,
  }), [myRaw]);

  const mgmtList = useMemo<Survey[]>(() => {
    if (!Array.isArray(myRaw)) return [];
    let list = myRaw.filter((s: Survey) => {
      if (mgmtFilter === 'active')   return s.status === 'active' || s.status === 'published';
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
    if (mgmtList.length > 0 && !mgmtList.some(s => s.id === selectedMgmt)) {
      setSelectedMgmt(mgmtList[0].id);
    }
    if (mgmtList.length === 0) setSelectedMgmt(null);
  }, [mgmtList, mgmtFilter]);

  const { data: fullSurvey, isLoading: loadingFull } = useQuery({
    queryKey: ['survey-full-details', selectedMgmt],
    queryFn: () => selectedMgmt ? surveyService.getById(selectedMgmt).then(r => r.data) : null,
    enabled: !!selectedMgmt,
  });

  const selectedSurvey = fullSurvey || mgmtList.find(s => s.id === selectedMgmt) || null;

  const invalidateMy = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mgr-my-surveys'] });
  }, [queryClient]);

  const { confirm, dialogProps: confirmDialogProps } = useConfirm();

  const {
    publishMut, pauseMut, handleEditSurvey: _handleEditSurvey, handleArchiveSurvey, handleRestoreSurvey,
    handleSaveAsTemplate, handleDeleteSurvey, handleExportXlsx, handleExportResponse: handleExport,
    isDeleting, isArchiving, isRestoring, isDuplicating, exportingId,
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

  const incomingList = useMemo<IncomingItem[]>(() => {
    const list: IncomingItem[] = [];
    const respMap = new Map<number, any>();
    (Array.isArray(myResponsesRaw) ? myResponsesRaw : []).forEach((r: any) => {
      respMap.set(r.survey_id ?? r.survey?.id, r);
    });
    (Array.isArray(assignedRaw) ? assignedRaw : []).forEach((s: any) => {
      const resp = respMap.get(s.id);
      if (resp) {
        list.push({
          id: `resp-${resp.id}`, surveyId: s.id, responseId: resp.id,
          title: s.title, description: s.description, status: resp.status,
          deadline: s.end_date ?? s.expires_at, lastUpdated: resp.updated_at ?? resp.last_saved_at,
          questionsCount: s.questions_count,
        });
        respMap.delete(s.id);
      } else {
        list.push({ id: `surv-${s.id}`, surveyId: s.id, title: s.title, status: 'new', deadline: s.end_date ?? s.expires_at, questionsCount: s.questions_count });
      }
    });
    respMap.forEach((resp, surveyId) => {
      list.push({ id: `resp-${resp.id}`, surveyId, responseId: resp.id, title: resp.survey?.title ?? `Sorğu #${surveyId}`, status: resp.status, deadline: resp.survey?.end_date, lastUpdated: resp.updated_at, questionsCount: resp.survey?.questions_count });
    });
    return list;
  }, [assignedRaw, myResponsesRaw]);

  const incomingFiltered = useMemo(() => {
    if (!searchIn.trim()) return incomingList;
    return incomingList.filter(i => i.title.toLowerCase().includes(searchIn.toLowerCase()));
  }, [incomingList, searchIn]);

  const incomingCounts = useMemo(() => ({
    pending: incomingList.filter(i => ['new', 'draft', 'in_progress'].includes(i.status)).length,
    submitted: incomingList.filter(i => ['submitted', 'approved', 'rejected', 'completed'].includes(i.status)).length,
  }), [incomingList]);

  useEffect(() => {
    if (incomingFiltered.length > 0 && !incomingFiltered.some(i => i.id === selectedIn)) setSelectedIn(incomingFiltered[0].id);
    if (incomingFiltered.length === 0) setSelectedIn(null);
  }, [incomingFiltered]);

  const selectedIncoming = incomingFiltered.find(i => i.id === selectedIn) ?? null;

  if (loadingMy || loadingAssigned) {
    return (
      <div className="flex gap-3 h-[600px] animate-pulse p-2">
        <div className="w-72 shrink-0"><Skeleton className="h-full w-full rounded-lg" /></div>
        <div className="flex-1"><Skeleton className="h-full w-full rounded-lg" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50/50 -m-4 p-4">
      {/* ── Header Area ── */}
      <div className="shrink-0 flex flex-col gap-4 mb-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <SurveyDashboardHeader 
          roleLabel={roleLabel} institutionName={institutionName}
          mainTab={mainTab} setMainTab={setMainTab}
          kpis={kpis} incomingCounts={incomingCounts}
          isSuperAdmin={isSuperAdmin} readonly={readonly}
          setShowModal={handleNewSurvey} onRefresh={() => { invalidateMy(); queryClient.invalidateQueries({ queryKey: ['mgr-assigned-surveys'] }); }}
        />
        {mainTab === 'management' && (
          <SurveyFilterBar mgmtFilter={mgmtFilter} setMgmtFilter={setMgmtFilter} mgmtCounts={mgmtCounts} />
        )}
      </div>

      {/* ══ PANELLƏR ══ */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        {mainTab === 'management' && (<>
            {/* Sol: siyahı */}
            <div className="w-72 xl:w-80 shrink-0 flex flex-col gap-2 min-h-0">
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded">
                    {([LayoutGrid, List, Rows]).map((Ic, i) => {
                      const m = (['card','list','compact'] as ViewMode[])[i];
                      return (
                        <button key={m} onClick={() => setViewMode(m)} className={cn('p-1.5 rounded transition-all', viewMode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                          <Ic className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{mgmtList.length} sorğu</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input placeholder="Axtar..." value={searchMgmt} onChange={e => setSearchMgmt(e.target.value)} className="pl-8 h-8 text-sm border-slate-200 bg-slate-50 focus:bg-white rounded" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 pb-4">
                {mgmtList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Inbox className="h-8 w-8 mb-2" />
                    <p className="text-sm">{myRaw.length === 0 ? 'Hələ sorğu yaratmamısınız' : 'Bu kateqoriyada sorğu yoxdur'}</p>
                  </div>
                ) : (
                  mgmtList.map((item: Survey) => (
                    <SurveyListItem key={item.id} title={item.title} badge={SURVEY_STATUS_BADGE[item.status]?.label ?? item.status} badgeCls={SURVEY_STATUS_BADGE[item.status]?.cls} meta={`${item.response_count ?? 0} cavab · ${item.questions_count ?? 0} sual`} isSelected={selectedMgmt === item.id} viewMode={viewMode} onClick={() => setSelectedMgmt(item.id)} />
                  ))
                )}
              </div>
            </div>

            {/* Sağ: detallar */}
            <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
              {selectedSurvey ? (
                <>
                  <SurveyDetailHeader 
                    selectedSurvey={selectedSurvey} readonly={readonly}
                    publishMut={publishMut} pauseMut={pauseMut}
                    handleEditSurvey={handleEditSurvey} handleExportXlsx={handleExportXlsx}
                    handleSaveAsTemplate={handleSaveAsTemplate} handleRestoreSurvey={handleRestoreSurvey}
                    handleArchiveSurvey={handleArchiveSurvey} handleDeleteSurvey={handleDeleteSurvey}
                    isDuplicating={isDuplicating} isRestoring={isRestoring} isArchiving={isArchiving} isDeleting={isDeleting}
                    surveyStatusBadge={SURVEY_STATUS_BADGE}
                  />

                  {/* ── Tabs Navigation ── */}
                  <div className="px-6 border-b border-slate-100 shrink-0">
                    <div className="flex gap-6 h-11">
                      {[
                        { value: 'preview',   label: 'Baxış',      Icon: Eye },
                        { value: 'approvals', label: 'Təsdiqlə',   Icon: BarChart3 },
                        { value: 'results',   label: 'Nəticə',     Icon: BarChart3 },
                        { value: 'reports',   label: 'Hesabat',    Icon: BarChart3 },
                        { value: 'info',      label: 'Məlumatlar',  Icon: ClipboardList },
                      ].map(({ value, label, Icon }) => (
                        <button key={value} onClick={() => setActiveSubTab(value as any)} className={cn("flex items-center rounded-none border-b-2 bg-transparent text-slate-500 font-medium text-sm px-0 pb-0 transition-all", activeSubTab === value ? "border-[hsl(220_85%_25%)] text-[hsl(220_85%_25%)]" : "border-transparent hover:text-slate-700")}>
                          <Icon className="h-3.5 w-3.5 mr-1.5" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Tab Content ── */}
                  <div className="flex-1 overflow-y-auto relative bg-white">
                    {loadingFull && (
                      <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
                        <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                      </div>
                    )}
                    {activeSubTab === 'preview' && <div className="p-6"><div className="max-w-4xl mx-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-8"><SurveyResponseForm surveyId={selectedSurvey.id} readonly={true} /></div></div>}
                    {activeSubTab === 'approvals' && <div className="h-full"><SurveyApprovalDashboard key={`app-${selectedSurvey.id}`} forceSurveyId={selectedSurvey.id} initialData={selectedSurvey as any} isCompact headerActions={null} /></div>}
                    {activeSubTab === 'results' && <div className="h-full"><SurveyResultsAnalytics key={`res-${selectedSurvey.id}`} forceSurveyId={selectedSurvey.id} initialData={selectedSurvey} isCompact headerActions={null} /></div>}
                    {activeSubTab === 'reports' && <div className="h-full"><SurveyViewDashboard key={`view-${selectedSurvey.id}`} forceSurveyId={selectedSurvey.id} initialData={selectedSurvey as any} isCompact headerActions={null} /></div>}
                    {activeSubTab === 'info' && <SurveyInfoTab selectedSurvey={selectedSurvey} />}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4"><ClipboardList className="h-6 w-6 text-slate-400" /></div>
                  <h3 className="text-base font-semibold text-slate-700">Sorğu seçilməyib</h3>
                  <p className="text-sm text-slate-400 mt-1 max-w-xs">{mgmtList.length === 0 && myRaw.length === 0 ? 'Hələ sorğu yaratmamısınız. "Yeni Sorğu" düyməsindən başlayın.' : 'Sol siyahıdan bir sorğu seçin.'}</p>
                </div>
              )}
            </div>
          </>)}

        {mainTab === 'incoming' && (
          <IncomingPanel incomingFiltered={incomingFiltered} incomingCounts={incomingCounts} selectedIn={selectedIn} setSelectedIn={setSelectedIn} selectedIncoming={selectedIncoming} searchIn={searchIn} setSearchIn={setSearchIn} handleExport={handleExport} exportingId={exportingId} onResponseComplete={() => { queryClient.invalidateQueries({ queryKey: ['mgr-assigned-surveys'] }); queryClient.invalidateQueries({ queryKey: ['mgr-my-responses'] }); sonnerToast.success('Sorğu göndərildi'); }} onResponseSave={() => refetchResponses()} />
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
