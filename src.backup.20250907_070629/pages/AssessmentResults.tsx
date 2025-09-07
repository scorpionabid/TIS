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
  BarChart3, 
  Target, 
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
  School,
  Globe,
  Users,
  Award
} from "lucide-react";
import { assessmentService, AssessmentFilters } from '@/services/assessments';
import { assessmentTypeService } from '@/services/assessmentTypes';
import { institutionService } from '@/services/institutions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { QuickAuth } from '@/components/auth/QuickAuth';

export default function AssessmentResults() {
  const [filters, setFilters] = useState<AssessmentFilters>({
    assessment_type: 'all',
    per_page: 15
  });
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();
  const { currentUser, hasRole } = useAuth();

  // Helper function to safely get SelectItem value
  const getSafeSelectValue = (id: any): string => {
    if (!id) return '';
    const stringValue = String(id).trim();
    return stringValue === '' || stringValue === 'undefined' || stringValue === 'null' ? '' : stringValue;
  };

  // Helper function to validate items for SelectItem
  const isValidSelectItem = (item: any): boolean => {
    return item && item.id && item.name && getSafeSelectValue(item.id) !== '';
  };

  // Fetch assessment data
  const { data: assessmentData, isLoading, error, refetch } = useQuery({
    queryKey: ['assessment-results', filters],
    queryFn: () => assessmentService.getAssessmentOverview(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch assessment types for filter dropdown
  const { data: assessmentTypes } = useQuery({
    queryKey: ['assessment-types-dropdown'],
    queryFn: () => assessmentTypeService.getAssessmentTypesDropdown(),
    staleTime: 1000 * 60 * 10,
  });

  // Fetch institutions for filter dropdown
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions-dropdown'],
    queryFn: () => institutionService.getInstitutions({ per_page: 100 }),
    staleTime: 1000 * 60 * 10,
  });

  // Extract institutions array from response
  const institutions = institutionsResponse?.data || [];

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
    const approvedAssessments = allAssessments.filter(a => a.status === 'approved').length;
    const averageScore = totalAssessments > 0 
      ? allAssessments.reduce((sum, a) => sum + (a.percentage_score || 0), 0) / totalAssessments
      : 0;

    const approvalRate = totalAssessments > 0 ? (approvedAssessments / totalAssessments) * 100 : 0;

    return {
      totalAssessments,
      approvedAssessments,
      averageScore: Math.round(averageScore),
      approvalRate: Math.round(approvalRate),
      trendPercentage: analytics?.trend_percentage || 0
    };
  }, [assessmentData]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AssessmentFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
  };

  const handleExportData = async () => {
    try {
      await assessmentService.exportAssessments(filters);
      toast({
        title: 'İxrac edildi',
        description: 'Qiymətləndirmə məlumatları uğurla ixrac edildi.',
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
        description: 'Qiymətləndirmə təsdiqləmərkən problem yarandı.',
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
            <p className="text-lg text-muted-foreground">Qiymətləndirmə nəticələri yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Assessment results fetch error:', error);
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Xəta baş verdi</h3>
              <p className="text-muted-foreground">Qiymətləndirmə nəticələri yüklənərkən problem yarandı.</p>
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
          <h1 className="text-3xl font-bold text-foreground">Qiymətləndirmə Nəticələri</h1>
          <p className="text-muted-foreground">KSQ və BSQ qiymətləndirmə nəticələrini görüntüləyin və analiz edin</p>
        </div>
        <Button variant="outline" onClick={handleExportData}>
          <Download className="h-4 w-4 mr-2" />
          İxrac et
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filterləmə</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Axtarış</Label>
              <div className="flex space-x-2">
                <Input
                  id="search"
                  placeholder="Axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button size="icon" variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="assessment_type">Qiymətləndirmə Növü</Label>
              <Select 
                value={filters.assessment_type || 'all'} 
                onValueChange={(value) => handleFilterChange('assessment_type', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hamısı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  {assessmentTypes?.filter(isValidSelectItem).map((type) => {
                    const safeValue = getSafeSelectValue(type.id);
                    return safeValue ? (
                      <SelectItem key={type.id} value={safeValue}>
                        {type.name}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="institution">
                Təşkilat
                {hasRole('superadmin') && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (SuperAdmin - Bütün təşkilatlar)
                  </span>
                )}
              </Label>
              <Select 
                value={filters.institution_id?.toString() || 'all'} 
                onValueChange={(value) => handleFilterChange('institution_id', value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={hasRole('superadmin') ? "Hamısı (Ümumi baxış)" : "Hamısı"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {hasRole('superadmin') ? "Hamısı (Sistem geneli)" : "Hamısı"}
                  </SelectItem>
                  {Array.isArray(institutions) && institutions
                    .filter(isValidSelectItem)
                    .map((institution) => {
                      const safeValue = getSafeSelectValue(institution.id);
                      return safeValue ? (
                        <SelectItem key={institution.id} value={safeValue}>
                          {institution.name} 
                          {hasRole('superadmin') && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (Səviyyə {institution.level})
                            </span>
                          )}
                        </SelectItem>
                      ) : null;
                    })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hamısı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="approved">Təsdiqlənib</SelectItem>
                  <SelectItem value="draft">Layihə</SelectItem>
                  <SelectItem value="rejected">Rədd edilib</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date_from">Tarix</Label>
              <Input
                id="date_from"
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
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
                  <p className="text-sm text-muted-foreground">Orta bal</p>
                  <p className="text-2xl font-bold text-blue-600">{summaryStats.averageScore}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
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
                  <p className="text-sm text-muted-foreground">Ümumi nəticələr</p>
                  <p className="text-2xl font-bold">{summaryStats.totalAssessments}</p>
                </div>
                <Award className="h-8 w-8 text-primary" />
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Ümumi Baxış</span>
          </TabsTrigger>
          <TabsTrigger value="ksq" className="flex items-center space-x-2">
            <School className="h-4 w-4" />
            <span>KSQ Nəticələri</span>
          </TabsTrigger>
          <TabsTrigger value="bsq" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>BSQ Nəticələri</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* KSQ Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <School className="h-5 w-5" />
                  <span>KSQ Nəticələri Özəti</span>
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
                      <p className="text-sm text-muted-foreground">Ümumi nəticə</p>
                    </div>
                    <div className="space-y-2">
                      {assessmentData.data.ksq_results.data.slice(0, 3).map((assessment: any) => (
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
                    <p className="text-muted-foreground">Hələ KSQ nəticəsi yoxdur</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BSQ Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>BSQ Nəticələri Özəti</span>
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
                      <p className="text-sm text-muted-foreground">Ümumi nəticə</p>
                    </div>
                    <div className="space-y-2">
                      {assessmentData.data.bsq_results.data.slice(0, 3).map((assessment: any) => (
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
                    <p className="text-muted-foreground">Hələ BSQ nəticəsi yoxdur</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ksq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KSQ Qiymətləndirmə Nəticələri</CardTitle>
            </CardHeader>
            <CardContent>
              {assessmentData?.data?.ksq_results?.data?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarix</TableHead>
                      <TableHead>Növ</TableHead>
                      <TableHead>Təşkilat</TableHead>
                      <TableHead>Bal</TableHead>
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
                        <TableCell>{assessment.institution?.name || 'N/A'}</TableCell>
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
                  <p className="text-muted-foreground">Hələ KSQ nəticəsi əlavə edilməyib</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bsq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BSQ Qiymətləndirmə Nəticələri</CardTitle>
            </CardHeader>
            <CardContent>
              {assessmentData?.data?.bsq_results?.data?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarix</TableHead>
                      <TableHead>Beynəlxalq Standart</TableHead>
                      <TableHead>Qiymətləndirən Qurum</TableHead>
                      <TableHead>Bal</TableHead>
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
                  <p className="text-muted-foreground">Hələ BSQ nəticəsi əlavə edilməyib</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}