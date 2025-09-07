import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Award, 
  Target, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  Filter,
  Search,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Globe,
  School,
  Users
} from "lucide-react";
import { assessmentService, AssessmentFilters } from '@/services/assessments';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AssessmentCreateModal } from '@/components/modals/AssessmentCreateModal';
import AssessmentTypeModal from '@/components/modals/AssessmentTypeModal';
import { assessmentTypeService, AssessmentType } from '@/services/assessmentTypes';
import { QuickAuth } from '@/components/auth/QuickAuth';

export default function SchoolAssessments() {
  const [filters, setFilters] = useState<AssessmentFilters>({
    assessment_type: 'all',
    per_page: 15
  });
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssessmentTypeModalOpen, setIsAssessmentTypeModalOpen] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | undefined>();

  const { toast } = useToast();
  const { currentUser, hasRole } = useAuth();

  // Fetch assessment types data
  const { data: assessmentTypes, refetch: refetchAssessmentTypes } = useQuery({
    queryKey: ['assessment-types'],
    queryFn: () => assessmentTypeService.getAssessmentTypes({ per_page: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch assessment overview data
  const { data: assessmentData, isLoading, error, refetch } = useQuery({
    queryKey: ['assessments', filters],
    queryFn: () => assessmentService.getAssessmentOverview(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['assessment-analytics', filters.institution_id, filters.academic_year_id],
    queryFn: () => {
      if (!filters.institution_id) return null;
      return assessmentService.getAnalytics(
        filters.institution_id,
        filters.academic_year_id,
        {
          include_trends: true,
          include_rankings: true,
          include_recommendations: true
        }
      );
    },
    enabled: !!filters.institution_id,
    staleTime: 1000 * 60 * 5,
  });

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!assessmentData?.data) return null;

    const { ksq_results, bsq_results, analytics } = assessmentData.data;
    
    // Combine KSQ and BSQ results for overall stats
    const allAssessments = [
      ...(ksq_results?.data || []),
      ...(bsq_results?.data || [])
    ];

    const totalAssessments = allAssessments.length;
    const averageScore = totalAssessments > 0 
      ? allAssessments.reduce((sum, assessment) => sum + assessment.percentage_score, 0) / totalAssessments 
      : 0;

    const approvedAssessments = allAssessments.filter(a => a.status === 'approved').length;
    const approvalRate = totalAssessments > 0 ? (approvedAssessments / totalAssessments) * 100 : 0;

    // Calculate trend from analytics or recent assessments
    const trendPercentage = analytics?.overall_analytics?.improvement_percentage || 0;

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      totalAssessments,
      approvalRate: Math.round(approvalRate),
      trendPercentage: Math.round(trendPercentage * 10) / 10
    };
  }, [assessmentData]);

  const handleCreateAssessment = () => {
    setIsCreateModalOpen(true);
  };

  const handleExportData = async () => {
    if (!filters.institution_id) {
      toast({
        title: 'Xəta',
        description: 'İxrac üçün müəssisə seçin.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await assessmentService.exportData(
        filters.institution_id,
        'both',
        'excel',
        filters.academic_year_id
      );
      
      toast({
        title: 'İxrac başladı',
        description: 'Məlumatlar hazırlandıqda bildiriş alacaqsınız.',
      });
    } catch (error) {
      toast({
        title: 'İxrac xətası',
        description: 'Məlumatlar ixrac edilərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const handleApproveAssessment = async (type: 'ksq' | 'bsq', id: number) => {
    try {
      await assessmentService.approve(type, id);
      toast({
        title: 'Təsdiqləndi',
        description: 'Qiymətləndirmə nəticəsi uğurla təsdiqləndi.',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Təsdiqləmə xətası',
        description: 'Qiymətləndirmə təsdiqləriëkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  // Assessment Type handlers
  const handleCreateAssessmentType = () => {
    setSelectedAssessmentType(undefined);
    setIsAssessmentTypeModalOpen(true);
  };

  const handleEditAssessmentType = (assessmentType: AssessmentType) => {
    setSelectedAssessmentType(assessmentType);
    setIsAssessmentTypeModalOpen(true);
  };

  const handleAssessmentTypeSuccess = () => {
    refetchAssessmentTypes();
    toast({
      title: 'Uğurlu əməliyyat',
      description: 'Assessment type uğurla saxlanıldı.',
    });
  };

  const handleDeleteAssessmentType = async (id: number) => {
    try {
      await assessmentTypeService.deleteAssessmentType(id);
      refetchAssessmentTypes();
      toast({
        title: 'Silindi',
        description: 'Assessment type uğurla silindi.',
      });
    } catch (error: any) {
      toast({
        title: 'Silmə xətası',
        description: error.message || 'Assessment type silinərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAssessmentTypeStatus = async (id: number) => {
    try {
      await assessmentTypeService.toggleAssessmentTypeStatus(id);
      refetchAssessmentTypes();
      toast({
        title: 'Status dəyişildi',
        description: 'Assessment type statusu uğurla dəyişildi.',
      });
    } catch (error: any) {
      toast({
        title: 'Status dəyişikliyi xətası',
        description: error.message || 'Status dəyişərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Təsdiqlənib</Badge>;
      case 'draft':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Layihə</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><AlertTriangle className="h-3 w-3 mr-1" />Rədd edilib</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Qiymətləndirmə məlumatları yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Assessment fetch error:', error);
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Xəta baş verdi</h3>
              <p className="text-muted-foreground">Qiymətləndirmə məlumatları yüklənərkən problem yarandı.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Error: {error instanceof Error ? error.message : 'Bilinməyən xəta'}
              </p>
            </div>
            <Button onClick={() => refetch()}>Yenidən cəhd et</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <QuickAuth />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Qiymətləndirmələr</h1>
          <p className="text-muted-foreground">Təhsil müəssisəsinin performans qiymətləndirilməsi və analitikası</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
          <Button variant="outline" onClick={handleCreateAssessmentType}>
            <Plus className="h-4 w-4 mr-2" />
            Qiymətləndirmə Növü
          </Button>
          <Button onClick={handleCreateAssessment}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Qiymətləndirmə
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtrlər</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assessment-type">Qiymətləndirmə Növü</Label>
              <Select 
                value={filters.assessment_type} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, assessment_type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Növ seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="ksq">KSQ (Keyfiyyət Standartları)</SelectItem>
                  <SelectItem value="bsq">BSQ (Beynəlxalq Standartlar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="draft">Layihə</SelectItem>
                  <SelectItem value="approved">Təsdiqlənib</SelectItem>
                  <SelectItem value="rejected">Rədd edilib</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">Başlanğıc tarixi</Label>
              <Input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">Son tarix</Label>
              <Input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Qiymətləndirmə axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Orta qiymət</p>
                  <p className={`text-2xl font-bold ${getScoreColor(summaryStats.averageScore)}`}>
                    {summaryStats.averageScore || 'N/A'}
                  </p>
                </div>
                <Award className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Təsdiq nisbəti</p>
                  <p className="text-2xl font-bold text-green-600">{summaryStats.approvalRate}%</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ümumi qiymətləndirmə</p>
                  <p className="text-2xl font-bold">{summaryStats.totalAssessments}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trend</p>
                  <p className={`text-2xl font-bold ${summaryStats.trendPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {summaryStats.trendPercentage >= 0 ? '+' : ''}{summaryStats.trendPercentage}%
                  </p>
                </div>
                {summaryStats.trendPercentage >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Ümumi Baxış</span>
          </TabsTrigger>
          <TabsTrigger value="assessment-types" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Qiymətləndirmə Növləri</span>
          </TabsTrigger>
          <TabsTrigger value="ksq" className="flex items-center space-x-2">
            <School className="h-4 w-4" />
            <span>KSQ Qiymətləndirmələr</span>
          </TabsTrigger>
          <TabsTrigger value="bsq" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>BSQ Qiymətləndirmələr</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessment-types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Qiymətləndirmə Növləri</CardTitle>
                  <CardDescription>KSQ, BSQ və xüsusi qiymətləndirmə növlərini idarə edin</CardDescription>
                </div>
                <Button onClick={handleCreateAssessmentType}>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Növ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assessmentTypes?.data ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead>Kateqoriya</TableHead>
                      <TableHead>Maksimum Bal</TableHead>
                      <TableHead>Qiymətləndirmə Metodu</TableHead>
                      <TableHead>Təşkilat</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Yaradılma Tarixi</TableHead>
                      <TableHead>Əməliyyatlar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentTypes.data.filter(assessmentType => assessmentType.id && assessmentType.name && assessmentType.id.toString().trim() !== '').map((assessmentType) => (
                      <TableRow key={assessmentType.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{assessmentType.name}</p>
                            {assessmentType.description && (
                              <p className="text-sm text-muted-foreground">{assessmentType.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            assessmentType.category === 'ksq' ? 'default' :
                            assessmentType.category === 'bsq' ? 'secondary' : 'outline'
                          }>
                            {assessmentType.category_label}
                          </Badge>
                        </TableCell>
                        <TableCell>{assessmentType.max_score}</TableCell>
                        <TableCell>{assessmentType.scoring_method_label}</TableCell>
                        <TableCell>
                          {assessmentType.institution ? (
                            <div className="flex items-center space-x-1">
                              <School className="h-3 w-3" />
                              <span className="text-sm">{assessmentType.institution.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <Globe className="h-3 w-3" />
                              <span className="text-sm">Sistem geneli</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={assessmentType.is_active ? 'default' : 'secondary'}>
                            {assessmentType.is_active ? 'Aktiv' : 'Deaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(assessmentType.created_at).toLocaleDateString('az-AZ')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAssessmentType(assessmentType)}
                            >
                              Redaktə
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleAssessmentTypeStatus(assessmentType.id)}
                            >
                              {assessmentType.is_active ? 'Deaktiv et' : 'Aktiv et'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAssessmentType(assessmentType.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Sil
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Qiymətləndirmə növləri yüklənir...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* KSQ Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <School className="h-5 w-5" />
                  <span>KSQ Nəticələri</span>
                </CardTitle>
                <CardDescription>Keyfiyyət Standartları Qiymətləndirməsi</CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentData?.data?.ksq_results?.data?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {assessmentData.data.ksq_results.data.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Ümumi qiymətləndirmə</p>
                    </div>
                    <div className="space-y-2">
                      {assessmentData.data.ksq_results.data.slice(0, 3).map((assessment: any, index: number) => (
                        <div key={assessment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{assessment.assessment_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-bold ${getScoreColor(assessment.percentage_score)}`}>
                              {assessment.percentage_score}%
                            </span>
                            {getStatusBadge(assessment.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Hələ KSQ qiymətləndirməsi yoxdur</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BSQ Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>BSQ Nəticələri</span>
                </CardTitle>
                <CardDescription>Beynəlxalq Standartlar Qiymətləndirməsi</CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentData?.data?.bsq_results?.data?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {assessmentData.data.bsq_results.data.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Ümumi qiymətləndirmə</p>
                    </div>
                    <div className="space-y-2">
                      {assessmentData.data.bsq_results.data.slice(0, 3).map((assessment: any, index: number) => (
                        <div key={assessment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{assessment.international_standard}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-bold ${getScoreColor(assessment.percentage_score)}`}>
                              {assessment.percentage_score}%
                            </span>
                            {getStatusBadge(assessment.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Hələ BSQ qiymətləndirməsi yoxdur</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics */}
          {analyticsData?.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Analitika və Tövsiyələr</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Analitika məlumatları yüklənir...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analyticsData.data.overall_analytics?.recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Tövsiyələr
                        </h4>
                        <ul className="space-y-2">
                          {analyticsData.data.overall_analytics.recommendations.map((recommendation: string, index: number) => (
                            <li key={index} className="text-sm p-2 bg-blue-50 dark:bg-blue-950/20 rounded border-l-4 border-blue-500">
                              {recommendation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analyticsData.data.overall_analytics?.risk_areas?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Risk Sahələri
                        </h4>
                        <ul className="space-y-2">
                          {analyticsData.data.overall_analytics.risk_areas.map((risk: string, index: number) => (
                            <li key={index} className="text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded border-l-4 border-red-500">
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ksq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KSQ Qiymətləndirmə Nəticələri</CardTitle>
              <CardDescription>Keyfiyyət Standartları Qiymətləndirməsi məlumatları</CardDescription>
            </CardHeader>
            <CardContent>
              {assessmentData?.data?.ksq_results?.data?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarix</TableHead>
                      <TableHead>Növ</TableHead>
                      <TableHead>Nəticə</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Əməliyyatlar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentData.data.ksq_results.data.map((assessment: any) => (
                      <TableRow key={assessment.id}>
                        <TableCell>
                          {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                        </TableCell>
                        <TableCell>{assessment.assessment_type}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getScoreColor(assessment.percentage_score)}`}>
                            {assessment.percentage_score}%
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                        <TableCell>
                          {assessment.status === 'draft' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveAssessment('ksq', assessment.id)}
                            >
                              Təsdiqlə
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Hələ KSQ qiymətləndirməsi əlavə edilməyib</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bsq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BSQ Qiymətləndirmə Nəticələri</CardTitle>
              <CardDescription>Beynəlxalq Standartlar Qiymətləndirməsi məlumatları</CardDescription>
            </CardHeader>
            <CardContent>
              {assessmentData?.data?.bsq_results?.data?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarix</TableHead>
                      <TableHead>Standart</TableHead>
                      <TableHead>Orqan</TableHead>
                      <TableHead>Nəticə</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Əməliyyatlar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentData.data.bsq_results.data.map((assessment: any) => (
                      <TableRow key={assessment.id}>
                        <TableCell>
                          {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                        </TableCell>
                        <TableCell>{assessment.international_standard}</TableCell>
                        <TableCell>{assessment.assessment_body}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getScoreColor(assessment.percentage_score)}`}>
                            {assessment.percentage_score}%
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                        <TableCell>
                          {assessment.status === 'draft' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveAssessment('bsq', assessment.id)}
                            >
                              Təsdiqlə
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Hələ BSQ qiymətləndirməsi əlavə edilməyib</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assessment Create Modal */}
      <AssessmentCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAssessmentCreated={() => {
          refetch();
          setIsCreateModalOpen(false);
        }}
      />

      {/* Assessment Type Modal */}
      <AssessmentTypeModal
        isOpen={isAssessmentTypeModalOpen}
        onClose={() => setIsAssessmentTypeModalOpen(false)}
        assessmentType={selectedAssessmentType}
        onSuccess={handleAssessmentTypeSuccess}
      />
    </div>
  );
}