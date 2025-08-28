import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, Eye, Calendar, BarChart3, FileText, TrendingUp, Loader2, Users, Activity, AlertCircle, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { reportsService, ReportFilters } from "@/services/reports";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { az } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

export default function Reports() {
  const { currentUser } = useAuth();
  const [selectedReportType, setSelectedReportType] = useState<string>('overview');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const { toast } = useToast();

  // Security check - hierarchical access to reports based on roles
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

  // Build filters based on selections
  const filters: ReportFilters = useMemo(() => {
    let dateFilters: Partial<ReportFilters> = {};
    
    switch (selectedDateRange) {
      case 'today':
        dateFilters = {
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: format(new Date(), 'yyyy-MM-dd')
        };
        break;
      case 'last_7_days':
        dateFilters = {
          start_date: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
          end_date: format(new Date(), 'yyyy-MM-dd')
        };
        break;
      case 'this_month':
        dateFilters = {
          start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd')
        };
        break;
      case 'custom':
        dateFilters = {
          start_date: startDate,
          end_date: endDate
        };
        break;
    }

    return dateFilters;
  }, [selectedDateRange, startDate, endDate]);

  // Load overview stats
  const { data: overviewResponse, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['reports-overview', filters, currentUser?.role, currentUser?.institution_id],
    queryFn: () => reportsService.getOverviewStats(filters),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
    retryOnMount: false
  });

  // Load institutional performance
  const { data: institutionalResponse, isLoading: institutionalLoading } = useQuery({
    queryKey: ['reports-institutional', filters, currentUser?.role, currentUser?.institution_id],
    queryFn: () => reportsService.getInstitutionalPerformance(filters),
    enabled: selectedReportType === 'institutional',
    staleTime: 1000 * 60 * 5,
  });

  // Load user activity report - restricted to SuperAdmin and RegionAdmin only
  const { data: userActivityResponse, isLoading: userActivityLoading } = useQuery({
    queryKey: ['reports-user-activity', filters, currentUser?.role, currentUser?.institution_id],
    queryFn: () => reportsService.getUserActivityReport(filters),
    enabled: selectedReportType === 'user_activity' && ['superadmin', 'regionadmin'].includes(currentUser?.role || ''),
    staleTime: 1000 * 60 * 5,
  });

  // Use real data or fallback to mock data
  const overviewStats = overviewResponse?.data || reportsService.getMockOverviewStats();
  const institutionalData = institutionalResponse?.data || [];
  const userActivityData = userActivityResponse?.data;

  const handleExport = async (reportType: 'overview' | 'institutional' | 'survey' | 'user_activity', format: 'pdf' | 'excel' | 'csv') => {
    try {
      let response;
      
      switch (reportType) {
        case 'overview':
          response = await reportsService.exportOverviewReport(format, filters);
          break;
        case 'institutional':
          response = await reportsService.exportInstitutionalReport(format, filters);
          break;
        case 'survey':
          response = await reportsService.exportSurveyReport(format, filters);
          break;
        case 'user_activity':
          response = await reportsService.exportUserActivityReport(format, filters);
          break;
      }

      if (response.success) {
        window.open(response.data.download_url, '_blank');
        toast({
          title: "Export uğurlu",
          description: `Hesabat ${format.toUpperCase()} formatında yükləndi.`,
        });
      }
    } catch (error) {
      toast({
        title: "Export xətası",
        description: "Hesabat export edilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  };

  const updateDateRange = (range: string) => {
    setSelectedDateRange(range);
    if (range === 'custom') {
      // Keep current custom dates
    } else {
      // Reset custom dates when switching away from custom
      setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hesabatlar</h1>
          <p className="text-muted-foreground">Analitik hesabatların yaradılması və idarə edilməsi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('overview', 'pdf')} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            PDF Export
          </Button>
          {['superadmin', 'regionadmin'].includes(currentUser?.role || '') && (
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Yeni Hesabat
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : overviewError ? (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">API bağlantısında xəta var</p>
            <p className="text-muted-foreground text-sm">Mock məlumatlarla davam edilir</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi istifadəçilər</p>
                <p className="text-2xl font-bold">{overviewStats.user_statistics.total_users.toLocaleString()}</p>
                <p className="text-xs text-green-600">
                  +{overviewStats.user_statistics.user_growth_rate}% artım
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv müəssisələr</p>
                <p className="text-2xl font-bold">{overviewStats.institution_statistics.active_institutions}</p>
                <p className="text-xs text-muted-foreground">
                  {overviewStats.institution_statistics.total_institutions} ümumi
                </p>
              </div>
              <FileText className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sorğu cavabları</p>
                <p className="text-2xl font-bold">{overviewStats.survey_statistics.total_responses.toLocaleString()}</p>
                <p className="text-xs text-blue-600">
                  {overviewStats.survey_statistics.response_rate}% cavab nisbəti
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sistem performansı</p>
                <p className="text-2xl font-bold">{overviewStats.performance_metrics.system_uptime}%</p>
                <p className="text-xs text-green-600">
                  {overviewStats.performance_metrics.user_satisfaction_score}/5 məmnuniyyət
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filterlər və Hesabat Seçimləri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedReportType} onValueChange={setSelectedReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Hesabat növü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Ümumi icmal</SelectItem>
                {(['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser?.role || '')) && (
                  <SelectItem value="institutional">Müəssisə performansı</SelectItem>
                )}
                <SelectItem value="survey">Sorğu analitikası</SelectItem>
                {(['superadmin', 'regionadmin'].includes(currentUser?.role || '')) && (
                  <SelectItem value="user_activity">İstifadəçi fəaliyyəti</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={selectedDateRange} onValueChange={updateDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Tarix aralığı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Bu gün</SelectItem>
                <SelectItem value="last_7_days">Son 7 gün</SelectItem>
                <SelectItem value="this_month">Bu ay</SelectItem>
                <SelectItem value="custom">Xüsusi</SelectItem>
              </SelectContent>
            </Select>

            {selectedDateRange === 'custom' && (
              <>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Başlanğıc tarixi"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  placeholder="Son tarix"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Content Based on Selection */}
      {selectedReportType === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>İstifadəçi Rollara Görə Bölgü</CardTitle>
              <CardDescription>İstifadəçilərin rol üzrə paylanması</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(overviewStats?.user_statistics?.users_by_role || []).map((role, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{role.role}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-secondary rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${role.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground w-12">{role.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Müəssisə Növlərinə Görə Bölgü</CardTitle>
              <CardDescription>Müəssisələrin növ üzrə paylanması</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(overviewStats?.institution_statistics?.institutions_by_type || []).map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{type.type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-secondary rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-secondary"
                          style={{ width: `${type.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground w-12">{type.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedReportType === 'institutional' && (
        <Card>
          <CardHeader>
            <CardTitle>Müəssisə Performans Hesabatı</CardTitle>
            <CardDescription>
              {institutionalData.length} müəssisənin performans göstəriciləri
            </CardDescription>
          </CardHeader>
          <CardContent>
            {institutionalLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Performans verilənləri yüklənir...</span>
              </div>
            ) : institutionalData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Seçilmiş tarix aralığında performans məlumatı tapılmadı
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müəssisə</TableHead>
                      <TableHead>Növ</TableHead>
                      <TableHead className="text-center">Performans Xalı</TableHead>
                      <TableHead className="text-center">Sorğu İştirakı</TableHead>
                      <TableHead className="text-center">Tapşırıq Tamamlama</TableHead>
                      <TableHead className="text-center">Reytinq</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(institutionalData || []).map((institution) => (
                      <TableRow key={institution.institution_id}>
                        <TableCell className="font-medium">{institution.institution_name}</TableCell>
                        <TableCell>{institution.type}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={institution.performance_score > 80 ? 'default' : institution.performance_score > 60 ? 'secondary' : 'destructive'}>
                            {institution.performance_score}/100
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{institution.metrics.survey_participation_rate}%</TableCell>
                        <TableCell className="text-center">{institution.metrics.task_completion_rate}%</TableCell>
                        <TableCell className="text-center">#{institution.comparison_data.ranking}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedReportType === 'user_activity' && ['superadmin', 'regionadmin'].includes(currentUser?.role || '') && (
        <Card>
          <CardHeader>
            <CardTitle>İstifadəçi Fəaliyyət Hesabatı</CardTitle>
            <CardDescription>
              İstifadəçilərin sistem daxilindəki fəaliyyət göstəriciləri
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userActivityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Fəaliyyət verilənləri yüklənir...</span>
              </div>
            ) : !userActivityData ? (
              <div className="text-center py-8 text-muted-foreground">
                İstifadəçi fəaliyyət məlumatları yüklənə bilmədi
              </div>
            ) : (
              <div className="space-y-6">
                {/* Activity Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userActivityData.total_users}</div>
                    <div className="text-sm text-muted-foreground">Ümumi İstifadəçi</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{userActivityData.active_users}</div>
                    <div className="text-sm text-muted-foreground">Aktiv İstifadəçi</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((userActivityData.active_users / userActivityData.total_users) * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Aktivlik Nisbəti</div>
                  </div>
                </div>

                {/* Most Active Users */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Ən Aktiv İstifadəçilər</h3>
                  <div className="space-y-2">
                    {(userActivityData?.activity_summary?.most_active_users || []).slice(0, 5).map((user, index) => (
                      <div key={user.user_id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{user.username}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.activity_count} fəaliyyət
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Seçimləri</CardTitle>
          <CardDescription>Hesabatları müxtəlif formatlarda yükləyin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => handleExport(selectedReportType as any, 'pdf')}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport(selectedReportType as any, 'excel')}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport(selectedReportType as any, 'csv')}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}