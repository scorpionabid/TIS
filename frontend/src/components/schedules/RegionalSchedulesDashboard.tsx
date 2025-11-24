import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Users, 
  Building2, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Search,
  Eye,
  BarChart3,
  PieChart,
  Globe,
  Clock,
  Target,
  Award
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Institution {
  id: number;
  name: string;
  type: string;
  region: string;
  total_schedules: number;
  active_schedules: number;
  last_update: string;
  performance_score: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

interface ScheduleOverview {
  id: number;
  name: string;
  institution: Institution;
  status: string;
  created_at: string;
  performance_rating: number;
  conflicts_count: number;
  sessions_count: number;
  teacher_satisfaction: number;
  utilization_rate: number;
}

interface RegionalStats {
  total_institutions: number;
  total_schedules: number;
  active_schedules: number;
  average_performance: number;
  critical_issues: number;
  improvement_rate: number;
  teacher_satisfaction_avg: number;
  schedule_completion_rate: number;
}

export const RegionalSchedulesDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'institutions' | 'analytics' | 'comparison'>('overview');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOverview[]>([]);
  const [regionalStats, setRegionalStats] = useState<RegionalStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitutions, setSelectedInstitutions] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data - in real implementation, this would be API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading

      const mockInstitutions: Institution[] = [
        {
          id: 1,
          name: 'Baku School #1',
          type: 'Secondary School',
          region: 'Baku',
          total_schedules: 15,
          active_schedules: 12,
          last_update: '2025-01-08',
          performance_score: 85,
          status: 'good'
        },
        {
          id: 2,
          name: 'Ganja School #45',
          type: 'Primary School',
          region: 'Ganja',
          total_schedules: 8,
          active_schedules: 7,
          last_update: '2025-01-07',
          performance_score: 92,
          status: 'excellent'
        },
        {
          id: 3,
          name: 'Sumgayit Technical School',
          type: 'Vocational School',
          region: 'Sumgayit',
          total_schedules: 22,
          active_schedules: 18,
          last_update: '2025-01-06',
          performance_score: 68,
          status: 'needs_attention'
        }
      ];

      const mockSchedules: ScheduleOverview[] = [
        {
          id: 1,
          name: 'Winter Term 2025',
          institution: mockInstitutions[0],
          status: 'active',
          created_at: '2025-01-01',
          performance_rating: 4.2,
          conflicts_count: 3,
          sessions_count: 234,
          teacher_satisfaction: 87,
          utilization_rate: 94
        },
        {
          id: 2,
          name: 'Spring Semester 2025',
          institution: mockInstitutions[1],
          status: 'active',
          created_at: '2025-01-05',
          performance_rating: 4.7,
          conflicts_count: 1,
          sessions_count: 156,
          teacher_satisfaction: 93,
          utilization_rate: 98
        }
      ];

      const mockStats: RegionalStats = {
        total_institutions: 25,
        total_schedules: 89,
        active_schedules: 76,
        average_performance: 82.5,
        critical_issues: 4,
        improvement_rate: 15.3,
        teacher_satisfaction_avg: 88.7,
        schedule_completion_rate: 94.2
      };

      setInstitutions(mockInstitutions);
      setSchedules(mockSchedules);
      setRegionalStats(mockStats);
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Məlumatlar yüklənə bilmədi',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const filteredInstitutions = useMemo(() => {
    return institutions.filter(institution => {
      const matchesSearch = institution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           institution.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || institution.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [institutions, searchTerm, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'needs_attention': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <Award className="w-4 h-4" />;
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'needs_attention': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Regional Statistics */}
      {regionalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Təhsil Müəssisələri</p>
                  <p className="text-2xl font-bold">{regionalStats.total_institutions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Aktiv Cədvəllər</p>
                  <p className="text-2xl font-bold">{regionalStats.active_schedules}</p>
                  <p className="text-xs text-gray-500">/ {regionalStats.total_schedules} ümumi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Orta Performans</p>
                  <p className="text-2xl font-bold">{regionalStats.average_performance}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Müəllim Məmnunluğu</p>
                  <p className="text-2xl font-bold">{regionalStats.teacher_satisfaction_avg}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performans Səviyyələri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Əla (90%+)</span>
                  <span className="text-sm text-gray-600">
                    {institutions.filter(i => i.performance_score >= 90).length}
                  </span>
                </div>
                <Progress 
                  value={(institutions.filter(i => i.performance_score >= 90).length / institutions.length) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Yaxşı (80-89%)</span>
                  <span className="text-sm text-gray-600">
                    {institutions.filter(i => i.performance_score >= 80 && i.performance_score < 90).length}
                  </span>
                </div>
                <Progress 
                  value={(institutions.filter(i => i.performance_score >= 80 && i.performance_score < 90).length / institutions.length) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Diqqət Tələb Edir (60-79%)</span>
                  <span className="text-sm text-gray-600">
                    {institutions.filter(i => i.performance_score >= 60 && i.performance_score < 80).length}
                  </span>
                </div>
                <Progress 
                  value={(institutions.filter(i => i.performance_score >= 60 && i.performance_score < 80).length / institutions.length) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Kritik Məsələlər
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>4 məssisədə</strong> performans problemi aşkarlandı
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                {institutions
                  .filter(i => i.status === 'needs_attention' || i.status === 'critical')
                  .map(institution => (
                    <div key={institution.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">{institution.name}</span>
                        <p className="text-xs text-gray-600">{institution.performance_score}% performans</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Bax
                      </Button>
                    </div>
                  ))
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Son Fəaliyyətlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedules.slice(0, 5).map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <span className="font-medium">{schedule.name}</span>
                  <p className="text-sm text-gray-600">{schedule.institution.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(schedule.created_at).toLocaleDateString('az-AZ')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-1">
                    {schedule.status}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    {schedule.performance_rating}/5.0 ⭐
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInstitutionsTab = () => (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Müəssisə axtarın..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select 
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Bütün statuslar</option>
                <option value="excellent">Əla</option>
                <option value="good">Yaxşı</option>
                <option value="needs_attention">Diqqət tələb edir</option>
                <option value="critical">Kritik</option>
              </select>
              
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Eksport
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Institutions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInstitutions.map(institution => (
          <Card key={institution.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{institution.name}</h3>
                  <p className="text-sm text-gray-600">{institution.type}</p>
                  <p className="text-xs text-gray-500">📍 {institution.region}</p>
                </div>
                <Badge className={getStatusColor(institution.status)}>
                  {getStatusIcon(institution.status)}
                  <span className="ml-1">
                    {institution.status === 'excellent' && 'Əla'}
                    {institution.status === 'good' && 'Yaxşı'}
                    {institution.status === 'needs_attention' && 'Diqqət'}
                    {institution.status === 'critical' && 'Kritik'}
                  </span>
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Performans</span>
                  <span className="font-medium">{institution.performance_score}%</span>
                </div>
                <Progress value={institution.performance_score} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cədvəllər</span>
                  <p className="font-medium">{institution.active_schedules}/{institution.total_schedules}</p>
                </div>
                <div>
                  <span className="text-gray-600">Son Yenilik</span>
                  <p className="font-medium text-xs">
                    {new Date(institution.last_update).toLocaleDateString('az-AZ')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  Ətraflı
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="min-h-[400px]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Məlumatlar yüklənir...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regional Cədvəl Nəzarəti</h1>
          <p className="text-gray-600">Bütün təhsil müəssisələrinin cədvəllərini idarə edin</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Hesabat
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab as any}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Ümumi Baxış
          </TabsTrigger>
          <TabsTrigger value="institutions" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Müəssisələr
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analitika
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Müqayisə
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="institutions">
          {renderInstitutionsTab()}
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Analitika bölməsi hazırlanır...</p>
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <div className="text-center py-12">
            <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Müqayisə alətləri hazırlanır...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
