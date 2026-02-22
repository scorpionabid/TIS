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
import ResponseManagementTable from './table/ResponseManagementTable';
import ResponseDetailModal from './ResponseDetailModal';
import BulkApprovalInterface from './BulkApprovalInterface';
import UnifiedSurveySelector from './UnifiedSurveySelector';

const SurveyApprovalDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const approvalsAccess = useModuleAccess('approvals');
  const canViewApprovals = approvalsAccess.canView;
  const canManageApprovals = approvalsAccess.canManage;

  // Component lifecycle logging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 [Dashboard] Component mounted, user role:', currentUser?.role);
    }
  }, [currentUser]);

  // State management with storage-backed persistence
  const [selectedSurvey, setSelectedSurvey] = useState<PublishedSurvey | null>(() => {
    const saved = storageHelpers.get<PublishedSurvey>('approvals_selected_survey');
    return saved || null;
  });
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponseForApproval | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedResponses, setSelectedResponses] = useState<number[]>([]);
  const [defaultTab, setDefaultTab] = useState<'details' | 'responses' | 'history'>('details');
  
  // Filters state - default to showing only submitted responses
  const [filters, setFilters] = useState<ResponseFilters>({
    per_page: 25,
    status: undefined, // Show all responses by default
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    successful: number;
    failed: number;
    errors: Array<{ response_id: number; error: string }>;
  } | null>(null);

  // Fetch published surveys
  const {
    data: publishedSurveys,
    isLoading: surveysLoading,
    error: surveysError
  } = useQuery({
    queryKey: ['published-surveys'],
    queryFn: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 [Dashboard] Fetching published surveys...');
      }
      return surveyApprovalService.getPublishedSurveys();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: canViewApprovals,
  });

  // Fetch survey responses when survey is selected
  const { 
    data: responsesData, 
    isLoading: responsesLoading,
    error: responsesError,
    refetch: refetchResponses
  } = useQuery({
    queryKey: ['survey-responses-approval', selectedSurvey?.id, filters],
    queryFn: () => selectedSurvey ? 
      surveyApprovalService.getResponsesForApproval(selectedSurvey.id, filters) : 
      null,
    enabled: !!selectedSurvey && canViewApprovals,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch institutions for filtering
  const { data: institutions } = useQuery({
    queryKey: ['institutions-for-filters'],
    queryFn: surveyApprovalService.getInstitutions,
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: canViewApprovals,
  });

  // Get survey questions from the selected published survey
  const surveyQuestions = React.useMemo(() => {
    if (!selectedSurvey) return [];

    // If the published survey already has questions loaded, use them
    const questions = (selectedSurvey as any)?.questions || [];

    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 [DEBUG] Survey questions from published survey:', {
        selectedSurveyId: selectedSurvey?.id,
        questionsCount: questions.length,
        questions: questions
      });
    }

    return questions;
  }, [selectedSurvey]);

  // Log query states (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [Dashboard] Query states updated:', {
        surveysLoading,
        surveysError: surveysError ? {
          message: surveysError.message,
          response: (surveysError as any).response?.data,
          status: (surveysError as any).response?.status
        } : null,
        publishedSurveysCount: Array.isArray(publishedSurveys) ? publishedSurveys.length : 0
      });
    }
  }, [surveysLoading, surveysError, publishedSurveys]);

  // Auto-select survey: prioritize localStorage, then first available
  useEffect(() => {
    if (!Array.isArray(publishedSurveys)) {
      return;
    }

    if (publishedSurveys.length === 0) {
      if (selectedSurvey) {
        console.log('⚠️ [Dashboard] No published surveys available, clearing selected survey');
        setSelectedSurvey(null);
        storageHelpers.remove('approvals_selected_survey');
      }
      return;
    }

    const hasSelectedSurvey = selectedSurvey
      ? publishedSurveys.some((s: PublishedSurvey) => s.id === selectedSurvey.id)
      : false;

    if (hasSelectedSurvey) {
      return;
    }

    const saved = storageHelpers.get<PublishedSurvey>('approvals_selected_survey');
    let surveyToSelect: PublishedSurvey | null = null;

    if (saved) {
      surveyToSelect = publishedSurveys.find((s: PublishedSurvey) => s.id === saved.id) || null;
      if (surveyToSelect) {
        console.log('🎯 [Dashboard] Restored saved survey from local storage:', surveyToSelect.title);
      } else {
        console.log('⚠️ [Dashboard] Saved survey no longer accessible, clearing local storage');
        storageHelpers.remove('approvals_selected_survey');
      }
    }

    if (!surveyToSelect) {
      surveyToSelect = publishedSurveys[0];
      console.log('🎯 [Dashboard] Selecting first available survey:', surveyToSelect.title);
    }

    storageHelpers.set('approvals_selected_survey', surveyToSelect);
    setSelectedSurvey(surveyToSelect);
  }, [publishedSurveys, selectedSurvey]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof ResponseFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  }, []);

  // Handle stat card click — reset status filters and apply the selected one
  const handleStatCardFilter = useCallback((
    overrides: { status?: ResponseFilters['status']; approval_status?: ResponseFilters['approval_status'] }
  ) => {
    setFilters(prev => ({
      per_page: prev.per_page,
      status: overrides.status,
      approval_status: overrides.approval_status,
    }));
    setSearchTerm('');
  }, []);

  // Handle survey selection with localStorage persistence
  const handleSurveySelect = (survey: PublishedSurvey) => {
    console.log('📋 [DASHBOARD] Survey selection changing:', {
      previousSurvey: selectedSurvey?.id,
      newSurvey: survey.id,
      hasSelectedResponses: selectedResponses.length > 0,
      selectedResponseIds: selectedResponses
    });

    // Only reset selections if actually changing to a different survey
    if (selectedSurvey?.id !== survey.id) {
      console.log('🔄 [DASHBOARD] Different survey selected - clearing selections');
      setSelectedResponses([]);
      setFilters({ per_page: 25, status: undefined }); // Reset filters to show all statuses
      setSearchTerm('');
    } else {
      console.log('✅ [DASHBOARD] Same survey reselected - keeping selections');
    }

    // Save to storage for persistence across page reloads
    storageHelpers.set('approvals_selected_survey', survey);
    setSelectedSurvey(survey);
  };

  // Handle response selection
  const handleResponseSelect = (response: SurveyResponseForApproval) => {
    setSelectedResponse(response);
    setShowResponseModal(true);
  };

  // Handle response selection with specific tab
  const handleResponseViewTab = (response: SurveyResponseForApproval, tab: 'details' | 'responses' | 'history') => {
    setSelectedResponse(response);
    setDefaultTab(tab);
    setShowResponseModal(true);
  };

  // Handle response editing
  const handleResponseEdit = useCallback((response: SurveyResponseForApproval) => {
    // Edit functionality is handled by UnifiedResponseEditModal in the table component
    setSelectedResponse(response);
    setShowResponseModal(true);

    toast({
      title: "Redaktə rejimi",
      description: `${response.institution?.name} müəssisəsinin cavabını redaktə edirsiniz`,
    });
  }, [toast]);

  // Handle bulk selection
  const handleBulkSelect = (responseIds: number[]) => {
    console.log('🔄 [DASHBOARD] Bulk selection changed:', {
      previousCount: selectedResponses.length,
      newCount: responseIds.length,
      previousIds: selectedResponses,
      newIds: responseIds,
      surveyId: selectedSurvey?.id
    });
    setSelectedResponses(responseIds);
  };

  // Handle bulk operations
  const handleBulkAction = async (action: 'approve' | 'reject' | 'return', comments?: string) => {
    if (!canManageApprovals) {
      toast({
        title: 'İcazə yoxdur',
        description: 'Bu əməliyyat üçün təsdiq icazəsi (approvals.approve) tələb olunur.',
        variant: 'destructive',
      });
      return;
    }

    console.log('🚨 [DASHBOARD handleBulkAction] CALLED with:', {
      action,
      comments,
      selectedResponsesCount: selectedResponses.length,
      selectedResponses
    });

    if (selectedResponses.length === 0) {
      toast({
        title: "Xəta",
        description: "Həç bir cavab seçilməyib",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🚨 [DASHBOARD BULK ACTION] Starting direct bulk action:', {
        action,
        selectedResponses,
        comments
      });

      const result = await surveyApprovalService.performBulkApproval(
        selectedResponses,
        action,
        comments || `Dashboard vasitəsilə ${action === 'approve' ? 'təsdiqləndi' : action === 'reject' ? 'rədd edildi' : 'geri qaytarıldı'}`
      );

      console.log('✅ [DASHBOARD BULK ACTION] Bulk action completed:', result);
      console.log('📊 [DASHBOARD BULK ACTION] Detailed result:', {
        successful: result.successful,
        failed: result.failed,
        total: selectedResponses.length,
        results: result.results,
        errors: result.errors
      });

      // Save result for inline notification bar
      setBulkResult({
        successful: result.successful,
        failed: result.failed,
        errors: (result.errors || []).map((e: any) => ({
          response_id: e.response_id,
          error: e.message || e.error || 'Naməlum xəta',
        })),
      });

      // Check if operation was actually successful
      if (result.successful > 0) {
        // Clear API cache first
        console.log('🧹 [DASHBOARD] Clearing API cache...');
        apiClient.clearCache();

        // Clear both React Query cache and API cache immediately
        console.log('🔄 [DASHBOARD] Invalidating queries immediately...');
        await queryClient.invalidateQueries();

        // Force refetch all approval data with correct query key including filters
        console.log('🔄 [DASHBOARD] Force refetching data with filters...', { filters });
        await queryClient.refetchQueries({
          queryKey: ['survey-responses-approval', selectedSurvey?.id, filters]
        });

        // Also invalidate without filters to catch any partial matches
        await queryClient.invalidateQueries({
          queryKey: ['survey-responses-approval', selectedSurvey?.id]
        });

        // Also force a second refetch after a delay
        setTimeout(async () => {
          console.log('🔄 [DASHBOARD] Second refetch after delay...');
          await queryClient.refetchQueries({
            queryKey: ['survey-responses-approval', selectedSurvey?.id, filters]
          });

          // Final invalidation of all related queries
          await queryClient.invalidateQueries({
            predicate: (query) => {
              return query.queryKey[0] === 'survey-responses-approval' &&
                     query.queryKey[1] === selectedSurvey?.id;
            }
          });
        }, 500);

        // Clear selection
        setSelectedResponses([]);

        // Show success toast
        toast({
          title: "Uğurlu əməliyyat",
          description: `${result.successful} cavab ${action === 'approve' ? 'təsdiqləndi' : action === 'reject' ? 'rədd edildi' : 'geri qaytarıldı'}`,
          variant: "default",
        });
      }

      // Show error details if any failed
      if (result.failed > 0) {
        const errorDetails = result.errors?.map((error: any) =>
          `ID ${error.response_id}: ${error.message || error.error}`
        ).join(', ') || 'Naməlum xəta';

        toast({
          title: "Qismən uğursuz",
          description: `${result.failed} cavab uğursuz: ${errorDetails}`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('❌ [DASHBOARD BULK ACTION] Failed:', error);

      toast({
        title: "Xəta",
        description: error.message || "Bulk əməliyyat zamanı xəta baş verdi",
        variant: "destructive",
      });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['published-surveys'] }),
        selectedSurvey && queryClient.invalidateQueries({ 
          queryKey: ['survey-responses-approval', selectedSurvey.id] 
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };


  // Get unique institution types for filtering
  const institutionTypes = institutions ? [
    ...new Set(institutions.map(inst => inst.type).filter(Boolean))
  ] : [];

  // Calculate stats from current data
  const stats: ApprovalStats = responsesData?.stats || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    draft: 0,
    in_progress: 0,
    returned: 0,
    completion_rate: 0,
  };

  if (!canViewApprovals) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu bölmə üçün `approvals.read` və ya `survey_responses.read` icazəsi tələb olunur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <Target className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
            Sorğu Cavablarının Təsdiqi
          </h1>
          <p className="text-muted-foreground mt-1">
            Yayımlanmış sorğulara verilən cavabları idarə edin və təsdiq edin
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Yenilə
          </Button>
        </div>
      </div>

      {/* Unified Survey Selection */}
      <UnifiedSurveySelector
        surveys={publishedSurveys}
        selectedSurvey={selectedSurvey}
        onSurveySelect={(survey) => handleSurveySelect(survey as PublishedSurvey)}
        isLoading={surveysLoading}
      />

      {selectedSurvey && (
        <>
          {/* Statistics Dashboard — clickable cards filter the table */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
            {/* Ümumi — clears all status filters */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-blue-300 ${
                !filters.status && !filters.approval_status ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
              }`}
              onClick={() => handleStatCardFilter({})}
              title="Bütün cavabları göstər"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ümumi</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gözləyir — status = 'submitted' (təqdim edilmiş, hər hansı approval vəziyyətində) */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-yellow-300 ${
                filters.status === 'submitted' ? 'ring-2 ring-yellow-500 bg-yellow-50/50' : ''
              }`}
              onClick={() => handleStatCardFilter({ status: 'submitted' })}
              title="Gözləyən cavabları göstər"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Gözləyir</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* İcrada — approval_status = 'in_progress' */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-orange-300 ${
                filters.approval_status === 'in_progress' ? 'ring-2 ring-orange-500 bg-orange-50/50' : ''
              }`}
              onClick={() => handleStatCardFilter({ approval_status: 'in_progress' })}
              title="İcrada olan cavabları göstər"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">İcrada</p>
                    <p className="text-2xl font-bold">{stats.in_progress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Geri qaytarıldı — approval_status = 'returned' */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-amber-300 ${
                filters.approval_status === 'returned' ? 'ring-2 ring-amber-600 bg-amber-50/50' : ''
              }`}
              onClick={() => handleStatCardFilter({ approval_status: 'returned' })}
              title="Geri qaytarılmış cavabları göstər"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Geri qaytarıldı</p>
                    <p className="text-2xl font-bold">{stats.returned}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Təsdiqləndi — status = 'approved' */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-green-300 ${
                filters.status === 'approved' ? 'ring-2 ring-green-600 bg-green-50/50' : ''
              }`}
              onClick={() => handleStatCardFilter({ status: 'approved' })}
              title="Təsdiqlənmiş cavabları göstər"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Təsdiqləndi</p>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rədd edildi — status = 'rejected' */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-red-300 ${
                filters.status === 'rejected' ? 'ring-2 ring-red-500 bg-red-50/50' : ''
              }`}
              onClick={() => handleStatCardFilter({ status: 'rejected' })}
              title="Rədd edilmiş cavabları göstər"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rədd edildi</p>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tamamlanma % — non-clickable */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tamamlanma</p>
                    <p className="text-2xl font-bold">{stats.completion_rate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filterlər və Axtarış
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Müəssisə adı axtarın..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün statuslar</SelectItem>
                    <SelectItem value="draft">Qaralama</SelectItem>
                    <SelectItem value="submitted">Təqdim edilib</SelectItem>
                    <SelectItem value="approved">Təsdiqlənib</SelectItem>
                    <SelectItem value="rejected">Rədd edilib</SelectItem>
                  </SelectContent>
                </Select>

                {/* Approval Status Filter */}
                <Select
                  value={filters.approval_status || 'all'}
                  onValueChange={(value) => handleFilterChange('approval_status', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Təsdiq statusu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün təsdiq statusları</SelectItem>
                    <SelectItem value="approved">Təsdiqləndi</SelectItem>
                    <SelectItem value="rejected">Rədd edildi</SelectItem>
                    <SelectItem value="returned">Geri qaytarıldı</SelectItem>
                  </SelectContent>
                </Select>

                {/* Institution Type Filter */}
                <Select
                  value={filters.institution_type || 'all'}
                  onValueChange={(value) => handleFilterChange('institution_type', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Müəssisə tipi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün tiplər</SelectItem>
                    {institutionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tarixdən
                  </label>
                  <Input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tarixə
                  </label>
                  <Input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                  />
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedResponses.length > 0 && (
                <div className="mt-4 rounded-lg bg-primary/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {selectedResponses.length} cavab seçildi
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleBulkAction('approve')}
                        className="w-full sm:w-auto"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Təsdiq Et
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBulkAction('reject')}
                        className="w-full sm:w-auto"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rədd Et
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction('return')}
                        className="w-full sm:w-auto"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Geri Qaytart
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responses Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Müəssisə Cavabları
                {responsesData?.pagination && (
                  <Badge variant="outline" className="ml-2">
                    {responsesData.pagination.total} ümumi
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Bulk Action Result Bar */}
              {bulkResult && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3">
                  {bulkResult.successful > 0 && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      ✓ {bulkResult.successful} uğurlu
                    </Badge>
                  )}
                  {bulkResult.failed > 0 && (
                    <Badge variant="destructive">
                      ✗ {bulkResult.failed} xəta
                    </Badge>
                  )}
                  {bulkResult.failed > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          Detallar
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 w-full">
                        <div className="rounded border bg-muted/50 p-2 space-y-1 max-h-32 overflow-y-auto">
                          {bulkResult.errors.map((e) => (
                            <p key={e.response_id} className="text-xs text-red-600">
                              ID {e.response_id}: {e.error}
                            </p>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={() => setBulkResult(null)}
                  >
                    ✕
                  </Button>
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
                selectedSurvey={selectedSurvey}
                onBulkAction={handleBulkAction}
                onUpdate={() => {
                  refetchResponses();
                  queryClient.invalidateQueries({
                    queryKey: ['survey-responses-approval', selectedSurvey?.id]
                  });
                }}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Response Detail Modal */}
      {selectedResponse && (
        <ResponseDetailModal
          open={showResponseModal}
          onClose={() => {
            setShowResponseModal(false);
            setSelectedResponse(null);
            setDefaultTab('details');
          }}
          responseId={selectedResponse.id}
          defaultTab={defaultTab}
          onUpdate={() => {
            refetchResponses();
            queryClient.invalidateQueries({
              queryKey: ['survey-responses-approval', selectedSurvey?.id]
            });
          }}
        />
      )}

      {/* Bulk Approval Modal */}
      {showBulkModal && canManageApprovals && (
        <BulkApprovalInterface
          open={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          selectedResponses={selectedResponses}
          onComplete={() => {
            setSelectedResponses([]);
            setShowBulkModal(false);
            refetchResponses();
          }}
        />
      )}
    </div>
  );
};

export default SurveyApprovalDashboard;
