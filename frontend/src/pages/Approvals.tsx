import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SurveyApprovalDashboard from '../components/approval/SurveyApprovalDashboard';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Shield, AlertTriangle, Target, Eye, BarChart3 } from 'lucide-react';

// Inline SurveyResults component
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import {
  Download,
  TrendingUp,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  BarChart,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { surveyService, Survey } from '../services/surveys';
import { useToast } from '../hooks/use-toast';
import surveyApprovalService, { PublishedSurvey, SurveyResponseForApproval } from '../services/surveyApproval';

const Approvals: React.FC = () => {
  const { currentUser: user } = useAuth();
  
  // Debug user object
  console.log('Approvals page - user object:', user);
  console.log('Approvals page - user.role:', user?.role);

  // Check if user has approval permissions
  const hasApprovalPermissions = () => {
    console.log('hasApprovalPermissions - checking user:', user);
    if (!user) {
      console.log('hasApprovalPermissions - no user, returning false');
      return false;
    }
    
    const approvalRoles = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'];
    console.log('hasApprovalPermissions - approvalRoles:', approvalRoles);
    
    // Check user.role
    if (user.role && approvalRoles.includes(user.role)) {
      console.log('hasApprovalPermissions - found role in user.role:', user.role);
      return true;
    }
    
    console.log('hasApprovalPermissions - no matching roles found, returning false');
    console.log('hasApprovalPermissions - user.role:', user.role);
    return false;
  };

  if (!hasApprovalPermissions()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Təsdiq Paneline Giriş Yoxdur
            </h2>
            <p className="text-gray-600 mb-4">
              Bu səhifəyə giriş üçün təsdiq icazələriniz yoxdur.
            </p>
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Təsdiq paneline giriş üçün SuperAdmin, RegionAdmin, SektorAdmin və ya SchoolAdmin rolları tələb olunur.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Təsdiq Paneli
        </h1>
        <p className="text-muted-foreground mt-1">
          Məlumat təsdiqi və sorğu cavablarının idarə edilməsi
        </p>
      </div>

      <Tabs defaultValue="survey-responses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="survey-responses" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Sorğu Cavabları
          </TabsTrigger>
          <TabsTrigger value="survey-results" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sorğu Nəticələri
          </TabsTrigger>
          <TabsTrigger value="survey-view" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Sorğulara Baxış
          </TabsTrigger>
        </TabsList>

        <TabsContent value="survey-responses">
          <SurveyApprovalDashboard />
        </TabsContent>

        <TabsContent value="survey-results">
          <SurveyResultsTab />
        </TabsContent>

        <TabsContent value="survey-view">
          <SurveyViewDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// SurveyResults Tab Component (inline)
const SurveyResultsTab: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  // Get surveys data with real API integration
  const { data: surveysData, isLoading: surveysLoading, error: surveysError } = useQuery({
    queryKey: ['surveys', { status: statusFilter, search: searchTerm }],
    queryFn: () => surveyService.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter as Survey['status'],
      search: searchTerm || undefined,
      per_page: 50
    }),
    enabled: true,
  });

  // Get real analytics overview from backend with fallback
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['survey-analytics-overview'],
    queryFn: () => surveyService.getAnalyticsOverview(),
    enabled: true,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fallback stats calculation from surveys data with safe array access
  const surveysArray = surveysData?.data?.data || surveysData?.data || [];
  const statsData = analyticsData || {
    overview: {
      total_surveys: Array.isArray(surveysArray) ? surveysArray.length : 0,
      active_surveys: Array.isArray(surveysArray) ? surveysArray.filter((s: Survey) => s.status === 'published').length : 0,
      draft_surveys: Array.isArray(surveysArray) ? surveysArray.filter((s: Survey) => s.status === 'draft').length : 0,
      closed_surveys: Array.isArray(surveysArray) ? surveysArray.filter((s: Survey) => s.status === 'archived').length : 0,
      archived_surveys: Array.isArray(surveysArray) ? surveysArray.filter((s: Survey) => s.status === 'archived').length : 0,
      my_surveys: Array.isArray(surveysArray) ? surveysArray.length : 0,
      my_active_surveys: Array.isArray(surveysArray) ? surveysArray.filter((s: Survey) => s.status === 'published').length : 0,
    },
    response_stats: {
      total_responses: Array.isArray(surveysArray) ? surveysArray.reduce((sum: number, s: Survey) => sum + (s.response_count || 0), 0) : 0,
      completed_responses: Array.isArray(surveysArray) ? surveysArray.reduce((sum: number, s: Survey) => sum + (s.response_count || 0), 0) : 0,
      completion_rate: 85,
      average_response_rate: 76,
    }
  };

  const statsLoading = analyticsLoading;

  // Export functionality
  const exportMutation = useMutation({
    mutationFn: async (surveyId: number) => {
      const blob = await surveyService.exportResponses(surveyId, 'xlsx');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `survey-${surveyId}-results.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Uğurlu",
        description: "Nəticələr uğurla yükləndi"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.message || 'Yükləmə zamanı xəta baş verdi',
        variant: "destructive"
      });
    }
  });

  const handleExportAll = async () => {
    if (!Array.isArray(surveysArray) || surveysArray.length === 0) {
      toast({
        title: "Xəta",
        description: "Export ediləcək sorğu tapılmadı",
        variant: "destructive"
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    try {
      for (const survey of surveysArray) {
        try {
          await exportMutation.mutateAsync(survey.id);
          successCount++;
          // Add small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          errorCount++;
          console.error(`Export error for survey ${survey.id}:`, error);
        }
      }

      toast({
        title: "Tamamlandı",
        description: `${successCount} sorğu uğurla export edildi${errorCount > 0 ? `, ${errorCount} sorğuda xəta baş verdi` : ''}`
      });
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Bulk export zamanı ümumi xəta baş verdi",
        variant: "destructive"
      });
      console.error('Bulk export error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'draft': return 'bg-gray-500';
      case 'paused': return 'bg-yellow-500';
      case 'archived': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Aktiv';
      case 'draft': return 'Qaralama';
      case 'paused': return 'Dayandırılıb';
      case 'archived': return 'Arxivləşdirilib';
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sorğu Nəticələri</h1>
          <p className="text-muted-foreground">Toplanmış nəticələrin təhlili və hesabatlar</p>
        </div>
        <Button
          onClick={handleExportAll}
          disabled={exportMutation.isPending || !Array.isArray(surveysArray) || surveysArray.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {exportMutation.isPending ? 'Yüklənir...' : 'Bütün Nəticələri Yüklə'}
        </Button>
      </div>

      {/* Error Handling for API failures */}
      {(surveysError || analyticsError) && (
        <Alert className="mb-6" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Məlumatlar yüklənərkən xəta baş verdi. Zəhmət olmasa səhifəni yeniləyin.
            {surveysError && ` (${surveysError.message})`}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards - Real Data Integration */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi sorğular</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : statsData?.overview?.total_surveys || 0}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv sorğular</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : statsData?.overview?.active_surveys || 0}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi cavablar</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : (statsData?.response_stats?.total_responses || 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cavab dərəcəsi</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : `${statsData?.response_stats?.average_response_rate || 0}%`}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Qaralama sorğular</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : statsData?.overview?.draft_surveys || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrləmə və Axtarış
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Sorğu adı ilə axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  <SelectItem value="published">Aktiv</SelectItem>
                  <SelectItem value="paused">Dayandırılıb</SelectItem>
                  <SelectItem value="archived">Arxivləşdirilib</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Survey Results List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Sorğu Nəticələri
          </CardTitle>
          <CardDescription>
            Mövcud sorğuların ətraflı nəticələri və statistikalar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {surveysLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Yüklənir...</span>
            </div>
          ) : !Array.isArray(surveysArray) || surveysArray.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {searchTerm || statusFilter !== 'all'
                  ? 'Axtarış şərtlərinə uyğun sorğu tapılmadı.'
                  : 'Hələ heç bir sorğu yaradılmayıb.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Handle different API response structures safely */}
              {surveysArray.map((survey: Survey) => (
                <SurveyResultCard
                  key={survey.id}
                  survey={survey}
                  onExport={() => exportMutation.mutate(survey.id)}
                  isExporting={exportMutation.isPending}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Survey Result Card Component
interface SurveyResultCardProps {
  survey: Survey;
  onExport: () => void;
  isExporting: boolean;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  navigate: (path: string) => void;
}

function SurveyResultCard({ survey, onExport, isExporting, getStatusColor, getStatusText, navigate }: SurveyResultCardProps) {
  useQuery({
    queryKey: ['survey-stats', survey.id],
    queryFn: () => surveyService.getStats(survey.id),
    enabled: !!survey.id,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const responseRate = survey.max_responses
    ? Math.round((survey.response_count || 0) / survey.max_responses * 100)
    : 0;

  // Handle different data field names from API
  const responsesCount = survey.response_count || 0;
  const questionsCount = survey.questions_count || survey.questions?.length || 0;
  const targetInstitutionsCount = survey.target_institutions?.length || 0;

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-medium">{survey.title}</h3>
          <Badge className={getStatusColor(survey.status)}>
            {getStatusText(survey.status)}
          </Badge>
          {survey.is_anonymous && (
            <Badge variant="outline">Anonim</Badge>
          )}
        </div>

        {survey.description && (
          <p className="text-sm text-muted-foreground mb-3 overflow-hidden text-ellipsis" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            maxHeight: '2.5em'
          }}>
            {survey.description}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {responsesCount}
            </div>
            <div className="text-xs text-muted-foreground">Cavab</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">
              {responseRate}%
            </div>
            <div className="text-xs text-muted-foreground">Cavab dərəcəsi</div>
            <Progress value={responseRate} className="mt-1 h-1" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">
              {questionsCount}
            </div>
            <div className="text-xs text-muted-foreground">Sual</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {targetInstitutionsCount}
            </div>
            <div className="text-xs text-muted-foreground">Hədəf müəssisə</div>
          </div>
        </div>

        {survey.start_date && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Başlama: {new Date(survey.start_date).toLocaleDateString('az-AZ')}</span>
            {survey.end_date && (
              <span>Bitmə: {new Date(survey.end_date).toLocaleDateString('az-AZ')}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (survey.status === 'published') {
              navigate(`/survey-response/${survey.id}`)
            } else {
              // For draft/unpublished surveys, show a preview or edit action
              // TODO: Navigate to survey preview or edit page
              navigate(`/surveys/${survey.id}`)
            }
          }}
          title={
            survey.status === 'published'
              ? 'Survey cavablarını gör'
              : survey.status === 'draft'
                ? 'Survey qaralamadır - yalnız baxış mümkündür'
                : 'Survey aktiv deyil'
          }
        >
          <Eye className="h-3 w-3 mr-1" />
          {survey.status === 'published' ? 'Cavab ver' : 'Baxış'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting || responsesCount === 0}
          title={responsesCount === 0 ? 'Cavab yoxdur' : 'Nəticələri yüklə'}
        >
          <Download className="h-3 w-3 mr-1" />
          {isExporting ? 'Yüklənir...' : 'Yüklə'}
        </Button>
      </div>
    </div>
  );
}

// Survey View Dashboard Component
const SurveyViewDashboard: React.FC = () => {
  const [selectedSurvey, setSelectedSurvey] = useState<PublishedSurvey | null>(null);

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

  // Auto-select first survey if none selected
  React.useEffect(() => {
    if (Array.isArray(publishedSurveys) && publishedSurveys.length > 0 && !selectedSurvey) {
      setSelectedSurvey(publishedSurveys[0]);
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
                  if (survey) setSelectedSurvey(survey);
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

// Survey Responses Data Table Component
interface SurveyResponsesDataTableProps {
  responses: SurveyResponseForApproval[];
  selectedSurvey: PublishedSurvey;
}

const SurveyResponsesDataTable: React.FC<SurveyResponsesDataTableProps> = ({
  responses,
  selectedSurvey
}) => {
  // Get questions from the first response or survey
  const questions = selectedSurvey.questions || [];


  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter responses based on search term
  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    const institutionName = response.institution?.name?.toLowerCase() || '';
    const institutionType = response.institution?.type?.toLowerCase() || '';
    return institutionName.includes(searchTerm.toLowerCase()) ||
           institutionType.includes(searchTerm.toLowerCase());
  });

  // Sort responses
  const sortedResponses = [...filteredResponses].sort((a, b) => {
    const nameA = a.institution?.name || '';
    const nameB = b.institution?.name || '';
    const comparison = nameA.localeCompare(nameB, 'az-AZ');
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Paginated responses
  const totalPages = Math.ceil(sortedResponses.length / pageSize);
  const paginatedResponses = sortedResponses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      {/* Professional Filter/Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search & Filter Section */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Müəssisə adı və ya tipini axtarın..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-10"
              />
            </div>

            {/* Sort Direction Toggle */}
            <Button
              variant="outline"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2"
            >
              {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              A-Z {sortDirection === 'asc' ? '↓' : '↑'}
            </Button>

            {/* Page Size Selector */}
            <Select value={pageSize.toString()} onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 sətir</SelectItem>
                <SelectItem value="25">25 sətir</SelectItem>
                <SelectItem value="50">50 sətir</SelectItem>
                <SelectItem value="100">100 sətir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>
                {filteredResponses.length} / {responses.length} müəssisə
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span>{questions.length} sual</span>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Table with Sticky Columns */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900 min-w-[200px] sticky left-0 bg-gray-50 z-10">
              Müəssisə
            </th>
            {questions.map((question: any, index: number) => (
              <th
                key={question.id || index}
                className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900 min-w-[150px] max-w-[250px]"
              >
                <div className="truncate" title={question.title}>
                  {question.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {question.type}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedResponses.map((response) => (
            <tr key={response.id} className="hover:bg-gray-50">
              {/* Institution Name - Sticky Column */}
              <td className="border border-gray-200 px-4 py-3 sticky left-0 bg-white z-10">
                <div className="font-medium text-gray-900">
                  {response.institution?.name}
                </div>
                <div className="text-sm text-gray-500">
                  {response.institution?.type}
                </div>
              </td>

              {/* Question Responses */}
              {questions.map((question: any, qIndex: number) => {
                // Get answer from responses object using question ID
                const answer = response.responses?.[question.id.toString()];


                return (
                  <td
                    key={question.id || qIndex}
                    className="border border-gray-200 px-4 py-3 max-w-[250px]"
                  >
                    <div className="text-sm text-gray-900 break-words">
                      {answer ? (
                        typeof answer === 'object'
                          ? JSON.stringify(answer, null, 2)
                          : answer || '-'
                      ) : '-'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        </table>
        </div>

        {/* Professional Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {/* Page Info */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  Səhifə {currentPage} / {totalPages}
                </span>
                <span>
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredResponses.length)} / {filteredResponses.length}
                </span>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  İlk
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Sonuncu
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Updated Summary with Filtered Data */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistikalar</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-600">Cari Səhifə</div>
            <div className="text-lg font-bold text-gray-900">{paginatedResponses.length}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Filterlənmiş</div>
            <div className="text-lg font-bold text-blue-600">{filteredResponses.length}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Ümumi Cavab</div>
            <div className="text-lg font-bold text-gray-900">{responses.length}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Sual Sayı</div>
            <div className="text-lg font-bold text-green-600">{questions.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Approvals;