import { StatsCard } from "./StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UsersIcon, 
  SchoolIcon, 
  BarChart3Icon, 
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard";
import { useEffect, useState } from "react";

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getSuperAdminDashboard(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activityData } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => dashboardService.getRecentActivity(5),
    refetchInterval: 60000, // Refresh every minute
  });

  useEffect(() => {
    if (dashboardData) {
      // Use real data from backend API - no mock data
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
  const systemStats = [
    {
      title: "Ümumi istifadəçilər",
      value: stats?.users?.total?.toLocaleString() || "0",
      change: { value: 12, type: "increase" as const },
      icon: UsersIcon,
      variant: "primary" as const
    },
    {
      title: "Təhsil müəssisələri",
      value: stats?.institutions?.total?.toLocaleString() || "0",
      change: { value: 3, type: "increase" as const },
      icon: SchoolIcon,
      variant: "success" as const
    },
    {
      title: "Aktiv sorğular",
      value: stats?.surveys?.active?.toLocaleString() || "0",
      change: { value: 8, type: "decrease" as const },
      icon: BarChart3Icon,
      variant: "warning" as const
    },
    {
      title: "Sistem performansı",
      value: "99.2%",
      change: { value: 0.5, type: "increase" as const },
      icon: TrendingUpIcon,
      variant: "success" as const
    }
  ];

  // Use dynamic data if available, fallback to static data
  const recentActivities = recentActivity.length > 0 ? recentActivity.map(activity => ({
    title: activity.user?.name || activity.title,
    description: activity.description,
    time: new Date(activity.created_at).toLocaleDateString('az-AZ', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    status: activity.type.includes('completed') ? 'completed' : 
           activity.type.includes('urgent') ? 'urgent' : 'active'
  })) : [
    {
      title: "Şəki-Zaqatala Regional İdarəsi",
      description: "Yeni aylıq statistik sorğu yaradıldı",
      time: "15 dəqiqə əvvəl",
      status: "active"
    },
    {
      title: "Bakı Şəhər Təhsil İdarəsi", 
      description: "312 məktəbdən cavab alındı",
      time: "1 saat əvvəl",
      status: "completed"
    },
    {
      title: "Sumqayıt Regional İdarəsi",
      description: "Təcili tapşırıq yaradıldı",
      time: "2 saat əvvəl", 
      status: "urgent"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-4 w-4 text-success" />;
      case "urgent":
        return <AlertTriangleIcon className="h-4 w-4 text-warning" />;
      default:
        return <ClockIcon className="h-4 w-4 text-primary" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-32 bg-surface rounded-lg border border-border-light animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-surface rounded-lg border border-border-light animate-pulse" />
          <div className="h-64 bg-surface rounded-lg border border-border-light animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {systemStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activities */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Son fəaliyyətlər</CardTitle>
            <CardDescription>
              Sistemdə ən son baş verən əməliyyatlar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                {getStatusIcon(activity.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              Bütün fəaliyyətləri gör
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Tez əməliyyatlar</CardTitle>
            <CardDescription>
              Ən çox istifadə olunan funksiyalar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="hero" className="w-full justify-start" size="lg">
              <UsersIcon className="mr-3 h-5 w-5" />
              Yeni region əlavə et
            </Button>
            <Button variant="accent" className="w-full justify-start" size="lg">
              <BarChart3Icon className="mr-3 h-5 w-5" />
              Sistem hesabatı yarat
            </Button>
            <Button variant="outline" className="w-full justify-start" size="lg">
              <SchoolIcon className="mr-3 h-5 w-5" />
              Müəssisə statistikası
            </Button>
            <Button variant="outline" className="w-full justify-start" size="lg">
              <TrendingUpIcon className="mr-3 h-5 w-5" />
              Performans analizi
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Regional Overview */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading">Regional ümumi görünüş</CardTitle>
          <CardDescription>
            Regionlara görə əsas göstəricilər
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[
              { name: "Bakı", schools: 156, users: 342 },
              { name: "Şəki-Zaqatala", schools: 89, users: 167 },
              { name: "Sumqayıt", schools: 67, users: 134 },
              { name: "Gəncə", schools: 98, users: 178 },
              { name: "Lənkəran", schools: 76, users: 142 }
            ].map((region, index) => (
              <div key={index} className="p-4 bg-surface rounded-lg border border-border-light">
                <h4 className="font-semibold text-foreground">{region.name}</h4>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {region.schools} məktəb
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {region.users} istifadəçi
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};