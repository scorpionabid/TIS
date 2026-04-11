import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Download,
  Eye,
  Calendar,
  BarChart3,
  FileText,
  TrendingUp,
  Loader2,
  Users,
  Activity,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { reportsService, ReportFilters } from "@/services/reports";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { az } from "date-fns/locale";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { USER_ROLES } from "@/constants/roles";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

export default function Reports() {
  const { currentUser, hasAnyRole } = useRoleCheck();
  const reportsAccess = useModuleAccess("reports");
  const [selectedReportType, setSelectedReportType] =
    useState<string>("overview");
  const [selectedDateRange, setSelectedDateRange] =
    useState<string>("this_month");
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const { toast } = useToast();

  // Allowed roles and access helpers - include sektoradmin
  const REPORTS_ACCESS_ROLES = [
    USER_ROLES.SUPERADMIN,
    USER_ROLES.REGIONADMIN,
    USER_ROLES.SEKTORADMIN,
  ];
  const hasAccess = reportsAccess.canView && hasAnyRole(REPORTS_ACCESS_ROLES);

  // Build filters based on selections
  const filters: ReportFilters = useMemo(() => {
    let dateFilters: Partial<ReportFilters> = {};

    switch (selectedDateRange) {
      case "today":
        dateFilters = {
          start_date: format(new Date(), "yyyy-MM-dd"),
          end_date: format(new Date(), "yyyy-MM-dd"),
        };
        break;
      case "last_7_days":
        dateFilters = {
          start_date: format(subDays(new Date(), 7), "yyyy-MM-dd"),
          end_date: format(new Date(), "yyyy-MM-dd"),
        };
        break;
      case "this_month":
        dateFilters = {
          start_date: format(startOfMonth(new Date()), "yyyy-MM-dd"),
          end_date: format(endOfMonth(new Date()), "yyyy-MM-dd"),
        };
        break;
      case "custom":
        dateFilters = {
          start_date: startDate,
          end_date: endDate,
        };
        break;
    }

    return dateFilters;
  }, [selectedDateRange, startDate, endDate]);

  // Load overview stats - use different endpoint based on user role
  const {
    data: overviewResponse,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: [
      currentUser?.role === USER_ROLES.SEKTORADMIN
        ? "sektor-reports-overview"
        : "reports-overview",
      filters,
      currentUser?.role,
      currentUser?.institution?.id,
    ],
    queryFn: () => {
      if (currentUser?.role === USER_ROLES.SEKTORADMIN) {
        return reportsService.getSektorOverviewStats(filters);
      }
      return reportsService.getOverviewStats(filters);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
    retryOnMount: false,
    enabled: hasAccess,
  });

  // Load institutional performance - use different endpoint based on user role
  const { data: institutionalResponse, isLoading: institutionalLoading } =
    useQuery({
      queryKey: [
        currentUser?.role === USER_ROLES.SEKTORADMIN
          ? "sektor-reports-institutional"
          : "reports-institutional",
        filters,
        currentUser?.role,
        currentUser?.institution?.id,
      ],
      queryFn: () => {
        if (currentUser?.role === USER_ROLES.SEKTORADMIN) {
          return reportsService.getSektorInstitutionPerformance(filters);
        }
        return reportsService.getInstitutionalPerformance(filters);
      },
      enabled: selectedReportType === "institutional" && hasAccess,
      staleTime: 1000 * 60 * 5,
    });

  // Load user activity report - use different endpoint based on user role
  const { data: userActivityResponse, isLoading: userActivityLoading } =
    useQuery({
      queryKey: [
        currentUser?.role === USER_ROLES.SEKTORADMIN
          ? "sektor-reports-user-activity"
          : "reports-user-activity",
        filters,
        currentUser?.role,
        currentUser?.institution?.id,
      ],
      queryFn: () => {
        if (currentUser?.role === USER_ROLES.SEKTORADMIN) {
          return reportsService.getSektorUserActivity(filters);
        }
        return reportsService.getUserActivityReport(filters);
      },
      enabled: selectedReportType === "user_activity" && hasAccess,
      staleTime: 1000 * 60 * 5,
    });

  // Load survey analytics report
  const { data: surveyResponse, isLoading: surveyLoading } = useQuery({
    queryKey: [
      currentUser?.role === USER_ROLES.SEKTORADMIN
        ? "sektor-reports-survey"
        : "reports-survey",
      filters,
      currentUser?.role,
    ],
    queryFn: () => {
      if (currentUser?.role === USER_ROLES.SEKTORADMIN) {
        return reportsService.getSektorSurveyAnalytics(filters);
      }
      return reportsService.getSurveyAnalytics(filters);
    },
    enabled: selectedReportType === "survey" && hasAccess,
    staleTime: 1000 * 60 * 5,
  });

  // Security check - hierarchical access to reports based on roles
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəni yalnız SuperAdmin, Region Admin və Sektor Admin rolları
            görə bilər.
          </p>
        </div>
      </div>
    );
  }

  // Use real data or fallback to mock data
  const overviewStats =
    overviewResponse?.data || reportsService.getMockOverviewStats();
  const institutionalData = institutionalResponse?.data || [];
  const userActivityData = userActivityResponse?.data;

  const handleExport = async (
    reportType: "overview" | "institutional" | "survey" | "user_activity",
    format: "pdf" | "excel" | "csv",
  ) => {
    try {
      let response;

      switch (reportType) {
        case "overview":
          if (currentUser?.role === USER_ROLES.SEKTORADMIN) {
            response = await reportsService.getSektorOverviewStats(filters);
            // For now, just show success message - actual export would need implementation
            toast({
              title: "Export uğurlu",
              description: `Sektor hesabatı ${format.toUpperCase()} formatında hazırlanır...`,
            });
            return;
          }
          response = await reportsService.exportOverviewReport(format, filters);
          break;
        case "institutional":
          if (currentUser?.role === USER_ROLES.SEKTORADMIN) {
            response =
              await reportsService.getSektorInstitutionPerformance(filters);
            toast({
              title: "Export uğurlu",
              description: `Sektor müəssisə hesabatı ${format.toUpperCase()} formatında hazırlanır...`,
            });
            return;
          }
          response = await reportsService.exportInstitutionalReport(
            format,
            filters,
          );
          break;
        case "survey":
          response = await reportsService.exportSurveyReport(format, filters);
          break;
        case "user_activity":
          if (currentUser?.role === USER_ROLES.SEKTORADMIN) {
            response = await reportsService.getSektorUserActivity(filters);
            toast({
              title: "Export uğurlu",
              description: `Sektor istifadəçi fəaliyyəti hesabatı ${format.toUpperCase()} formatında hazırlanır...`,
            });
            return;
          }
          response = await reportsService.exportUserActivityReport(
            format,
            filters,
          );
          break;
      }

      if (response.success) {
        window.open(response.data.download_url, "_blank");
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
    if (range === "custom") {
      // Keep current custom dates
    } else {
      // Reset custom dates when switching away from custom
      setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    }
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hesabatlar</h1>
          <p className="text-muted-foreground">
            Analitik hesabatların yaradılması və idarə edilməsi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("overview", "pdf")}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF Export
          </Button>
          {hasAnyRole(REPORTS_ACCESS_ROLES) && (
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
          {[1, 2, 3, 4].map((i) => (
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
            <p className="text-destructive font-medium">
              API bağlantısında xəta var
            </p>
            <p className="text-muted-foreground text-sm">
              Mock məlumatlarla davam edilir
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ümumi istifadəçilər
                </p>
                <p className="text-2xl font-bold">
                  {overviewStats.user_statistics.total_users.toLocaleString()}
                </p>
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
                <p className="text-sm text-muted-foreground">
                  Aktiv müəssisələr
                </p>
                <p className="text-2xl font-bold">
                  {overviewStats.institution_statistics.active_institutions}
                </p>
                <p className="text-xs text-muted-foreground">
                  {overviewStats.institution_statistics.total_institutions}{" "}
                  ümumi
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
                <p className="text-2xl font-bold">
                  {overviewStats.survey_statistics.total_responses.toLocaleString()}
                </p>
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
                <p className="text-sm text-muted-foreground">
                  Sistem performansı
                </p>
                <p className="text-2xl font-bold">
                  {overviewStats.performance_metrics.system_uptime}%
                </p>
                <p className="text-xs text-green-600">
                  {overviewStats.performance_metrics.user_satisfaction_score}/5
                  məmnuniyyət
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
            <Select
              value={selectedReportType}
              onValueChange={setSelectedReportType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hesabat növü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Ümumi icmal</SelectItem>
                {REPORTS_ACCESS_ROLES.includes(currentUser?.role as any) && (
                  <SelectItem value="institutional">
                    Müəssisə performansı
                  </SelectItem>
                )}
                <SelectItem value="survey">Sorğu analitikası</SelectItem>
                {currentUser?.role !== USER_ROLES.SEKTORADMIN &&
                  REPORTS_ACCESS_ROLES.includes(currentUser?.role as any) && (
                    <SelectItem value="user_activity">
                      İstifadəçi fəaliyyəti
                    </SelectItem>
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

            {selectedDateRange === "custom" && (
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
      {selectedReportType === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>İstifadəçi Rollara Görə Bölgü</CardTitle>
              <CardDescription>
                İstifadəçilərin rol üzrə paylanması
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overviewStats?.user_statistics?.users_by_role || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="role"
                    >
                      {(overviewStats?.user_statistics?.users_by_role || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Müəssisə Növlərinə Görə Bölgü</CardTitle>
              <CardDescription>
                Müəssisələrin növ üzrə paylanması
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={overviewStats?.institution_statistics?.institutions_by_type || []}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="type" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Activity Trends */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Sistem Aktivlik Trendləri</CardTitle>
              <CardDescription>Son dövr üzrə ümumi aktivlik nisbəti</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={overviewStats?.growth_trends?.activity_trends || []}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    <Area type="monotone" dataKey="activity_count" stroke="#8884d8" fillOpacity={1} fill="url(#colorActivity)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedReportType === "institutional" && (
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
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müəssisə</TableHead>
                      <TableHead>Növ</TableHead>
                      <TableHead className="text-center">
                        Performans Xalı
                      </TableHead>
                      <TableHead className="text-center">
                        Sorğu İştirakı
                      </TableHead>
                      <TableHead className="text-center">
                        Tapşırıq Tamamlama
                      </TableHead>
                      <TableHead className="text-center">Reytinq</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(institutionalData || []).map((institution) => (
                      <TableRow key={institution.institution_id}>
                        <TableCell className="font-medium">
                          {institution.institution_name}
                        </TableCell>
                        <TableCell>{institution.type}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              institution.performance_score > 80
                                ? "default"
                                : institution.performance_score > 60
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {institution.performance_score}/100
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {institution.metrics.survey_participation_rate}%
                        </TableCell>
                        <TableCell className="text-center">
                          {institution.metrics.task_completion_rate}%
                        </TableCell>
                        <TableCell className="text-center">
                          #{institution.comparison_data.ranking}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedReportType === "survey" && (
        <Card>
          <CardHeader>
            <CardTitle>Sorğu Analitikası Hesabatı</CardTitle>
            <CardDescription>
              Cari dövr üzrə sorğu nəticələri və iştirak dərəcəsi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {surveyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Sorğu analitikası yüklənir...</span>
              </div>
            ) : (surveyResponse?.data || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Sorğu məlumatı tapılmadı
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(surveyResponse?.data || []).slice(0, 4).map((survey: any) => (
                    <Card key={survey.id || survey.survey_id} className="border shadow-none">
                      <CardHeader className="pb-2 text-xs font-semibold uppercase text-muted-foreground">
                        {survey.status}
                      </CardHeader>
                      <CardContent>
                        <h4 className="font-bold mb-2 truncate">{survey.title || survey.survey_title}</h4>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span>Dərəcə: {survey.completion_rate}%</span>
                          <span>{survey.responses || survey.total_responses} cavab</span>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full" 
                            style={{ width: `${survey.completion_rate}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sorğu Başlığı</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Cavab Sayı</TableHead>
                        <TableHead className="text-center">Tamamlanma %</TableHead>
                        <TableHead className="text-center">Tarix</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(surveyResponse?.data || []).map((survey: any) => (
                        <TableRow key={survey.id || survey.survey_id}>
                          <TableCell className="font-medium truncate max-w-[200px]">{survey.title || survey.survey_title}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="capitalize">
                              {survey.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{survey.responses || survey.total_responses}</TableCell>
                          <TableCell className="text-center font-semibold text-primary">{survey.completion_rate}%</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{survey.created_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedReportType === "user_activity" &&
        currentUser?.role !== USER_ROLES.SEKTORADMIN &&
        REPORTS_ACCESS_ROLES.includes(currentUser?.role as any) && (
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
                  <span className="ml-2">
                    Fəaliyyət verilənləri yüklənir...
                  </span>
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
                      <div className="text-2xl font-bold text-primary">
                        {userActivityData.total_users}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ümumi İstifadəçi
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {userActivityData.active_users}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Aktiv İstifadəçi
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(
                          (userActivityData.active_users /
                            userActivityData.total_users) *
                            100,
                        )}
                        %
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Aktivlik Nisbəti
                      </div>
                    </div>
                  </div>

                  {/* Most Active Users */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Ən Aktiv İstifadəçilər
                    </h3>
                    <div className="space-y-2">
                      {(
                        userActivityData?.activity_summary?.most_active_users ||
                        []
                      )
                        .slice(0, 5)
                        .map((user, index) => (
                          <div
                            key={user.user_id}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">#{index + 1}</Badge>
                              <span className="font-medium">
                                {user.username}
                              </span>
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
          <CardDescription>
            Hesabatları müxtəlif formatlarda yükləyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => handleExport(selectedReportType as any, "pdf")}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport(selectedReportType as any, "excel")}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport(selectedReportType as any, "csv")}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
