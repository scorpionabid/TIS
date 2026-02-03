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
  ClipboardList,
  FileText,
  GraduationCap,
  ListChecks,
  RefreshCw,
  School,
  Users,
} from "lucide-react";
import { dashboardService } from "@/services/dashboard";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TeacherVerification } from "./TeacherVerification";

const isValidDateValue = (value?: string) => {
  if (!value) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
};

const getRelativeTime = (activity: SektorDashboardStats["recentActivities"][number]) => {
  const timestampCandidate = activity.created_at ?? activity.time;
  if (timestampCandidate && isValidDateValue(timestampCandidate)) {
    return formatDistanceToNow(new Date(timestampCandidate), {
      addSuffix: true,
      locale: az,
    });
  }
  return activity.time || "—";
};

interface SektorDashboardStats {
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
  totalTeachers: number;
  sektorUsers: number;
  activeSurveys: number;
  pendingReports: number;
  sektorInfo: {
    name: string;
    region: string;
    establishedYear: string;
  };
  recentActivities: Array<{
    id: string | number;
    type: string;
    title: string;
    description: string;
    time: string;
    status: string;
    school?: string;
    created_at?: string;
  }>;
  schoolsList: Array<{
    id: number;
    name: string;
    type: string;
    students: number;
    teachers: number;
    status: string;
  }>;
}

export const SektorAdminDashboard = () => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: stats,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<SektorDashboardStats>({
    queryKey: ["sektoradmin-dashboard"],
    queryFn: () => dashboardService.getSektorAdminStats(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const summaryCards = useMemo(
    () => [
      {
        label: "Ümumi məktəblər",
        value: stats?.totalSchools ?? 0,
      },
      {
        label: "Aktiv məktəblər",
        value: stats?.activeSchools ?? 0,
      },
      {
        label: "Şagird sayı",
        value: stats?.totalStudents
          ? stats.totalStudents.toLocaleString()
          : "0",
      },
      {
        label: "Müəllim sayı",
        value: stats?.totalTeachers ?? 0,
      },
      {
        label: "Sektor istifadəçiləri",
        value: stats?.sektorUsers ?? 0,
      },
      {
        label: "Aktiv sorğular",
        value: stats?.activeSurveys ?? 0,
      },
      {
        label: "Gözləyən hesabatlar",
        value: stats?.pendingReports ?? 0,
      },
    ],
    [stats]
  );

  const quickLinks = useMemo(
    () => [
      {
        key: "tasks",
        title: "Tapşırıqlar",
        description: "Sektor üzrə tapşırıqları izləyin.",
        href: "/tasks/assigned",
        icon: ClipboardList,
        badge: stats?.pendingReports ?? 0,
      },
      {
        key: "surveys",
        title: "Sorğular",
        description: "Aktiv sorğulara nəzarət edin.",
        href: "/my-surveys/pending",
        icon: ListChecks,
        badge: stats?.activeSurveys ?? 0,
      },
      {
        key: "assessments",
        title: "Qiymətləndirmə",
        description: "Qiymətləndirmə daxil etmə paneli.",
        href: "/assessments/entry",
        icon: GraduationCap,
        badge: stats?.totalStudents ?? 0,
      },
      {
        key: "attendance",
        title: "Davamiyyət",
        description: "Toplu davamiyyət hesabatları.",
        href: "/attendance/bulk",
        icon: Users,
        badge: stats?.totalTeachers ?? 0,
      },
      {
        key: "resources",
        title: "Resurslar",
        description: "Sektor sənədləri və qovluqları.",
        href: "/my-resources",
        icon: BookOpen,
        badge: stats?.pendingReports ?? 0,
      },
      {
        key: "approvals",
        title: "Təsdiqlər",
        description: "Sektor üzrə təsdiq prosesləri.",
        href: "/approvals",
        icon: FileText,
        badge: stats?.pendingReports ?? 0,
      },
    ],
    [stats]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success("Panel yeniləndi");
    } catch (error) {
      toast.error("Yeniləmə zamanı xəta baş verdi");
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Panel məlumatları yüklənir...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Məlumat tapılmadı
            </CardTitle>
            <CardDescription>
              Sektor dashboardu üçün məlumat əldə edilə bilmədi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline">
              Yenidən cəhd et
            </Button>
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
            Sektor İdarəetmə Paneli
          </h1>
          <p className="text-sm text-muted-foreground">
            Sektorunuzdakı məktəblərin və fəaliyyətlərin ümumi baxışı.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Badge variant="secondary" className="w-fit">
            {stats.sektorInfo.region} • {stats.sektorInfo.name}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefresh}
            disabled={refreshing || isFetching}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                (refreshing || isFetching) && "animate-spin"
              )}
            />
            Yenilə
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card/85 px-3 py-3"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </span>
            <span className="text-base font-semibold text-foreground">
              {card.value}
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
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Məktəblərin icmalı
            </CardTitle>
            <CardDescription>Sektor daxilində əsas məktəblər</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.schoolsList?.length ? (
              stats.schoolsList.slice(0, 6).map((school) => (
                <div
                  key={school.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{school.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {school.status}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Şagird: {school.students}</span>
                    <span>Müəllim: {school.teachers}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                <School className="h-5 w-5" />
                Məktəb məlumatı tapılmadı.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Son fəaliyyətlər
            </CardTitle>
            <CardDescription>Sektor üzrə görülən addımlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentActivities?.length ? (
              stats.recentActivities.slice(0, 6).map((activity) => (
                <div
                  key={`${activity.id}-${activity.type}`}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.school ? `${activity.school} • ` : ""}
                    {getRelativeTime(activity)}
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
      </div>
    </div>
  );
};
