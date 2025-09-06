import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  BarChart3, 
  Plus, 
  BookOpen,
  Users,
  Target,
  TrendingUp,
  FileText,
  Award,
  Calendar,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Import existing components we'll integrate
import { AssessmentGradebook } from '@/components/assessments/AssessmentGradebook';
import { AssessmentCreateModal } from '@/components/assessments/AssessmentCreateModal';

// Import services
import { unifiedAssessmentService } from '@/services/unifiedAssessments';

interface AssessmentOverview {
  totalAssessments: number;
  activeAssessments: number;
  completedAssessments: number;
  averageScore: number;
  recentAssessments: any[];
  upcomingAssessments: any[];
}

const SchoolAssessments: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Yüklənir...</p>
        </div>
      </div>
    );
  }

  // Check if user has access to this page
  if (!currentUser?.institution?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Müəssisə məlumatı tapılmadı</h2>
          <p className="text-muted-foreground">
            Qiymətləndirmə sistemindən istifadə etmək üçün müəssisəyə təyin olunmalısınız.
          </p>
        </div>
      </div>
    );
  }

  // Fetch unified assessment dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['unified-assessment-dashboard', currentUser?.institution?.id],
    queryFn: async () => {
      if (!currentUser?.institution?.id) {
        throw new Error('Institution ID not available');
      }

      try {
        console.log('🏫 Loading unified assessment dashboard for institution:', currentUser.institution.id);
        
        const response = await unifiedAssessmentService.getDashboardData({
          institution_id: currentUser.institution.id
        });

        console.log('📋 Service response structure:', response);
        console.log('📋 Response keys:', Object.keys(response));
        console.log('📋 Has success field:', 'success' in response);
        console.log('📋 Has data field:', 'data' in response);

        // Check if response has the API wrapper structure {success: true, data: {...}}
        if (response.success && response.data) {
          console.log('✅ API wrapper detected, returning data:', response.data);
          return response.data;
        } 
        // Or if it's already the extracted data object with statistics, recent_assessments, etc.
        else if (response.statistics !== undefined || response.recent_assessments !== undefined) {
          console.log('✅ Direct data detected, returning as-is:', response);
          return response;
        } 
        else {
          console.warn('⚠️ Invalid response structure:', response);
          throw new Error('Yanlış cavab strukturu');
        }
      } catch (error: any) {
        console.error('❌ Error loading unified assessment dashboard:', error);
        throw error;
      }
    },
    enabled: !loading && !!currentUser?.institution?.id,
    staleTime: 1000 * 60 * 5,
    retry: 2
  });

  // Fetch assessment overview data for assessments tab
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['unified-assessment-overview', currentUser?.institution?.id, activeTab],
    queryFn: async () => {
      if (activeTab !== 'assessments' || !currentUser?.institution?.id) return null;
      
      try {
        const response = await unifiedAssessmentService.getAssessmentOverview({
          institution_id: currentUser.institution.id,
          per_page: 15
        });

        // Handle both API wrapper and direct data response
        if (response.success && response.data) {
          return response.data;
        } else if (response.ksq_results !== undefined || response.bsq_results !== undefined) {
          return response;
        } else {
          throw new Error('Yanlış cavab strukturu');
        }
      } catch (error: any) {
        console.error('❌ Error loading assessment overview:', error);
        throw error;
      }
    },
    enabled: !loading && !!currentUser?.institution?.id && activeTab === 'assessments',
    staleTime: 1000 * 60 * 5,
    retry: 2
  });

  // Fetch gradebook data for gradebook tab
  const { data: gradebookData, isLoading: gradebookLoading } = useQuery({
    queryKey: ['unified-gradebook', currentUser?.institution?.id, activeTab],
    queryFn: async () => {
      if (activeTab !== 'gradebook' || !currentUser?.institution?.id) return null;
      
      try {
        const response = await unifiedAssessmentService.getGradebookData({
          institution_id: currentUser.institution.id
        });

        // Handle both API wrapper and direct data response
        if (response.success && response.data) {
          return response.data;
        } else if (response.entries !== undefined || response.assessment_types !== undefined) {
          return response;
        } else {
          throw new Error('Yanlış cavab strukturu');
        }
      } catch (error: any) {
        console.error('❌ Error loading gradebook data:', error);
        throw error;
      }
    },
    enabled: !loading && !!currentUser?.institution?.id && activeTab === 'gradebook',
    staleTime: 1000 * 60 * 5,
    retry: 2
  });

  // Fetch analytics data for reports and analytics tabs
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['unified-analytics', currentUser?.institution?.id, activeTab],
    queryFn: async () => {
      if (!['reports', 'analytics'].includes(activeTab) || !currentUser?.institution?.id) return null;
      
      try {
        const response = await unifiedAssessmentService.getAnalyticsData({
          institution_id: currentUser.institution.id,
          include_trends: true,
          include_comparisons: true
        });

        // Handle both API wrapper and direct data response
        if (response.success && response.data) {
          return response.data;
        } else if (response.analytics !== undefined || response.charts_data !== undefined) {
          return response;
        } else {
          throw new Error('Yanlış cavab strukturu');
        }
      } catch (error: any) {
        console.error('❌ Error loading analytics data:', error);
        throw error;
      }
    },
    enabled: !loading && !!currentUser?.institution?.id && ['reports', 'analytics'].includes(activeTab),
    staleTime: 1000 * 60 * 10,
    retry: 2
  });

  // Loading state for dashboard
  if (dashboardLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Qiymətləndirmə məlumatları yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state for dashboard
  if (dashboardError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <FileText className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Məlumatlar yüklənə bilmədi</h2>
            <p className="text-muted-foreground mb-4">
              Dashboard məlumatları yüklənərkən xəta baş verdi.
            </p>
            <Button onClick={() => window.location.reload()}>
              Yenidən cəhd et
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Extract assessment types from dashboard data
  const assessmentTypes = dashboardData?.assessment_types || [];
  
  // Extract raw data for assessments tab (contains ksq_results and bsq_results)
  const rawData = overviewData || null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Məktəb Qiymətləndirmə Sistemi
          </h1>
          <p className="text-muted-foreground">
            {currentUser.institution.name} - Qiymətləndirmə və Performans İdarəetməsi
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Qiymətləndirmə
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Qiymətləndirmələr
          </TabsTrigger>
          <TabsTrigger value="gradebook" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Qiymət Dəftəri
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Hesabatlar
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analitik
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ümumi Qiymətləndirmə</p>
                    <p className="text-2xl font-bold">{dashboardData?.statistics?.total_assessments || 0}</p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Aktiv</p>
                    <p className="text-2xl font-bold text-blue-600">{dashboardData?.statistics?.active_assessments || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tamamlanmış</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardData?.statistics?.completed_assessments || 0}</p>
                  </div>
                  <Award className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ortalama Bal</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {dashboardData?.performance_trends?.monthly_performance?.length > 0 
                        ? Math.round(dashboardData.performance_trends.monthly_performance[0].average || 0)
                        : 0}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Assessments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Son Qiymətləndirmələr
                </CardTitle>
                <CardDescription>
                  Son aparılan qiymətləndirmələrin nəticələri
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.recent_assessments && dashboardData.recent_assessments.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recent_assessments.map((assessment: any, index: number) => (
                      <div key={assessment.id || index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">
                            {assessment.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(assessment.date).toLocaleDateString('az-AZ')} • {assessment.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            assessment.score >= 90 ? 'default' :
                            assessment.score >= 70 ? 'secondary' : 'destructive'
                          }>
                            {assessment.score}%
                          </Badge>
                          <Badge variant="outline">
                            {unifiedAssessmentService.getStatusLabel(assessment.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Hələ qiymətləndirmə nəticəsi yoxdur</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Qiymətləndirmə Növləri
                </CardTitle>
                <CardDescription>
                  İstifadəyə hazır qiymətləndirmə növləri
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentTypes && assessmentTypes.length > 0 ? (
                  <div className="space-y-2">
                    {assessmentTypes.slice(0, 6).map((type: any) => (
                      <div key={type.id} className="flex items-center justify-between p-2 rounded">
                        <span className="text-sm">{type.name}</span>
                        <Badge variant="outline">
                          {type.category === 'ksq' ? 'KSQ' :
                           type.category === 'bsq' ? 'BSQ' : 'Xüsusi'}
                        </Badge>
                      </div>
                    ))}
                    {assessmentTypes.length > 6 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{assessmentTypes.length - 6} daha...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Qiymətləndirmə növü tapılmadı</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Qiymətləndirmələr</CardTitle>
              <CardDescription>
                Müəssisənizin bütün qiymətləndirmələrini buradan idarə edin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rawData ? (
                <div className="space-y-4">
                  {/* KSQ Results */}
                  {rawData.ksq_results?.data && rawData.ksq_results.data.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">KSQ Qiymətləndirmələri</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rawData.ksq_results.data.slice(0, 6).map((assessment: any) => (
                          <Card key={assessment.id}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-medium">{assessment.assessment_type}</h4>
                                  <Badge variant="outline">KSQ</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                                </p>
                                <div className="flex justify-between items-center">
                                  <span className="text-2xl font-bold">
                                    {assessment.percentage_score}%
                                  </span>
                                  <Badge variant={assessment.status === 'approved' ? 'default' : 'secondary'}>
                                    {assessment.status === 'approved' ? 'Təsdiqlənib' : 'Layihə'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BSQ Results */}
                  {rawData.bsq_results?.data && rawData.bsq_results.data.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">BSQ Qiymətləndirmələri</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rawData.bsq_results.data.slice(0, 6).map((assessment: any) => (
                          <Card key={assessment.id}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-medium">{assessment.international_standard}</h4>
                                  <Badge variant="outline">BSQ</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {assessment.assessment_body}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                                </p>
                                <div className="flex justify-between items-center">
                                  <span className="text-2xl font-bold">
                                    {assessment.percentage_score}%
                                  </span>
                                  <Badge variant={assessment.status === 'approved' ? 'default' : 'secondary'}>
                                    {assessment.status === 'approved' ? 'Təsdiqlənib' : 'Layihə'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!rawData.ksq_results?.data?.length && !rawData.bsq_results?.data?.length) && (
                    <div className="text-center py-12">
                      <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Qiymətləndirmə yoxdur</h3>
                      <p className="text-muted-foreground mb-4">
                        Hələ ki qiymətləndirmə nəticəsi əlavə edilməyib
                      </p>
                      <Button onClick={() => setCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        İlk qiymətləndirməni əlavə et
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gradebook Tab */}
        <TabsContent value="gradebook" className="space-y-6">
          <AssessmentGradebook />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hesabat və Analiz</CardTitle>
              <CardDescription>
                Qiymətləndirmə nəticələrinin detallı analizi və hesabatları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Hesabat modulu hazırlanır</h3>
                <p className="text-muted-foreground">
                  Bu bölmə tezliklə əlavə ediləcək
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performans Analitikası</CardTitle>
              <CardDescription>
                Qiymətləndirmə performansının statistik təhlili
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Analitik modulu hazırlanır</h3>
                <p className="text-muted-foreground">
                  Bu bölmə tezliklə əlavə ediləcək
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Assessment Modal */}
      <AssessmentCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          toast({
            title: 'Uğurlu əməliyyat',
            description: 'Qiymətləndirmə uğurla yaradıldı',
          });
          // Refresh data
          window.location.reload();
        }}
      />
    </div>
  );
};

export default SchoolAssessments;