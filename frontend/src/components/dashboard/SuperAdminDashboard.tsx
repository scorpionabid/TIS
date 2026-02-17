import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  UsersIcon, 
  SchoolIcon, 
  BarChart3Icon, 
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ActivityIcon,
  ServerIcon,
  ShieldCheckIcon
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

import { StatsCard } from "./StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dashboardService } from "@/services/dashboard";
import { SurveyDashboardWidget } from "./SurveyDashboardWidget";
import { useLayout } from "@/contexts/LayoutContext";
import { cn } from "@/lib/utils";

// Types
interface DashboardStats {
  users: { total: number; active: number; new_this_month: number };
  institutions: { total: number; active: number };
  surveys: { total: number; active: number; completed: number; total_responses: number };
  tasks: { total: number; pending: number; in_progress: number; completed: number; overdue: number };
}

interface ActivityItem {
  user?: { name: string };
  title: string;
  description: string;
  created_at: string;
  type: string;
  time?: string; // For mock data compatibility
}

// Mock data for charts (until API supports them)
const healthData = [
  { time: "09:00", latency: 45, errors: 0 },
  { time: "10:00", latency: 120, errors: 2 },
  { time: "11:00", latency: 85, errors: 0 },
  { time: "12:00", latency: 65, errors: 0 },
  { time: "13:00", latency: 55, errors: 0 },
  { time: "14:00", latency: 140, errors: 5 },
  { time: "15:00", latency: 90, errors: 1 },
];

const registrationData = [
  { date: "01 Yan", users: 12, schools: 1 },
  { date: "05 Yan", users: 45, schools: 2 },
  { date: "10 Yan", users: 89, schools: 4 },
  { date: "15 Yan", users: 156, schools: 5 },
  { date: "20 Yan", users: 230, schools: 8 },
  { date: "25 Yan", users: 345, schools: 12 },
  { date: "30 Yan", users: 489, schools: 15 },
];

export const SuperAdminDashboard = () => {
  const { isMobile } = useLayout();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const { data: dashboardData, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getSuperAdminDashboard() as Promise<DashboardStats>,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const { data: activityData } = useQuery<ActivityItem[]>({
    queryKey: ['recent-activity'],
    queryFn: () => dashboardService.getRecentActivity(8),
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (dashboardData) {
      setStats({
        users: dashboardData.users || { total: 0, active: 0, new_this_month: 0 },
        institutions: dashboardData.institutions || { total: 0, active: 0 },
        surveys: dashboardData.surveys || { total: 0, active: 0, completed: 0, total_responses: 0 },
        tasks: dashboardData.tasks || { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 }
      });
    }
  }, [dashboardData]);

  useEffect(() => {
    if (activityData) {
      setRecentActivity(activityData);
    }
  }, [activityData]);

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

  const systemStats = [
    {
      title: "Ümumi istifadəçilər",
      value: stats?.users?.total?.toLocaleString() || "0",
      icon: UsersIcon,
      variant: "primary" as const
    },
    {
      title: "Təhsil müəssisələri",
      value: stats?.institutions?.total?.toLocaleString() || "0",
      icon: SchoolIcon,
      variant: "success" as const
    },
    {
      title: "Aktiv sorğular",
      value: stats?.surveys?.active?.toLocaleString() || "0",
      icon: BarChart3Icon,
      variant: "warning" as const
    },
    {
      title: "Sistem performansı",
      value: "99.2%",
      icon: ActivityIcon,
      variant: "info" as const
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-32 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-96 bg-muted/40 rounded-xl animate-pulse" />
          <div className="h-96 bg-muted/40 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Sistem İdarəetmə Paneli
          </h1>
          <p className="text-muted-foreground mt-1">
            ATİS ekosisteminin ümumi vəziyyəti və idarəetmə mərkəzi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
            <ServerIcon className="w-3 h-3" />
            Bütün sistemlər aktivdir
          </Badge>
          <Badge variant="outline" className="px-3 py-1 gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600">
            <ShieldCheckIcon className="w-3 h-3" />
            Təhlükəsiz
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={cn(
        "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
        isMobile && "grid-cols-1"
      )}>
        {systemStats.map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Main Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* System Health Chart */}
        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="w-5 h-5 text-primary" />
                Sistem Sağlamlığı
              </CardTitle>
              <CardDescription>Server cavab müddəti və xətalar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthData}>
                    <defs>
                      <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
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
                      dataKey="latency" 
                      stroke="#2563eb" 
                      fillOpacity={1} 
                      fill="url(#colorLatency)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Registration Trend Chart */}
        <motion.div variants={itemVariants}>
          <Card className="h-full shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5 text-emerald-600" />
                Qeydiyyat Dinamikası
              </CardTitle>
              <CardDescription>Son 30 gün üzrə yeni istifadəçi və məktəblər</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={registrationData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="schools" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Survey Widget */}
      <motion.div variants={itemVariants}>
        <SurveyDashboardWidget variant="default" />
      </motion.div>

      {/* Activity & Actions Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activities Timeline */}
        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-indigo-600" />
                Son Fəaliyyətlər
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-muted pl-6 space-y-6">
                {(recentActivity.length > 0 ? recentActivity : [
                  { title: "Sistem", description: "Məlumat bazası yeniləndi", time: "10:00", type: "system" },
                  { title: "Bakı Şəhəri", description: "12 yeni məktəb əlavə edildi", time: "09:45", type: "create" },
                  { title: "Təhlükəsizlik", description: "Login cəhdləri bloklandı", time: "09:30", type: "security" }
                ]).map((activity, idx) => (
                  <div key={idx} className="relative">
                    <span className={cn(
                      "absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                      activity.type === 'security' ? "bg-red-100 text-red-600" : 
                      activity.type === 'create' ? "bg-emerald-100 text-emerald-600" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      {activity.type === 'security' ? <AlertTriangleIcon className="w-3 h-3" /> :
                       activity.type === 'create' ? <CheckCircleIcon className="w-3 h-3" /> :
                       <ActivityIcon className="w-3 h-3" />}
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <span className="text-xs text-muted-foreground">{activity.time ? activity.time : new Date(activity.created_at).toLocaleTimeString('az-AZ', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm border-muted/60 h-full">
            <CardHeader>
              <CardTitle>Sürətli Əməliyyatlar</CardTitle>
              <CardDescription>Ən çox istifadə olunanlar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start h-12 gap-3 hover:bg-primary/5 hover:text-primary border-dashed">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-start">İstifadəçi əlavə et</div>
                  <div className="text-xs text-muted-foreground font-normal">Yeni administrator yarat</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 gap-3 hover:bg-emerald-500/5 hover:text-emerald-600 border-dashed">
                <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600">
                  <BarChart3Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-start">Hesabat yarat</div>
                  <div className="text-xs text-muted-foreground font-normal">PDF və ya Excel</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 gap-3 hover:bg-amber-500/5 hover:text-amber-600 border-dashed">
                <div className="p-2 rounded-full bg-amber-500/10 text-amber-600">
                  <ServerIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-start">Sistem Loqları</div>
                  <div className="text-xs text-muted-foreground font-normal">Xətaları izlə</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};