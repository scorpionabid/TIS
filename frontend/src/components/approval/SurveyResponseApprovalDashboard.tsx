import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
  BarChart3,
  Users,
  Calendar,
  FileText
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import surveyResponseApprovalService, {
  PublishedSurvey,
  ResponseFilters,
  ApprovalStats,
  SurveyResponseForApproval
} from '../../services/surveyResponseApproval';
import { apiClient } from '../../services/apiOptimized';
import ResponseManagementTable from './table/ResponseManagementTable';
import ResponseDetailModal from './ResponseDetailModal';
import BulkApprovalInterface from './BulkApprovalInterface';

const SurveyResponseApprovalDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Component lifecycle logging (reduced)
  useEffect(() => {
    console.log('🔧 [Dashboard] Component mounted, user role:', currentUser?.role);
  }, [currentUser]);

  // State management
  const [selectedSurvey, setSelectedSurvey] = useState<PublishedSurvey | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponseForApproval | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedResponses, setSelectedResponses] = useState<number[]>([]);
  const [defaultTab, setDefaultTab] = useState<'details' | 'responses' | 'history'>('details');
  
  // Filters state
  const [filters, setFilters] = useState<ResponseFilters>({
    per_page: 25,
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch published surveys
  const {
    data: publishedSurveys,
    isLoading: surveysLoading,
    error: surveysError
  } = useQuery({
    queryKey: ['published-surveys'],
    queryFn: () => {
      console.log('🚀 [Dashboard] Fetching published surveys...');
      return surveyResponseApprovalService.getPublishedSurveys();
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
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
      surveyResponseApprovalService.getResponsesForApproval(selectedSurvey.id, filters) : 
      null,
    enabled: !!selectedSurvey,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch institutions for filtering
  const { data: institutions } = useQuery({
    queryKey: ['institutions-for-filters'],
    queryFn: surveyResponseApprovalService.getInstitutions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Log query states
  useEffect(() => {
    console.log('📊 [Dashboard] Query states updated:', {
      surveysLoading,
      surveysError: surveysError ? {
        message: surveysError.message,
        response: (surveysError as any).response?.data,
        status: (surveysError as any).response?.status
      } : null,
      publishedSurveysCount: Array.isArray(publishedSurveys) ? publishedSurveys.length : 0
    });
  }, [surveysLoading, surveysError, publishedSurveys]);

  // Auto-select first survey if none selected
  useEffect(() => {
    if (Array.isArray(publishedSurveys) && publishedSurveys.length > 0 && !selectedSurvey) {
      console.log('🎯 [Dashboard] Published surveys data:', publishedSurveys);
      console.log('🎯 [Dashboard] First survey:', publishedSurveys[0]);
      setSelectedSurvey(publishedSurveys[0]);
    }
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

  // Handle survey selection
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
      setFilters({ per_page: 25 }); // Reset filters
      setSearchTerm('');
    } else {
      console.log('✅ [DASHBOARD] Same survey reselected - keeping selections');
    }

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

      const result = await surveyResponseApprovalService.performBulkApproval(
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
    completion_rate: 0,
  };

  if (!currentUser || !['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız idarəçi rolları daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Sorğu Cavablarının Təsdiqi
          </h1>
          <p className="text-muted-foreground mt-1">
            Yayımlanmış sorğulara verilən cavabları idarə edin və təsdiq edin
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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

      {/* Survey Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sorğu Seçimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {surveysLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Sorğular yüklənir...
            </div>
          ) : surveysError ? (
            <div className="text-red-500">Sorğular yüklənə bilmədi</div>
          ) : !Array.isArray(publishedSurveys) || publishedSurveys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4" />
              <p>Hazırda yayımlanmış sorğu yoxdur</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedSurvey?.id?.toString() || ""}
                  onValueChange={(value) => {
                    const survey = publishedSurveys.find((s: any) => s.id.toString() === value);
                    if (survey) handleSurveySelect(survey);
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
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {selectedSurvey.start_date && new Date(selectedSurvey.start_date).toLocaleDateString('az-AZ')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {selectedSurvey.target_institutions?.length || 0} müəssisə
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {selectedSurvey.questions_count || 0} sual
                    </div>
                  </div>
                )}
              </div>

              {selectedSurvey?.description && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {selectedSurvey.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSurvey && (
        <>
          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
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
            
            <Card>
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
            
            <Card>
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
            
            <Card>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filterlər və Axtarış
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <SelectItem value="pending">Gözləyir</SelectItem>
                    <SelectItem value="in_progress">İcrada</SelectItem>
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

              {/* Bulk Actions */}
              {selectedResponses.length > 0 && (
                <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {selectedResponses.length} cavab seçildi
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleBulkAction('approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Təsdiq Et
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBulkAction('reject')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rədd Et
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction('return')}
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
      {showBulkModal && (
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

export default SurveyResponseApprovalDashboard;