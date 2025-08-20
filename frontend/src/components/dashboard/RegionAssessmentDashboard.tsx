import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  MapPin,
  School,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Download,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  Eye,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react';
import { assessmentService } from '@/services/assessments';
import { institutionService } from '@/services/institutions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface RegionPerformanceData {
  total_institutions: number;
  total_assessments: number;
  average_score: number;
  trend_percentage: number;
  performance_distribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  top_performers: Array<{
    institution_id: number;
    institution_name: string;
    average_score: number;
    assessment_count: number;
  }>;
  low_performers: Array<{
    institution_id: number;
    institution_name: string;
    average_score: number;
    assessment_count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    average_score: number;
    assessment_count: number;
  }>;
  subject_performance: Array<{
    subject: string;
    average_score: number;
    institution_count: number;
  }>;
}

interface InstitutionPerformance {
  id: number;
  name: string;
  type: string;
  district: string;
  total_assessments: number;
  average_score: number;
  last_assessment_date: string;
  performance_grade: 'excellent' | 'good' | 'average' | 'poor';
  trend_direction: 'up' | 'down' | 'stable';
  student_count: number;
}

export const RegionAssessmentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedInstitutionType, setSelectedInstitutionType] = useState<string>('all');
  const [selectedPerformanceLevel, setSelectedPerformanceLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Fetch region performance data
  const { data: performanceData, isLoading: performanceLoading, refetch } = useQuery({
    queryKey: ['region-assessment-performance', currentUser?.institution?.region_id],
    queryFn: async () => {
      if (!currentUser?.institution?.region_id) throw new Error('Region not found');
      return assessmentService.getRegionPerformanceData(currentUser.institution.region_id);
    },
    enabled: !!currentUser?.institution?.region_id,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch institutions in region
  const { data: institutionsData, isLoading: institutionsLoading } = useQuery({
    queryKey: ['region-institutions', currentUser?.institution?.region_id, selectedDistrict, selectedInstitutionType],
    queryFn: async () => {
      if (!currentUser?.institution?.region_id) throw new Error('Region not found');
      return assessmentService.getRegionInstitutions(currentUser.institution.region_id, {
        district: selectedDistrict !== 'all' ? selectedDistrict : undefined,
        institution_type: selectedInstitutionType !== 'all' ? selectedInstitutionType : undefined,
        search: searchTerm || undefined
      });
    },
    enabled: !!currentUser?.institution?.region_id,
    staleTime: 1000 * 60 * 5,
  });

  // Filtered institutions based on performance level and search
  const filteredInstitutions = useMemo(() => {
    if (!institutionsData?.institutions) return [];

    return institutionsData.institutions.filter((institution: InstitutionPerformance) => {
      // Performance level filter
      if (selectedPerformanceLevel !== 'all' && institution.performance_grade !== selectedPerformanceLevel) {
        return false;
      }

      // Search filter
      if (searchTerm && !institution.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [institutionsData, selectedPerformanceLevel, searchTerm]);

  const getPerformanceColor = (grade: string) => {
    switch (grade) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'average': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPerformanceLabel = (grade: string) => {
    switch (grade) {
      case 'excellent': return 'Əla';
      case 'good': return 'Yaxşı';
      case 'average': return 'Orta';
      case 'poor': return 'Zəif';
      default: return 'Bilinməyən';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const handleExportData = async () => {
    try {
      await assessmentService.exportRegionReport(currentUser?.institution?.region_id!, {
        district: selectedDistrict !== 'all' ? selectedDistrict : undefined,
        institution_type: selectedInstitutionType !== 'all' ? selectedInstitutionType : undefined,
        performance_level: selectedPerformanceLevel !== 'all' ? selectedPerformanceLevel : undefined,
        date_range: dateRange.start && dateRange.end ? dateRange : undefined
      });
      toast({
        title: 'Hesabat İxrac Edildi',
        description: 'Region hesabatı uğurla ixrac edildi',
      });
    } catch (error) {
      toast({
        title: 'İxrac Xətası',
        description: 'Hesabat ixrac edilərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  if (performanceLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Region məlumatları yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Region Qiymətləndirmə Analizi</h1>
          <p className="text-muted-foreground">
            {currentUser?.institution?.region?.name || 'Region'} üzrə təhsil müəssisələrinin qiymətləndirmə nəticələri
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenilə
          </Button>
          <Button onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Hesabat İxrac Et
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {performanceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Təhsil Müəssisələri</p>
                  <p className="text-2xl font-bold">{performanceData.total_institutions}</p>
                </div>
                <School className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ümumi Qiymətləndirmələr</p>
                  <p className="text-2xl font-bold">{performanceData.total_assessments}</p>
                </div>
                <Award className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ortalama Performans</p>
                  <p className="text-2xl font-bold text-green-600">{performanceData.average_score}%</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Performans Trendi</p>
                  <p className={`text-2xl font-bold ${performanceData.trend_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performanceData.trend_percentage >= 0 ? '+' : ''}{performanceData.trend_percentage}%
                  </p>
                </div>
                {performanceData.trend_percentage >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            <div>
              <Label htmlFor="search">Müəssisə Axtarışı</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Müəssisə adı..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="district">Rayon</Label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger>
                  <SelectValue placeholder="Rayon seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün Rayonlar</SelectItem>
                  {/* District options will be populated from API */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="institution-type">Müəssisə Tipi</Label>
              <Select value={selectedInstitutionType} onValueChange={setSelectedInstitutionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tip seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün Tiplər</SelectItem>
                  <SelectItem value="school">Məktəb</SelectItem>
                  <SelectItem value="kindergarten">Uşaq Bağçası</SelectItem>
                  <SelectItem value="lyceum">Lise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="performance">Performans Səviyyəsi</Label>
              <Select value={selectedPerformanceLevel} onValueChange={setSelectedPerformanceLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Səviyyə seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün Səviyyələr</SelectItem>
                  <SelectItem value="excellent">Əla</SelectItem>
                  <SelectItem value="good">Yaxşı</SelectItem>
                  <SelectItem value="average">Orta</SelectItem>
                  <SelectItem value="poor">Zəif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Ümumi Baxış</TabsTrigger>
          <TabsTrigger value="institutions">Müəssisələr</TabsTrigger>
          <TabsTrigger value="analytics">Analitiqa</TabsTrigger>
          <TabsTrigger value="comparison">Müqayisə</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {performanceData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Performans Bölgüsü
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Əla (90-100%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: `${(performanceData.performance_distribution.excellent / performanceData.total_institutions) * 100}%`}}></div>
                        </div>
                        <span className="text-sm font-medium">{performanceData.performance_distribution.excellent}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Yaxşı (80-89%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: `${(performanceData.performance_distribution.good / performanceData.total_institutions) * 100}%`}}></div>
                        </div>
                        <span className="text-sm font-medium">{performanceData.performance_distribution.good}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Orta (70-79%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-600 h-2 rounded-full" style={{width: `${(performanceData.performance_distribution.average / performanceData.total_institutions) * 100}%`}}></div>
                        </div>
                        <span className="text-sm font-medium">{performanceData.performance_distribution.average}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Zəif (0-69%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-red-600 h-2 rounded-full" style={{width: `${(performanceData.performance_distribution.poor / performanceData.total_institutions) * 100}%`}}></div>
                        </div>
                        <span className="text-sm font-medium">{performanceData.performance_distribution.poor}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    Ən Yaxşı Performans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData.top_performers.slice(0, 5).map((institution, index) => (
                      <div key={institution.institution_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{institution.institution_name}</p>
                            <p className="text-xs text-muted-foreground">{institution.assessment_count} qiymətləndirmə</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">{institution.average_score}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="institutions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Region Müəssisələri ({filteredInstitutions.length})</CardTitle>
              <CardDescription>
                Filtrlənmiş müəssisələrin qiymətləndirmə performansı
              </CardDescription>
            </CardHeader>
            <CardContent>
              {institutionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Müəssisələr yüklənir...</span>
                </div>
              ) : filteredInstitutions.length > 0 ? (
                <div className="space-y-4">
                  {filteredInstitutions.map((institution: InstitutionPerformance) => (
                    <div key={institution.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <School className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{institution.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {institution.type} • {institution.district} • {institution.student_count} şagird
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Son qiymətləndirmə: {new Date(institution.last_assessment_date).toLocaleDateString('az-AZ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">{institution.average_score}%</p>
                          <p className="text-xs text-muted-foreground">{institution.total_assessments} qiymətləndirmə</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <Badge className={getPerformanceColor(institution.performance_grade)}>
                            {getPerformanceLabel(institution.performance_grade)}
                          </Badge>
                          {getTrendIcon(institution.trend_direction)}
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Detay
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Seçilmiş filtrlərə uyğun müəssisə tapılmadı</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Performans Analitikaları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Analitiqa charts tezliklə əlavə ediləcək</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Müəssisələr Arası Müqayisə</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Müqayisə vasitələri hazırlanır</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};