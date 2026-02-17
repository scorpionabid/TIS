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
  TrendingUp,
  Activity,
  CheckCircle,
  Clock
} from "lucide-react";
import { dashboardService } from "@/services/dashboard";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TeacherVerification } from "./TeacherVerification";
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

// Mock data for charts
const schoolPerformanceData = [
  { name: "Məktəb #1", score: 85 },
  { name: "Məktəb #12", score: 92 },
  { name: "Lisey #3", score: 78 },
  { name: "Gimnaziya", score: 88 },
  { name: "Məktəb #5", score: 72 },
];

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
    queryFn: async () => {
      const response = await dashboardService.getSektorAdminStats();
      // Handle potential ApiResponse wrapper
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data as SektorDashboardStats;
      }
      return response as SektorDashboardStats;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const summaryCards = useMemo(
    () => [
      {
        title: "Ümumi məktəblər",
        value: stats?.totalSchools ?? 0,
        icon: School,
        variant: "primary" as const
      },
      {
        title: "Aktiv məktəblər",
        value: stats?.activeSchools ?? 0,
        icon: CheckCircle,
        variant: "success" as const
      },
      {
        title: "Şagird sayı",
        value: stats?.totalStudents
          ? stats.totalStudents.toLocaleString()
          : "0",
        icon: GraduationCap,
        variant: "info" as const
      },
      {
        title: "Müəllim sayı",
        value: stats?.totalTeachers ?? 0,
        icon: Users,
        variant: "warning" as const
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
        color: "text-blue-600",
        bg: "bg-blue-100"
      },
      {
        key: "surveys",
        title: "Sorğular",
        description: "Aktiv sorğulara nəzarət edin.",
        href: "/my-surveys/pending",
        icon: ListChecks,
        badge: stats?.activeSurveys ?? 0,
        color: "text-emerald-600",
        bg: "bg-emerald-100"
      },
      {
        key: "assessments",
        title: "Qiymətləndirmə",
        description: "Qiymətləndirmə daxil etmə paneli.",
        href: "/assessments/entry",
        icon: GraduationCap,
        badge: 0,
        color: "text-amber-600",
        bg: "bg-amber-100"
      },
      {
        key: "attendance",
        title: "Davamiyyət",
        description: "Toplu davamiyyət hesabatları.",
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
      await refetch();
      toast.success("Panel yeniləndi");
    } catch (error) {
      toast.error("Yeniləmə zamanı xəta baş verdi");
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
    <motion.div 
      className="space-y-6 px-2 pt-0 pb-4 sm:px-3 lg:px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Sektor İdarəetmə Paneli
          </h1>
          <p className="text-sm text-muted-foreground">
            Sektorunuzdakı məktəblərin və fəaliyyətlərin ümumi baxışı.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Badge variant="secondary" className="w-fit px-3 py-1">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item, index) => (
          <motion.div key={item.title} variants={itemVariants}>
            <StatsCard {...item} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* School Performance Chart */}
        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="h-full shadow-sm border-muted/60">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Məktəb Performansı
                </CardTitle>
                <CardDescription>
                  Sektor üzrə məktəblərin orta göstəriciləri
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={schoolPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
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
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                       {schoolPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#2563eb' : entry.score >= 60 ? '#3b82f6' : '#f59e0b'} />
                        ))}
                    </Bar>
                  </BarChart>
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
              <CardDescription>Operativ əməliyyatlar</CardDescription>
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
                    className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <School className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{school.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{school.students} şagird</span>
                          <span>•</span>
                          <span>{school.teachers} müəllim</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={school.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {school.status}
                    </Badge>
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
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Son fəaliyyətlər
                </CardTitle>
                <CardDescription>
                  Sektor üzrə görülən addımlar
                </CardDescription>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.recentActivities?.length ? (
                stats.recentActivities.slice(0, 6).map((activity) => (
                  <div
                    key={`${activity.id}-${activity.type}`}
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
                         {activity.school ? `${activity.school} • ` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                       <Clock className="w-3 h-3" />
                       {getRelativeTime(activity)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                  <FileText className="h-5 w-5" />
                  Fəaliyyəti qeydi tapılmadı.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
