import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import {
  regionOperatorService,
  RegionOperatorDashboardResponse,
  RegionOperatorDailyReportResponse,
  RegionOperatorPendingTasksResponse,
  RegionOperatorStatsResponse,
} from "@/services/regionOperator";
import { cn } from "@/lib/utils";

export const RegionOperatorDashboard = () => {
  const queryClient = useQueryClient();
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = useQuery<RegionOperatorDashboardResponse>({
    queryKey: ["regionoperator", "dashboard"],
    queryFn: () => regionOperatorService.getDashboard(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: stats, isLoading: statsLoading } =
    useQuery<RegionOperatorStatsResponse>({
      queryKey: ["regionoperator", "dashboard", "stats"],
      queryFn: () => regionOperatorService.getStats(),
      enabled: !!dashboard,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    });

  const { data: pendingTasks, isLoading: pendingLoading } =
    useQuery<RegionOperatorPendingTasksResponse>({
      queryKey: ["regionoperator", "tasks", "pending"],
      queryFn: () => regionOperatorService.getPendingTasks({ limit: 8 }),
      enabled: !!dashboard,
      staleTime: 45_000,
    });

  const { data: dailyReport } =
    useQuery<RegionOperatorDailyReportResponse>({
      queryKey: ["regionoperator", "reports", "daily"],
      queryFn: () => regionOperatorService.getDailyReports({ days: 7 }),
      enabled: !!dashboard,
      staleTime: 60_000,
    });

  const summaryCards = useMemo(() => {
    const taskStats = stats?.tasks ?? dashboard?.overview.tasks;
    const surveyStats = stats?.surveys ?? dashboard?.overview.surveys;
    const documentStats = stats?.documents ?? dashboard?.overview.documents;
    const linkStats = stats?.links ?? dashboard?.overview.links;

    return [
      {
        title: "Tapşırıqlar",
        value: taskStats?.total ?? 0,
        description: `${taskStats?.completed ?? 0} tamamlanıb`,
        icon: ClipboardList,
      },
      {
        title: "Aktiv sorğular",
        value: surveyStats?.awaiting_approval ?? 0,
        description: `${surveyStats?.total_responses ?? 0} cavab`,
        icon: CheckCircle2,
      },
      {
        title: "Sənədlər (bu ay)",
        value: documentStats?.uploaded_this_month ?? 0,
        description: `${documentStats?.total_uploaded ?? 0} toplam sənəd`,
        icon: FileText,
      },
      {
        title: "Aktiv bağlantılar",
        value: linkStats?.total_active ?? 0,
        description: `${linkStats?.recent_links?.length ?? 0} yeni bağlantı`,
        icon: LinkIcon,
      },
    ];
  }, [dashboard, stats]);

  const department = dashboard?.overview.department;
  const taskSummary = stats?.tasks ?? dashboard?.overview.tasks;
  const surveySummary = stats?.surveys ?? dashboard?.overview.surveys;
  const documentSummary = stats?.documents ?? dashboard?.overview.documents;
  const linkSummary = stats?.links ?? dashboard?.overview.links;
  const activityFeed = dashboard?.overview.recent_activity ?? [];
  const teamMembers = dashboard?.team.members ?? [];

  const totalTasksCompletedLastWeek = useMemo(() => {
    if (!dailyReport?.series) return 0;
    return dailyReport.series.reduce(
      (sum, item) => sum + (item.tasks_completed ?? 0),
      0
    );
  }, [dailyReport]);

  const totalDocumentsLastWeek = useMemo(() => {
    if (!dailyReport?.series) return 0;
    return dailyReport.series.reduce(
      (sum, item) => sum + (item.documents_uploaded ?? 0),
      0
    );
  }, [dailyReport]);

  const totalSurveyResponsesLastWeek = useMemo(() => {
    if (!dailyReport?.series) return 0;
    return dailyReport.series.reduce(
      (sum, item) => sum + (item.survey_responses_submitted ?? 0),
      0
    );
  }, [dailyReport]);

  const handleRefresh = async () => {
    await Promise.all([
      refetchDashboard(),
      queryClient.invalidateQueries({ queryKey: ["regionoperator", "dashboard", "stats"] }),
      queryClient.invalidateQueries({ queryKey: ["regionoperator", "tasks", "pending"] }),
      queryClient.invalidateQueries({ queryKey: ["regionoperator", "reports", "daily"] }),
    ]);
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="flex flex-col items-center space-y-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Dashboard məlumatları hazırlanır...</p>
        </div>
      </div>
    );
  }

  if (dashboardError || !dashboard) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Məlumat tapılmadı
          </CardTitle>
          <CardDescription>
            Dashboard məlumatlarını yükləmək mümkün olmadı. Yenidən cəhd edin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Yenilə
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Regional Operator Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {department?.institution?.name ?? "Regional idarəetmə"} ·{" "}
            {department?.name}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Yenilə
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Tapşırıqların icmalı
            </CardTitle>
            <CardDescription>
              Departament üzrə tapşırıqların statusu və yaxın müddətli prioritetlər
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricPill
                label="Gözləyən"
                value={taskSummary?.pending ?? 0}
                tone="warning"
              />
              <MetricPill
                label="İcradadır"
                value={taskSummary?.in_progress ?? 0}
                tone="info"
              />
              <MetricPill
                label="Tamamlanmış"
                value={taskSummary?.completed ?? 0}
                tone="success"
              />
              <MetricPill
                label="Gecikmiş"
                value={taskSummary?.overdue ?? 0}
                tone="danger"
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Yaxın tarixli tapşırıqlar
                </h3>
                <Badge variant="outline">
                  {pendingTasks?.total ?? taskSummary?.upcoming?.length ?? 0} tapşırıq
                </Badge>
              </div>

              <div className="space-y-3">
                {(pendingTasks?.tasks ?? taskSummary?.upcoming ?? []).length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Yaxın tarixli tapşırıq yoxdur. Təqvimdən yeni tapşırıqları izləyin.
                  </div>
                )}

                {(pendingTasks?.tasks ?? taskSummary?.upcoming ?? []).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{task.priority_label}</Badge>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {task.deadline
                              ? formatDistanceToNow(new Date(task.deadline), {
                                  addSuffix: true,
                                  locale: az,
                                })
                              : "Tarix təyin edilməyib"}
                          </span>
                          {task.is_overdue && (
                            <Badge variant="destructive">Gecikmiş</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.progress ?? 0}% tamamlanma
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Son 7 gün
            </CardTitle>
            <CardDescription>
              Gündəlik fəaliyyətin qısa icmalı
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DailyMetric
              label="Tamamlanan tapşırıqlar"
              value={totalTasksCompletedLastWeek}
              icon={CheckCircle2}
              tone="success"
            />
            <DailyMetric
              label="Yenilənən tapşırıqlar"
              value={
                dailyReport?.series?.reduce(
                  (sum, item) => sum + (item.tasks_updated ?? 0),
                  0
                ) ?? 0
              }
              icon={RefreshCw}
              tone="info"
            />
            <DailyMetric
              label="Yüklənən sənədlər"
              value={totalDocumentsLastWeek}
              icon={FileText}
              tone="secondary"
            />
            <DailyMetric
              label="Sorğu cavabları"
              value={totalSurveyResponsesLastWeek}
              icon={TrendingDown}
              tone="warning"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Departament komandası
            </CardTitle>
            <CardDescription>
              Aktiv istifadəçilər və departament üzrə heyət
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Departament üzvü tapılmadı.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İstifadəçi</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Son giriş</TableHead>
                      <TableHead>Qoşulma tarixi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.slice(0, 8).map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.full_name}
                          <div className="text-xs text-muted-foreground">
                            {member.email}
                          </div>
                        </TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>
                          <Badge
                            variant={member.is_active ? "success" : "secondary"}
                          >
                            {member.is_active ? "Aktiv" : "Passiv"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {member.last_login_at}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {member.created_at}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Aktivlik lentinin icmalı
            </CardTitle>
            <CardDescription>
              Son hadisələr və fəaliyyət qeydləri
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityFeed.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Hələlik fəaliyyət qeydi yoxdur.
              </p>
            )}

            {activityFeed.slice(0, 8).map((item, index) => (
              <div
                key={`${item.type}-${index}`}
                className="rounded-lg border bg-card p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {item.title ?? "Fəaliyyət qeydi"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.timestamp_human ?? "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className="uppercase">
                    {item.type}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="Sorğular"
          icon={CheckCircle2}
          primaryValue={surveySummary?.total_responses ?? 0}
          subtitle="Toplam cavab"
          items={[
            { label: "Tamamlanan", value: surveySummary?.completed_responses ?? 0 },
            { label: "Gözləyən", value: surveySummary?.awaiting_approval ?? 0 },
            { label: "Qaralama", value: surveySummary?.drafts ?? 0 },
          ]}
          footnote={`${surveySummary?.recent_responses?.length ?? 0} yeni cavab`}
        />
        <SummaryCard
          title="Sənədlər"
          icon={FileText}
          primaryValue={documentSummary?.uploaded_this_month ?? 0}
          subtitle="Bu ay yüklənən"
          items={[
            { label: "Toplam sənəd", value: documentSummary?.total_uploaded ?? 0 },
            {
              label: "Yeni sənəd",
              value: documentSummary?.recent_documents?.length ?? 0,
            },
          ]}
          footnote="Ən son sənədlər siyahıda"
        />
        <SummaryCard
          title="Bağlantılar"
          icon={LinkIcon}
          primaryValue={linkSummary?.total_active ?? 0}
          subtitle="Aktiv linklər"
          items={[
            {
              label: "Son əlavə olunan",
              value: linkSummary?.recent_links?.length ?? 0,
            },
          ]}
          footnote="Departament üçün əlçatan resurslar"
        />
      </div>
    </div>
  );
};

type MetricTone = "success" | "warning" | "danger" | "info" | "secondary";

const MetricPill = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: MetricTone;
}) => {
  const toneClasses: Record<MetricTone, string> = {
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-700",
    secondary: "bg-slate-100 text-slate-700",
  };

  return (
    <div className={cn("rounded-lg px-3 py-4 text-sm font-medium", toneClasses[tone])}>
      <span className="block text-xs opacity-80">{label}</span>
      <span className="mt-1 block text-lg font-semibold">{value}</span>
    </div>
  );
};

const DailyMetric = ({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: MetricTone;
}) => {
  const toneClasses: Record<MetricTone, string> = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
    info: "text-sky-600",
    secondary: "text-slate-600",
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-3">
        <span className={cn("rounded-full bg-background p-2", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({
  title,
  icon: Icon,
  primaryValue,
  subtitle,
  items,
  footnote,
}: {
  title: string;
  icon: React.ElementType;
  primaryValue: number;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
  footnote?: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        {title}
      </CardTitle>
      <CardDescription>{subtitle}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="text-3xl font-semibold">{primaryValue}</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
      {footnote && (
        <p className="text-xs text-muted-foreground border-t pt-2">
          {footnote}
        </p>
      )}
    </CardContent>
  </Card>
);
