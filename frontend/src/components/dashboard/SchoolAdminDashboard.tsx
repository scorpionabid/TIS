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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  ListChecks,
  RefreshCw,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  schoolAdminKeys,
  schoolAdminService,
  SchoolActivity,
  SchoolDeadline,
  SchoolDashboardStats,
} from "@/services/schoolAdmin";

export const SchoolAdminDashboard = ({ className }: { className?: string } = {}) => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<SchoolDashboardStats>({
    queryKey: schoolAdminKeys.dashboardStats(),
    queryFn: () => schoolAdminService.getDashboardStats(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: activities,
    isLoading: activitiesLoading,
    refetch: refetchActivities,
  } = useQuery<SchoolActivity[]>({
    queryKey: schoolAdminKeys.activities(),
    queryFn: () => schoolAdminService.getRecentActivities(6),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: deadlines,
    isLoading: deadlinesLoading,
    refetch: refetchDeadlines,
  } = useQuery<SchoolDeadline[]>({
    queryKey: schoolAdminKeys.deadlines(),
    queryFn: () => schoolAdminService.getUpcomingDeadlines(6),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const summaryCards = useMemo(
    () => [
      {
        label: "Aktiv tapşırıqlar",
        value: stats?.active_tasks ?? 0,
      },
      {
        label: "Gözləyən sorğular",
        value: stats?.pending_surveys ?? 0,
      },
      {
        label: "Qiymətləndirmə gözləyir",
        value: stats?.pending_assessments ?? 0,
      },
      {
        label: "Yeni sənədlər",
        value: stats?.new_documents_count ?? 0,
      },
      {
        label: "Bugünkü davamiyyət",
        value:
          stats?.today_attendance_rate !== undefined
            ? `${stats.today_attendance_rate}%`
            : "—",
      },
      {
        label: "Təcili prioritetlər",
        value: stats?.today_priority_items ?? 0,
      },
    ],
    [stats]
  );

  const quickLinks = useMemo(
    () => [
      {
        key: "tasks",
        title: "Tapşırıqlar",
        description: "Komandanıza təyin olunan tapşırıqları idarə edin.",
        href: "/tasks/assigned",
        icon: ClipboardList,
        badge: stats?.active_tasks ?? 0,
      },
      {
        key: "surveys",
        title: "Sorğular",
        description: "Sizə göndərilən sorğuları tamamlayın.",
        href: "/my-surveys/pending",
        icon: ListChecks,
        badge: stats?.pending_surveys ?? 0,
      },
      {
        key: "assessments",
        title: "Qiymətləndirmə",
        description: "Şagird nəticələrini daxil edin.",
        href: "/assessments/entry",
        icon: CheckSquare,
        badge: stats?.pending_assessments ?? 0,
      },
      {
        key: "attendance",
        title: "Toplu davamiyyət",
        description: "Sinif davamiyyətini sürətli daxil edin.",
        href: "/attendance/bulk",
        icon: Users,
        badge: stats?.today_priority_items ?? 0,
      },
      {
        key: "resources",
        title: "Resurslarım",
        description: "Paylaşılan sənədlərə və qovluqlara baxın.",
        href: "/my-resources",
        icon: BookOpen,
        badge: stats?.new_documents_count ?? 0,
      },
    ],
    [stats]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchStats(), refetchActivities(), refetchDeadlines()]);
      toast.success("Dashboard yeniləndi");
    } catch (error) {
      toast.error("Yeniləmə zamanı xəta baş verdi");
    } finally {
      setRefreshing(false);
    }
  };

  const deadlineTone = (priority: SchoolDeadline["priority"]) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 px-2 pt-0 pb-4 sm:px-3 lg:px-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Məktəb İdarəetməsi
          </h1>
          <p className="text-sm text-muted-foreground">
            Əsas iş axınlarını bir mərkəzdən idarə edin.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 sm:w-auto"
          onClick={handleRefresh}
          disabled={refreshing || statsLoading}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              (refreshing || statsLoading) && "animate-spin"
            )}
          />
          Yenilə
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card/80 px-3 py-3"
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
                Yaxın son tarixlər
              </CardTitle>
              <CardDescription>
                Növbəti həftə üçün vacib işlər
              </CardDescription>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlinesLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-12 animate-pulse rounded-lg bg-muted/40"
                  />
                ))}
              </div>
            ) : deadlines && deadlines.length > 0 ? (
              deadlines.slice(0, 5).map((deadline) => (
                <div
                  key={deadline.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {deadline.title}
                    </p>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        deadlineTone(deadline.priority)
                      )}
                    >
                      {deadline.due_date
                        ? formatDistanceToNow(new Date(deadline.due_date), {
                            addSuffix: true,
                            locale: az,
                          })
                        : "Tarix yoxdur"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Status: {deadline.status === "pending" ? "Gözləyir" : deadline.status === "overdue" ? "Gecikmiş" : "Tamamlanıb"}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Yaxınlaşan son tarix yoxdur.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Son fəaliyyətlər
              </CardTitle>
              <CardDescription>
                Məktəb komandası tərəfindən görülən addımlar
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activitiesLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-12 animate-pulse rounded-lg bg-muted/40"
                  />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              activities.slice(0, 6).map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.user_name} •{" "}
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: az,
                    })}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Hələ fəaliyyət yoxdur.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
