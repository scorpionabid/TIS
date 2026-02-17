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
  Building2,
  GraduationCap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { regionAdminService } from "@/services/regionAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { motion, Variants } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { StatsCard } from "@/components/dashboard/StatsCard";

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
        title: "Sektorlar",
        value: dashboard?.region_overview?.total_sectors ?? 0,
        icon: Building2,
        variant: "primary" as const
      },
      {
        title: "Məktəblər",
        value: dashboard?.region_overview?.total_schools ?? 0,
        icon: GraduationCap,
        variant: "info" as const
      },
      {
        title: "İstifadəçilər",
        value: dashboard?.region_overview?.total_users ?? 0,
        icon: Users,
        variant: "warning" as const
      },
      {
        title: "Tamamlanma",
        value: dashboard?.task_metrics?.completion_rate !== undefined
          ? `${dashboard.task_metrics.completion_rate}%`
          : "0%",
        icon: CheckSquare,
        variant: "success" as const
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
        color: "text-blue-600",
        bg: "bg-blue-100"
      },
      {
        key: "surveys",
        title: "Sorğular",
        description: "Aktiv regional sorğular.",
        href: "/my-surveys/pending",
        icon: ListChecks,
        badge: surveyMetrics?.active_surveys ?? 0,
        color: "text-emerald-600",
        bg: "bg-emerald-100"
      },
      {
        key: "assessments",
        title: "Qiymətləndirmə",
        description: "Qiymətləndirmə daxil etmə modulu.",
        href: "/assessments/entry",
        icon: CheckSquare,
        badge: dashboard?.task_metrics?.total_tasks ?? 0,
        color: "text-amber-600",
        bg: "bg-amber-100"
      },
      {
        key: "attendance",
        title: "Davamiyyət",
        description: "Toplu davamiyyət girişi.",
        href: "/attendance/bulk",
        icon: Users,
        badge: dashboard?.region_overview?.active_users ?? 0,
        color: "text-purple-600",
        bg: "bg-purple-100"
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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
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

  if (isLoading) {
    return (
      <div className="space-y-6 px-2 pt-0 pb-4 sm:px-3 lg:px-4">
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-32 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-80 bg-muted/40 rounded-xl animate-pulse" />
          <div className="h-80 bg-muted/40 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 px-2 pt-0 pb-4 sm:px-3 lg:px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {regionName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Regional idarəetmənin əsas göstəriciləri və qısayolları.
          </p>
        </div>
        <div className="flex gap-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item, index) => (
          <motion.div key={item.title} variants={itemVariants}>
            <StatsCard {...item} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Sector Performance Chart */}
        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Sektor Performansı
                </CardTitle>
                <CardDescription>
                  Tapşırıq tamamlanma faizləri (Top 5)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full pt-4">
                {dashboard?.sector_performance && dashboard.sector_performance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.sector_performance.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="sector_name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        interval={0}
                        angle={-10}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Bar dataKey="completion_rate" radius={[4, 4, 0, 0]}>
                        {dashboard.sector_performance.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.completion_rate > 80 ? '#10b981' : entry.completion_rate > 50 ? '#3b82f6' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                    <span>Məlumat yoxdur</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Sürətli Keçidlər</CardTitle>
              <CardDescription>Ən çox istifadə olunan modullar</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.key}
                    variant="outline"
                    className="h-auto py-4 justify-start gap-4 border-dashed hover:border-solid group transition-all"
                    onClick={() => navigate(link.href)}
                  >
                    <div className={cn("p-2 rounded-lg bg-opacity-10 transition-colors", link.bg)}>
                      <Icon className={cn("h-5 w-5", link.color)} />
                    </div>
                    <div className="flex flex-col items-start gap-0.5 flex-1 text-left">
                      <span className="font-semibold text-foreground">{link.title}</span>
                      <span className="text-xs text-muted-foreground font-normal line-clamp-1">{link.description}</span>
                    </div>
                    {link.badge > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {link.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Mühüm Tapşırıqlar
                </CardTitle>
                <CardDescription>Diqqət tələb edən işlər</CardDescription>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard?.task_metrics?.pending_tasks ? (
                <div className="flex items-center gap-4 p-4 rounded-xl border bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20">
                  <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-amber-900 dark:text-amber-100">Gözləyən tapşırıqlar</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Cəmi {dashboard.task_metrics.pending_tasks} tapşırıq icra olunmalıdır
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100" onClick={() => navigate('/tasks/assigned')}>
                    Bax
                  </Button>
                </div>
              ) : null}
              
              {dashboard?.survey_metrics?.active_surveys ? (
                <div className="flex items-center gap-4 p-4 rounded-xl border bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20">
                  <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">Aktiv sorğular</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {dashboard.survey_metrics.active_surveys} sorğu cavab gözləyir
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-blue-700 hover:text-blue-800 hover:bg-blue-100" onClick={() => navigate('/my-surveys/pending')}>
                    Bax
                  </Button>
                </div>
              ) : null}

              {!dashboard?.task_metrics?.pending_tasks && !dashboard?.survey_metrics?.active_surveys && (
                 <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
                  <div className="p-3 rounded-full bg-muted/50">
                    <CheckSquare className="h-6 w-6" />
                  </div>
                  <p>Hazırda təcili son tarixli iş yoxdur.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Son fəaliyyətlər
              </CardTitle>
              <CardDescription>Region səviyyəsində sistem hadisələri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.recent_activities?.length ? (
                  dashboard.recent_activities.slice(0, 5).map((activity, i) => (
                    <div
                      key={`${activity.type}-${activity.id}-${i}`}
                      className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
                    >
                      <div className="mt-1">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.user}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                          locale: az,
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
                    <FileText className="h-6 w-6 opacity-50" />
                    <p>Fəaliyyət qeydi tapılmadı.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
