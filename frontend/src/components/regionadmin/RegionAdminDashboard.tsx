import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  ListChecks,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { regionAdminService } from "@/services/regionAdmin";
import { useAuth } from "@/contexts/AuthContext";

interface RegionOverview {
  region_name?: string;
  total_sectors?: number;
  total_schools?: number;
  total_users?: number;
  active_users?: number;
  user_activity_rate?: number;
}

interface MetricSummary {
  total_surveys?: number;
  active_surveys?: number;
  total_responses?: number;
  response_rate?: number;
}

interface TaskMetrics {
  total_tasks?: number;
  completed_tasks?: number;
  pending_tasks?: number;
  completion_rate?: number;
}

interface SectorPerformanceItem {
  sector_name: string;
  schools_count: number;
  users_count: number;
  surveys_count: number;
  tasks_count: number;
  completion_rate: number;
}

interface DashboardActivity {
  id: number;
  type: string;
  action: string;
  user: string;
  time: string;
  timestamp: string;
}

interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  time_ago: string;
}

interface RegionAdminDashboardResponse {
  region_overview?: RegionOverview;
  survey_metrics?: MetricSummary;
  task_metrics?: TaskMetrics;
  sector_performance?: SectorPerformanceItem[];
  recent_activities?: DashboardActivity[];
  notifications?: DashboardNotification[];
  user_role?: string;
  region_id?: number | null;
  error?: string;
  message?: string;
}

export const RegionAdminDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: dashboard,
    isLoading,
    refetch,
  } = useQuery<RegionAdminDashboardResponse>({
    queryKey: ["regionadmin-dashboard"],
    queryFn: () => regionAdminService.getDashboardStats<RegionAdminDashboardResponse>(),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const regionName =
    dashboard?.region_overview?.region_name ??
    currentUser?.institution?.name ??
    "Regional İdarəetmə";

  const summaryCards = useMemo(
    () => [
      {
        label: "Sektorlar",
        value: dashboard?.region_overview?.total_sectors ?? 0,
      },
      {
        label: "Məktəblər",
        value: dashboard?.region_overview?.total_schools ?? 0,
      },
      {
        label: "İstifadəçilər",
        value: dashboard?.region_overview?.total_users ?? 0,
      },
      {
        label: "Aktiv istifadəçilər",
        value: dashboard?.region_overview?.active_users ?? 0,
      },
      {
        label: "Sorğu cavabları",
        value: dashboard?.survey_metrics?.total_responses ?? 0,
      },
      {
        label: "Tamamlanma nisbəti",
        value:
          dashboard?.task_metrics?.completion_rate !== undefined
            ? `${dashboard.task_metrics.completion_rate}%`
            : "—",
      },
    ],
    [dashboard]
  );

  const quickLinks = useMemo(() => {
    const taskMetrics = dashboard?.task_metrics;
    const surveyMetrics = dashboard?.survey_metrics;

    return [
      {
        key: "tasks",
        title: "Tapşırıqlar",
        description: "Region üzrə təyin edilmiş tapşırıqlar.",
        href: "/tasks/assigned",
        icon: ClipboardList,
        badge: taskMetrics?.pending_tasks ?? 0,
      },
      {
        key: "surveys",
        title: "Sorğular",
        description: "Aktiv regional sorğular.",
        href: "/my-surveys/pending",
        icon: ListChecks,
        badge: surveyMetrics?.active_surveys ?? 0,
      },
      {
        key: "assessments",
        title: "Qiymətləndirmə",
        description: "Qiymətləndirmə daxil etmə modulu.",
        href: "/assessments/entry",
        icon: CheckSquare,
        badge: dashboard?.task_metrics?.total_tasks ?? 0,
      },
      {
        key: "attendance",
        title: "Davamiyyət",
        description: "Toplu davamiyyət girişi.",
        href: "/attendance/bulk",
        icon: Users,
        badge: dashboard?.region_overview?.active_users ?? 0,
      },
      {
        key: "resources",
        title: "Resurslar",
        description: "Regional sənəd və qovluqlar.",
        href: "/regionadmin/documents",
        icon: BookOpen,
        badge: dashboard?.notifications?.length ?? 0,
      },
      {
        key: "approvals",
        title: "Təsdiqlər",
        description: "Müraciət və sorğuların təsdiqi.",
        href: "/approvals",
        icon: FileText,
        badge: dashboard?.notifications?.length ?? 0,
      },
    ];
  }, [dashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success("Dashboard yeniləndi");
    } catch (error) {
      toast.error("Yeniləmə alınmadı");
    } finally {
      setRefreshing(false);
    }
  };

  if (!isLoading && dashboard?.region_id === null) {
    return (
      <div className="space-y-4 px-2 pt-0 pb-4 sm:px-3 lg:px-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              Region təyinatı tələb olunur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Regional dashboardu görmək üçün istifadəçi regional
              müəssisəyə təyin olunmalıdır.
            </p>
            <p>Zəhmət olmasa sistem administratoru ilə əlaqə saxlayın.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && dashboard?.error) {
    return (
      <div className="space-y-4 px-2 pt-0 pb-4 sm:px-3 lg:px-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              {dashboard.error}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {dashboard.message ??
                "Regional dashboard məlumatları hazırda əlçatan deyil."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 pt-0 pb-4 sm:px-3 lg:px-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {regionName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Regional idarəetmənin əsas göstəriciləri və qısayolları.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 sm:w-auto"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              (refreshing || isLoading) && "animate-spin"
            )}
          />
          Yenilə
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card/85 px-3 py-3"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </span>
            <span className="text-base font-semibold text-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card
              key={link.key}
              align="start"
              className="flex h-full flex-col border border-border/60 bg-card/90 transition-colors hover:border-primary/40 hover:shadow-sm"
            >
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {link.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border px-2 py-0.5 text-xs font-medium"
                  >
                    {link.badge}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit gap-1 px-0 text-primary"
                  onClick={() => navigate(link.href)}
                >
                  Aç
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Sektor performansı
              </CardTitle>
              <CardDescription>
                Region daxilində sektorların əsas göstəriciləri
              </CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.sector_performance?.length ? (
              dashboard.sector_performance.slice(0, 6).map((sector) => (
                <div
                  key={sector.sector_name}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {sector.sector_name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {sector.completion_rate}% tamamlanma
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>Məktəb: {sector.schools_count}</span>
                    <span>İşçi: {sector.users_count}</span>
                    <span>Tapş.: {sector.tasks_count}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                Sektor performans məlumatı tapılmadı.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Yaxın son tarixlər
              </CardTitle>
              <CardDescription>Tapşırıq və sorğu prioritetləri</CardDescription>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.task_metrics?.pending_tasks ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                <p className="text-sm font-medium text-foreground">
                  Gözləyən tapşırıqlar
                </p>
                <p className="text-xs text-muted-foreground">
                  Aktiv tapşırıqlar: {dashboard.task_metrics.pending_tasks}
                </p>
              </div>
            ) : null}
            {dashboard?.survey_metrics?.active_surveys ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                <p className="text-sm font-medium text-foreground">
                  Aktiv sorğular
                </p>
                <p className="text-xs text-muted-foreground">
                  Cavab gözləyir: {dashboard.survey_metrics.active_surveys}
                </p>
              </div>
            ) : null}
            {!dashboard?.task_metrics?.pending_tasks &&
            !dashboard?.survey_metrics?.active_surveys ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                Hazırda təcili son tarix yoxdur.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Son fəaliyyətlər
            </CardTitle>
            <CardDescription>Region səviyyəsində edilən addımlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.recent_activities?.length ? (
              dashboard.recent_activities.slice(0, 6).map((activity) => (
                <div
                  key={`${activity.type}-${activity.id}-${activity.timestamp}`}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.user} •{" "}
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                      locale: az,
                    })}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                <FileText className="h-5 w-5" />
                Fəaliyyət qeydi tapılmadı.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Bildirişlər
            </CardTitle>
            <CardDescription>Regional xəbərdarlıqlar və elanlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard?.notifications?.length ? (
              dashboard.notifications.slice(0, 6).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <p className="text-sm font-medium text-foreground">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    {notification.time_ago}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                Yeni bildiriş yoxdur.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
