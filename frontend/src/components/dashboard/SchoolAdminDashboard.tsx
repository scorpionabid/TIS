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
  GraduationCap,
  TrendingUp,
  Clock
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
import { motion, Variants } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { StatsCard } from "@/components/dashboard/StatsCard";

// Mock data for charts
const attendanceData = [
  { day: "B.e", rate: 92 },
  { day: "Ç.a", rate: 94 },
  { day: "Çər", rate: 91 },
  { day: "C.a", rate: 95 },
  { day: "Cüm", rate: 89 },
];

const performanceData = [
  { subject: "Riyaziyyat", score: 85 },
  { subject: "Ana dili", score: 92 },
  { subject: "Xarici dil", score: 88 },
  { subject: "Tarix", score: 76 },
  { subject: "Fizika", score: 82 },
];

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
        title: "Davamiyyət (Bu gün)",
        value: stats?.today_attendance_rate !== undefined
            ? `${stats.today_attendance_rate}%`
            : "0%",
        icon: Users,
        variant: "primary" as const
      },
      {
        title: "Aktiv tapşırıqlar",
        value: stats?.active_tasks ?? 0,
        icon: ClipboardList,
        variant: "warning" as const
      },
      {
        title: "Gözləyən sorğular",
        value: stats?.pending_surveys ?? 0,
        icon: ListChecks,
        variant: "info" as const
      },
      {
        title: "Təcili prioritetlər",
        value: stats?.today_priority_items ?? 0,
        icon: AlertCircle,
        variant: "destructive" as const
      },
    ],
    [stats]
  );

  const quickLinks = useMemo(
    () => [
      {
        key: "tasks",
        title: "Tapşırıqlar",
        description: "Komanda tapşırıqlarını idarə et.",
        href: "/tasks/assigned",
        icon: ClipboardList,
        badge: stats?.active_tasks ?? 0,
        color: "text-blue-600",
        bg: "bg-blue-100"
      },
      {
        key: "surveys",
        title: "Sorğular",
        description: "Sorğuları tamamla.",
        href: "/my-surveys/pending",
        icon: ListChecks,
        badge: stats?.pending_surveys ?? 0,
        color: "text-emerald-600",
        bg: "bg-emerald-100"
      },
      {
        key: "assessments",
        title: "Qiymətləndirmə",
        description: "Şagird nəticələrini daxil et.",
        href: "/assessments/entry",
        icon: CheckSquare,
        badge: stats?.pending_assessments ?? 0,
        color: "text-amber-600",
        bg: "bg-amber-100"
      },
      {
        key: "attendance",
        title: "Toplu davamiyyət",
        description: "Sinif davamiyyətini daxil et.",
        href: "/attendance/bulk",
        icon: Users,
        badge: 0,
        color: "text-purple-600",
        bg: "bg-purple-100"
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
        return "text-destructive bg-destructive/10 border-destructive/20";
      case "medium":
        return "text-amber-600 bg-amber-100 border-amber-200";
      default:
        return "text-blue-600 bg-blue-100 border-blue-200";
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

  if (statsLoading) {
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
            Məktəb İdarəetməsi
          </h1>
          <p className="text-sm text-muted-foreground">
            Məktəb üzrə əsas göstəricilər və gündəlik əməliyyatlar.
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item, index) => (
          <motion.div key={item.title} variants={itemVariants}>
            <StatsCard {...item} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Attendance Chart */}
        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="h-full shadow-sm border-muted/60">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Həftəlik Davamiyyət
                </CardTitle>
                <CardDescription>
                  Son 5 gün üzrə şagird davamiyyəti
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceData}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      domain={[80, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#2563eb" 
                      fillOpacity={1} 
                      fill="url(#colorRate)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Sürətli Keçidlər</CardTitle>
              <CardDescription>Komanda idarəetməsi</CardDescription>
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
                  Yaxın son tarixlər
                </CardTitle>
                <CardDescription>
                  Növbəti həftə üçün vacib işlər
                </CardDescription>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {(!deadlines || deadlines.length === 0) && (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Yaxınlaşan son tarix yoxdur.
                  </p>
                </div>
              )}
              {deadlines?.slice(0, 5).map((deadline) => (
                <div
                  key={deadline.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {deadline.title}
                    </p>
                    <Badge variant="outline" className={cn("text-xs font-medium border-0", deadlineTone(deadline.priority))}>
                      {deadline.due_date
                        ? formatDistanceToNow(new Date(deadline.due_date), {
                            addSuffix: true,
                            locale: az,
                          })
                        : "Tarix yoxdur"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                     <Clock className="w-3 h-3 text-muted-foreground" />
                     <p className="text-xs text-muted-foreground">
                      Status: {deadline.status === "pending" ? "Gözləyir" : deadline.status === "overdue" ? "Gecikmiş" : "Tamamlanıb"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Son fəaliyyətlər
                </CardTitle>
                <CardDescription>
                  Məktəb komandası tərəfindən görülən addımlar
                </CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {(!activities || activities.length === 0) && (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Hələ fəaliyyət yoxdur.
                  </p>
                </div>
              )}
              {activities?.slice(0, 6).map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="mt-1">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user_name}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: az,
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
