import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Users, Activity, Database, Server, Clock, AlertTriangle, Download, RefreshCw, Loader2, Eye, FileText, PieChart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsService, AnalyticsFilters } from "@/services/analytics";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { az } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

export default function Analytics() {
  const { currentUser } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // seconds
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Security check - only SuperAdmin and RegionAdmin can access analytics
  if (!currentUser || !['superadmin', 'regionadmin'].includes(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız SuperAdmin və RegionAdmin istifadəçiləri daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  // Build filters based on selected period
  const filters: AnalyticsFilters = useMemo(() => {
    const now = new Date();
    const daysAgo = {
      '7d': 7,
      '30d': 30, 
      '90d': 90,
      '1y': 365
    }[selectedPeriod];
    
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - daysAgo);
    
    return {
      date_from: fromDate.toISOString().split('T')[0],
      date_to: now.toISOString().split('T')[0],
      time_period: selectedPeriod,
      granularity: selectedPeriod === '7d' ? 'day' : selectedPeriod === '30d' ? 'day' : selectedPeriod === '90d' ? 'week' : 'month'
    };
  }, [selectedPeriod]);

  // Load analytics data
  const { data: overviewData, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['analytics-overview', filters],
    queryFn: () => analyticsService.getAnalyticsOverview(filters),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    refetchInterval: refreshInterval * 1000,
  });

  const { data: userAnalytics, isLoading: userLoading } = useQuery({
    queryKey: ['analytics-users', filters],
    queryFn: () => analyticsService.getUserAnalytics(filters),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: surveyAnalytics, isLoading: surveyLoading } = useQuery({
    queryKey: ['analytics-surveys', filters],
    queryFn: () => analyticsService.getSurveyAnalytics(filters),
    staleTime: 1000 * 60 * 5,
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['analytics-performance', filters],
    queryFn: () => analyticsService.getPerformanceAnalytics(filters),
    staleTime: 1000 * 60 * 1, // Cache for 1 minute
    refetchInterval: refreshInterval * 1000,
  });

  const { data: realtimeData, isLoading: realtimeLoading } = useQuery({
    queryKey: ['analytics-realtime'],
    queryFn: () => analyticsService.getRealtimeMetrics(),
    staleTime: 1000 * 15, // Cache for 15 seconds
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Use real data or fallback to mock data
  const overview = overviewData?.data || analyticsService.getMockOverview();
  const users = userAnalytics?.data || analyticsService.getMockUserAnalytics();
  const surveys = surveyAnalytics?.data || analyticsService.getMockSurveyAnalytics();
  const performance = performanceData?.data?.system_metrics;
  const realtime = realtimeData?.data || analyticsService.getMockRealtimeMetrics();

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (format: 'pdf' | 'excel' | 'csv') => 
      analyticsService.exportAnalytics({
        report_type: 'overview',
        format,
        filters,
        include_charts: true,
        include_raw_data: true
      }),
    onSuccess: (response) => {
      if (response.data.download_url) {
        window.open(response.data.download_url, '_blank');
        toast({
          title: "Export uğurlu",
          description: "Analitika hesabatı yükləndi.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Export xətası",
        description: "Hesabat export edilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-orange-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusBadge = (percentage: number, label: string) => {
    if (percentage >= 90) return <Badge variant="destructive">{label}</Badge>;
    if (percentage >= 70) return <Badge variant="outline" className="border-orange-500 text-orange-600">{label}</Badge>;
    if (percentage >= 50) return <Badge variant="outline" className="border-yellow-500 text-yellow-600">{label}</Badge>;
    return <Badge variant="default">{label}</Badge>;
  };

  const isLoading = overviewLoading || userLoading || surveyLoading || performanceLoading;

  if (overviewError) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Analitika məlumatları yüklənərkən problem yarandı.</p>
        <p className="text-sm text-muted-foreground mt-2">Mock məlumatlarla davam edilir</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sistem Statistikası</h1>
          <p className="text-muted-foreground">Sistem performansı və istifadə statistikaları</p>
        </div>
        <div className="flex items-center gap-2">
          {realtimeLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Aktiv: {realtime.active_users}</span>
            </div>
          )}
          <Select value={selectedPeriod} onValueChange={(value: '7d' | '30d' | '90d' | '1y') => setSelectedPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Müddət seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Son 7 gün</SelectItem>
              <SelectItem value="30d">Son 30 gün</SelectItem>
              <SelectItem value="90d">Son 90 gün</SelectItem>
              <SelectItem value="1y">Son 1 il</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['analytics'] })}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Yenilə
          </Button>
          <Button
            onClick={() => exportMutation.mutate('excel')}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv istifadəçilər</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    overview.active_users_today.toLocaleString()
                  )}
                </p>
                <p className="text-xs text-green-500">+{overview.user_growth_rate}% artım</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cavab nisbəti</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    `${overview.avg_response_rate}%`
                  )}
                </p>
                <p className={`text-xs ${getStatusColor(overview.avg_response_rate)}`}>
                  {overview.avg_response_rate >= 80 ? 'Yüksək' : overview.avg_response_rate >= 60 ? 'Orta' : 'Aşağı'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam sorğular</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    overview.total_surveys.toLocaleString()
                  )}
                </p>
                <p className="text-xs text-blue-500">{overview.active_surveys} aktiv</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam cavablar</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    overview.total_responses.toLocaleString()
                  )}
                </p>
                <p className="text-xs text-green-500">+{overview.responses_today} bu gün</p>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              İstifadəçi Aktivliyi
            </CardTitle>
            <CardDescription>Son 7 günün istifadəçi aktivlik trendi</CardDescription>
          </CardHeader>
          <CardContent>
            {userLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Məlumatlar yüklənir...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{users.total_count.toLocaleString()}</p>
                    <p className="text-muted-foreground">Toplam istifadəçi</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{users.active_count.toLocaleString()}</p>
                    <p className="text-muted-foreground">Aktiv istifadəçi</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Rol üzrə payı</h4>
                  {users.by_role.slice(0, 4).map((role) => (
                    <div key={role.role} className="flex items-center justify-between text-sm">
                      <span>{role.role}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${role.percentage}%` }}
                          ></div>
                        </div>
                        <span className="w-10 text-right">{role.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Bu gün qeydiyyat:</span>
                    <span className="font-medium text-foreground">+{users.new_registrations_today}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performans Məlumatları
            </CardTitle>
            <CardDescription>Sistem performans göstəriciləri</CardDescription>
          </CardHeader>
          <CardContent>
            {performanceLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div>
                    <p className="text-lg font-bold">{realtime.requests_per_minute}</p>
                    <p className="text-muted-foreground">So/dq</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{realtime.avg_response_time}ms</p>
                    <p className="text-muted-foreground">Cavab vaxtı</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">CPU İstifadəsi</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${getStatusColor(realtime.cpu_usage)}`}>{realtime.cpu_usage}%</span>
                        {getStatusBadge(realtime.cpu_usage, realtime.cpu_usage >= 90 ? 'Kritik' : realtime.cpu_usage >= 70 ? 'Yüksək' : 'Normal')}
                      </div>
                    </div>
                    <Progress value={realtime.cpu_usage} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Yaddash İstifadəsi</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${getStatusColor(realtime.memory_usage)}`}>{realtime.memory_usage}%</span>
                        {getStatusBadge(realtime.memory_usage, realtime.memory_usage >= 90 ? 'Kritik' : realtime.memory_usage >= 70 ? 'Yüksək' : 'Normal')}
                      </div>
                    </div>
                    <Progress value={realtime.memory_usage} className="h-2" />
                  </div>

                  {performance && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Disk İstifadəsi</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${getStatusColor(performance.disk_usage_percentage)}`}>{performance.disk_usage_percentage}%</span>
                          {getStatusBadge(performance.disk_usage_percentage, performance.disk_usage_percentage >= 90 ? 'Kritik' : performance.disk_usage_percentage >= 70 ? 'Yüksək' : 'Normal')}
                        </div>
                      </div>
                      <Progress value={performance.disk_usage_percentage} className="h-2" />
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {performance ? `${performance.uptime_percentage}% Əlçatanlıq` : 'Məlumat yüklənir'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Son Sistem Hadisələri
          </CardTitle>
          <CardDescription>Sistem logları və hadisələr</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Recent Activity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="text-lg font-bold text-green-600">{surveys.total_count}</p>
                <p className="text-sm text-muted-foreground">Toplam Sorğu</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="text-lg font-bold text-blue-600">{surveys.published_count}</p>
                <p className="text-sm text-muted-foreground">Nəşr Edilmiş</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="text-lg font-bold text-purple-600">{overview.total_institutions}</p>
                <p className="text-sm text-muted-foreground">Müəssisələr</p>
              </div>
            </div>
            
            {/* Survey Performance by Category */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Kateqoriya üzrə performans</h4>
              {surveyLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : (
                surveys.by_category.map((category) => (
                  <div key={category.category} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {category.category === 'teacher' && <Users className="h-4 w-4 text-primary" />}
                      {category.category === 'student' && <Activity className="h-4 w-4 text-blue-500" />}
                      {category.category === 'parent' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {category.category === 'staff' && <Server className="h-4 w-4 text-purple-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-medium capitalize">
                          {category.category === 'teacher' ? 'Müəllim' : 
                           category.category === 'student' ? 'Şagird' :
                           category.category === 'parent' ? 'Valideyn' : 'Heyət'} Sorğuları
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{category.count} sorğu</span>
                          <Badge variant={category.avg_response_rate >= 80 ? 'default' : category.avg_response_rate >= 60 ? 'outline' : 'destructive'}>
                            {category.avg_response_rate}% cavab
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Orta müddət: {category.avg_completion_time} dəqiqə</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* System Events */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Sistem vəziyyəti</h4>
                <div className="flex items-center gap-2">
                  {realtime.error_count > 0 ? (
                    <Badge variant="destructive">{realtime.error_count} xəta</Badge>
                  ) : (
                    <Badge variant="default">Stabil</Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Aktiv: </span>
                  <span className="font-medium">{realtime.active_users} istifadəçi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">API: </span>
                  <span className="font-medium">{realtime.requests_per_minute}/dəqiqə</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}