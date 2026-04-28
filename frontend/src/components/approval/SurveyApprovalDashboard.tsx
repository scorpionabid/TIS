import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Target,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  RotateCw,
  Undo2,
  BarChart3,
  Users,
  Calendar,
  FileText
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import surveyApprovalService, {
  PublishedSurvey,
  ResponseFilters,
  ApprovalStats,
  SurveyResponseForApproval
} from '../../services/surveyApproval';
import { surveyService } from '../../services/surveys';
import { apiClient } from '../../services/apiOptimized';
import { storageHelpers } from '../../utils/helpers';
import { cn } from '@/lib/utils';
import ResponseManagementTable from './table/ResponseManagementTable';
import ResponseDetailModal from './ResponseDetailModal';
import BulkApprovalInterface from './BulkApprovalInterface';
import UnifiedSurveySelector from './UnifiedSurveySelector';

interface SurveyApprovalDashboardProps {
  forceSurveyId?: number;
  isCompact?: boolean;
  initialData?: PublishedSurvey;
  headerActions?: React.ReactNode;
}

const SurveyApprovalDashboard: React.FC<SurveyApprovalDashboardProps> = ({ forceSurveyId, isCompact, initialData, headerActions }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const approvalsAccess = useModuleAccess('approvals');
  const canViewApprovals = approvalsAccess.canView;
  const canManageApprovals = approvalsAccess.canManage;

  // State management with storage-backed persistence
  const [selectedSurvey, setSelectedSurvey] = useState<PublishedSurvey | null>(() => {
    if (initialData) return initialData;
    const saved = storageHelpers.get<PublishedSurvey>('approvals_selected_survey');
    return saved || null;
  });
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponseForApproval | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedResponses, setSelectedResponses] = useState<number[]>([]);
  const [defaultTab, setDefaultTab] = useState<'details' | 'responses' | 'history'>('details');
  
  const [filters, setFilters] = useState<ResponseFilters>({
    per_page: 25,
    status: undefined,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    successful: number;
    failed: number;
    errors: Array<{ response_id: number; error: string }>;
  } | null>(null);

  const { data: publishedSurveys, isLoading: surveysLoading } = useQuery({
    queryKey: ['published-surveys'],
    queryFn: () => surveyApprovalService.getPublishedSurveys(),
    staleTime: 5 * 60 * 1000,
    enabled: canViewApprovals,
  });

  // Ensure we have questions for the survey
  const { data: fullSurveyData } = useQuery({
    queryKey: ['survey-full-details-approval', selectedSurvey?.id],
    queryFn: () => selectedSurvey?.id ? surveyService.getById(selectedSurvey.id) : null,
    enabled: !!selectedSurvey?.id && (!selectedSurvey.questions || selectedSurvey.questions.length === 0),
  });

  const effectiveSurvey = (fullSurveyData as any)?.data || fullSurveyData || selectedSurvey;

  const { data: responsesData, isLoading: responsesLoading, error: responsesError, refetch: refetchResponses } = useQuery({
    queryKey: ['survey-responses-approval', effectiveSurvey?.id, filters],
    queryFn: () => effectiveSurvey?.id ? surveyApprovalService.getResponsesForApproval(effectiveSurvey.id, filters) : null,
    enabled: !!effectiveSurvey?.id && canViewApprovals,
    staleTime: 30 * 1000,
  });

  const { data: institutions } = useQuery({
    queryKey: ['institutions-for-filters'],
    queryFn: surveyApprovalService.getInstitutions,
    staleTime: 10 * 60 * 1000,
    enabled: canViewApprovals,
  });

  useEffect(() => {
    if (initialData) {
      setSelectedSurvey(initialData);
      return;
    }

    // If we have a forced ID, we MUST select it even if not in the 'published' list
    // This happens in the Manager Dashboard when viewing Draft/Archived surveys
    if (forceSurveyId) {
      const alreadyForced = selectedSurvey?.id === forceSurveyId;
      if (alreadyForced) return;

      const forcedFromList = Array.isArray(publishedSurveys) 
        ? publishedSurveys.find((s: PublishedSurvey) => s.id === forceSurveyId)
        : null;

      if (forcedFromList) {
        setSelectedSurvey(forcedFromList);
      } else {
        // If not in published list, fetch it directly
        surveyService.getById(forceSurveyId).then(response => {
          if (response.data) {
            const survey = response.data;
            setSelectedSurvey({
              id: survey.id,
              title: survey.title,
              description: survey.description,
              start_date: survey.start_date,
              end_date: survey.end_date,
              target_institutions: survey.target_institutions,
              questions: survey.questions?.map(q => ({
                id: q.id!,
                title: q.question || (q as any).title,
                type: q.type,
                options: q.options,
                required: q.required,
                order_index: q.order
              }))
            } as PublishedSurvey);
          }
        }).catch(err => console.error("Failed to fetch forced survey:", err));
      }
      return;
    }

    if (!Array.isArray(publishedSurveys) || publishedSurveys.length === 0) {
      if (selectedSurvey && !forceSurveyId) {
        setSelectedSurvey(null);
        storageHelpers.remove('approvals_selected_survey');
      }
      return;
    }

    const hasSelectedSurvey = selectedSurvey ? publishedSurveys.some((s: PublishedSurvey) => s.id === selectedSurvey.id) : false;
    if (hasSelectedSurvey) return;

    const saved = storageHelpers.get<PublishedSurvey>('approvals_selected_survey');
    let surveyToSelect: PublishedSurvey | null = null;
    if (saved) {
      surveyToSelect = publishedSurveys.find((s: PublishedSurvey) => s.id === saved.id) || null;
    }
    if (!surveyToSelect) {
      surveyToSelect = publishedSurveys[0];
    }
    storageHelpers.set('approvals_selected_survey', surveyToSelect);
    setSelectedSurvey(surveyToSelect);
  }, [publishedSurveys, selectedSurvey, forceSurveyId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleFilterChange = useCallback((key: keyof ResponseFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  }, []);

  const handleStatCardFilter = useCallback((overrides: { status?: ResponseFilters['status']; approval_status?: ResponseFilters['approval_status'] }) => {
    setFilters(prev => ({ per_page: prev.per_page, status: overrides.status, approval_status: overrides.approval_status }));
    setSearchTerm('');
  }, []);

  const handleSurveySelect = (survey: PublishedSurvey) => {
    if (selectedSurvey?.id !== survey.id) {
      setSelectedResponses([]);
      setFilters({ per_page: 25, status: undefined });
      setSearchTerm('');
    }
    storageHelpers.set('approvals_selected_survey', survey);
    setSelectedSurvey(survey);
  };

  const handleResponseSelect = (response: SurveyResponseForApproval) => {
    setSelectedResponse(response);
    setShowResponseModal(true);
  };

  const handleResponseViewTab = (response: SurveyResponseForApproval, tab: 'details' | 'responses' | 'history') => {
    setSelectedResponse(response);
    setDefaultTab(tab);
    setShowResponseModal(true);
  };

  const handleResponseEdit = useCallback((response: SurveyResponseForApproval) => {
    setSelectedResponse(response);
    setShowResponseModal(true);
    toast({ title: "Redaktə rejimi", description: `${response.institution?.name} müəssisəsinin cavabını redaktə edirsiniz` });
  }, [toast]);

  const handleBulkSelect = (responseIds: number[]) => {
    setSelectedResponses(responseIds);
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'return', comments?: string) => {
    if (!canManageApprovals) {
      toast({ title: 'İcazə yoxdur', variant: 'destructive' });
      return;
    }
    if (selectedResponses.length === 0) return;
    try {
      const result = await surveyApprovalService.performBulkApproval(
        selectedResponses,
        action,
        comments || `Dashboard vasitəsilə ${action === 'approve' ? 'təsdiqləndi' : action === 'reject' ? 'rədd edildi' : 'geri qaytarıldı'}`
      );
      setBulkResult({
        successful: result.successful,
        failed: result.failed,
        errors: (result.errors || []).map((e: any) => ({ response_id: e.response_id, error: e.message || e.error || 'Naməlum xəta' })),
      });
      if (result.successful > 0) {
        apiClient.clearCache();
        await queryClient.invalidateQueries();
        setSelectedResponses([]);
        toast({ title: "Uğurlu əməliyyat", description: `${result.successful} cavab ${action === 'approve' ? 'təsdiqləndi' : 'işlənildi'}` });
      }
    } catch (error: any) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Unified Analytics for consistent stats across tabs
  const { data: analyticsData } = useQuery({
    queryKey: ['survey-analytics-overview', selectedSurvey?.id],
    queryFn: () => selectedSurvey?.id ? surveyService.getSurveyAnalyticsOverview(selectedSurvey.id) : null,
    enabled: !!selectedSurvey?.id,
    staleTime: 2 * 60 * 1000,
  });

  const stats: ApprovalStats = responsesData?.stats || { total: 0, pending: 0, approved: 0, rejected: 0, draft: 0, in_progress: 0, returned: 0, completion_rate: 0 };

  if (!canViewApprovals) return <div className="p-12 text-center">Giriş icazəsi yoxdur</div>;

  return (
    <div className={cn("container mx-auto space-y-6", isCompact ? "p-0" : "p-6")}>
      {!isCompact && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" /> Sorğu Cavablarının Təsdiqi
            </h1>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} /> Yenilə
          </Button>
        </div>
      )}

      {!isCompact && (
        <UnifiedSurveySelector surveys={publishedSurveys} selectedSurvey={selectedSurvey} onSurveySelect={(s) => handleSurveySelect(s as PublishedSurvey)} isLoading={surveysLoading} />
      )}

      {selectedSurvey && (
        <>
          {!isCompact && (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
               <Card className={cn("cursor-pointer hover:ring-2 ring-blue-500", !filters.status && "bg-blue-50")} onClick={() => handleStatCardFilter({})}>
                  <CardContent className="p-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div><p className="text-xs text-muted-foreground">Ümumi</p><p className="text-xl font-bold">{stats.total}</p></div>
                  </CardContent>
               </Card>
               <Card className={cn("cursor-pointer hover:ring-2 ring-yellow-500", filters.status === 'submitted' && "bg-yellow-50")} onClick={() => handleStatCardFilter({ status: 'submitted' })}>
                  <CardContent className="p-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <div><p className="text-xs text-muted-foreground">Gözləyir</p><p className="text-xl font-bold">{stats.pending}</p></div>
                  </CardContent>
               </Card>
               <Card className={cn("cursor-pointer hover:ring-2 ring-green-500", filters.status === 'approved' && "bg-green-50")} onClick={() => handleStatCardFilter({ status: 'approved' })}>
                  <CardContent className="p-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div><p className="text-xs text-muted-foreground">Təsdiqləndi</p><p className="text-xl font-bold">{stats.approved}</p></div>
                  </CardContent>
               </Card>
               <Card className="bg-slate-50"><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground text-center">Tamamlanma</p>
                  <p className="text-xl font-bold text-center">{stats.completion_rate.toFixed(1)}%</p>
               </CardContent></Card>
            </div>
          )}

          {/* Filters & Bulk Actions */}
          {!isCompact ? (
            <Card className="mb-6">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filterlər</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Axtar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" /></div>
                  <Select value={filters.status || 'all'} onValueChange={v => handleFilterChange('status', v === 'all' ? undefined : v)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Bütün statuslar</SelectItem><SelectItem value="submitted">Göndərilib</SelectItem><SelectItem value="approved">Təsdiqlənib</SelectItem></SelectContent></Select>
                  <Input type="date" value={filters.date_from || ''} onChange={e => handleFilterChange('date_from', e.target.value)} />
                  <Input type="date" value={filters.date_to || ''} onChange={e => handleFilterChange('date_to', e.target.value)} />
                </div>
                {selectedResponses.length > 0 && (
                  <div className="p-4 bg-primary/10 rounded-lg flex justify-between items-center">
                    <span className="font-bold">{selectedResponses.length} seçildi</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleBulkAction('approve')}>Təsdiqlə</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleBulkAction('reject')}>Rədd et</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 mb-4 mt-2 px-6">
              <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 bg-white">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input 
                    placeholder="Müəssisə adı axtar..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 h-8 rounded-lg text-xs bg-slate-50 border-transparent focus:bg-white transition-all" 
                  />
                </div>
                
                {/* Unified Header Stats - Vertical Stack */}
                {analyticsData?.kpi_metrics && (
                  <div className="flex items-center gap-5 ml-4">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Hədəf</span>
                        <span className="text-[13px] font-bold text-blue-600 leading-none">
                          {analyticsData.kpi_metrics.target_participants || 0}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Cavab</span>
                        <span className="text-[13px] font-bold text-slate-700 leading-none">
                          {analyticsData.kpi_metrics.total_responses || 0}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Gözləyən</span>
                        <span className="text-[13px] font-bold text-amber-600 leading-none">
                          {analyticsData.kpi_metrics.in_progress_responses || 0}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Təsdiq</span>
                        <span className="text-[13px] font-bold text-emerald-600 leading-none">
                          {analyticsData.kpi_metrics.completed_responses || 0}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold leading-none mb-1">Tamamlanma %</span>
                        <span className="text-[13px] font-bold text-indigo-600 leading-none">
                          {analyticsData.kpi_metrics.target_participants 
                            ? Math.round(((analyticsData.kpi_metrics.completed_responses || 0) / analyticsData.kpi_metrics.target_participants) * 1000) / 10 
                            : 0}%
                        </span>
                    </div>
                  </div>
                )}

                {headerActions && (
                  <div className="flex items-center ml-auto pl-4 border-l border-slate-100">
                    {headerActions}
                  </div>
                )}
              </div>
              {selectedResponses.length > 0 && (
                <div className="rounded-xl bg-slate-900 text-white p-3 flex items-center justify-between shadow-lg">
                  <span className="ml-2 text-sm">{selectedResponses.length} seçildi</span>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-white text-slate-900 h-8" onClick={() => handleBulkAction('approve')}>Təsdiqlə</Button>
                    <Button size="sm" variant="ghost" className="text-white h-8" onClick={() => handleBulkAction('return')}>Qaytar</Button>
                    <Button size="icon" variant="ghost" className="text-red-400 h-8 w-8" onClick={() => handleBulkAction('reject')}><XCircle className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Müəssisə Cavabları</CardTitle></CardHeader>
            <CardContent>
              {bulkResult && (
                <div className="mb-4 p-3 border rounded-lg flex items-center gap-3">
                  {bulkResult.successful > 0 && <Badge className="bg-green-100 text-green-800">✓ {bulkResult.successful} uğurlu</Badge>}
                  {bulkResult.failed > 0 && <Badge variant="destructive">✗ {bulkResult.failed} xəta</Badge>}
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setBulkResult(null)}>✕</Button>
                </div>
              )}
              <ResponseManagementTable
                responses={responsesData?.responses || []}
                pagination={responsesData?.pagination}
                loading={responsesLoading}
                error={responsesError}
                selectedResponses={selectedResponses}
                onResponseSelect={handleResponseSelect}
                onBulkSelect={handleBulkSelect}
                onFiltersChange={handleFilterChange}
                filters={filters}
                onResponseEdit={handleResponseEdit}
                onResponseViewTab={handleResponseViewTab}
                selectedSurvey={effectiveSurvey}
                onBulkAction={handleBulkAction}
                onUpdate={() => { refetchResponses(); queryClient.invalidateQueries(); }}
              />
            </CardContent>
          </Card>
        </>
      )}

      {selectedResponse && (
        <ResponseDetailModal
          open={showResponseModal}
          onClose={() => { setShowResponseModal(false); setSelectedResponse(null); }}
          responseId={selectedResponse.id}
          defaultTab={defaultTab}
          onUpdate={() => { refetchResponses(); queryClient.invalidateQueries(); }}
        />
      )}
    </div>
  );
};

export default SurveyApprovalDashboard;
