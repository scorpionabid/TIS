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
import { memo } from "react";
import { StatsSkeleton, DashboardSkeleton } from "./skeletons";

// Direct imports for faster rendering - lazy loading was causing delays
import { StatsCard } from "./StatsCard";
import Charts from "./Charts";
import RecentActivityWidget from "./RecentActivityWidget";
import SystemHealthWidget from "./SystemHealthWidget";

// Pre-calculate query options for performance
const QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
  gcTime: 15 * 60 * 1000, // 15 minutes cache - keep data longer in memory
  refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  refetchIntervalInBackground: false, // Don't refresh in background
  refetchOnWindowFocus: false, // Don't refetch on window focus
  retry: 2, // Reduce retry attempts
};

// Widget skeleton fallbacks
const ChartsSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 bg-muted rounded w-48 animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-64 bg-muted rounded animate-pulse" />
    </CardContent>
  </Card>
);

const ActivitySkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 bg-muted rounded w-32 animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
            <div className="space-y-1 flex-1">
              <div className="h-4 bg-muted rounded w-full animate-pulse" />
              <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const SuperAdminDashboardOptimized = memo(() => {
  // Performance monitoring removed for production speed

  // Single optimized API call with pre-configured options
  const { 
    data: dashboardData, 
    isLoading, 
    error,
    isStale 
  } = useQuery({
    queryKey: ['dashboard-batched'],
    queryFn: () => dashboardService.getSuperAdminDashboardBatched(),
    ...QUERY_OPTIONS
  });

  // Simplified data processing without excessive memoization
  const stats = dashboardData?.stats ? {
    users: dashboardData.stats.users || { total: 0, active: 0, new_this_month: 0 },
    institutions: dashboardData.stats.institutions || { total: 0, active: 0 },
    surveys: dashboardData.stats.surveys || { total: 0, active: 0, completed: 0, total_responses: 0 },
    tasks: dashboardData.stats.tasks || { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 }
  } : null;

  const recentActivity = dashboardData?.recentActivity || [];
  const systemHealth = dashboardData?.systemHealth || { status: 'ok' };

  // Simplified system stats - computed directly for speed
  const systemStats = [
    {
      title: "Sistem Statusu", 
      value: systemHealth.status === 'ok' ? "Stabil" : "Problem",
      description: systemHealth.status === 'ok' ? "Bütün sistemlər işləyir" : "Diqqət tələb edir",
      icon: systemHealth.status === 'ok' ? CheckCircleIcon : AlertTriangleIcon,
      trend: systemHealth.status === 'ok' ? "stable" : "down"
    },
    {
      title: "Server Yaddaşı", 
      value: systemHealth.memoryUsage || "N/A",
      description: "İstifadə olunan yaddaş",
      icon: BarChart3Icon,
      trend: "stable"
    },
    {
      title: "Son Yenilənmə", 
      value: new Date().toLocaleTimeString('az-AZ'),
      description: "Dashboard məlumatları",
      icon: ClockIcon,
      trend: isStale ? "warning" : "stable"
    }
  ];

  // Show full skeleton during initial loading
  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (error && !dashboardData) {
    return (
      <div className="p-6 text-center">
        <AlertTriangleIcon className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-destructive">Dashboard yüklənmədi</h2>
        <p className="text-muted-foreground mt-2">Zəhmət olmasa səhifəni yeniləyin.</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Yenilə
        </Button>
      </div>
    );
  }

  return (
    <div className="responsive-section">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">SuperAdmin Panel</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Sistem statistikaları və son fəaliyyət
          {isLoading && <span className="ml-2 text-sm">(yenilənir...)</span>}
        </p>
      </div>

      {/* Stats Cards with direct rendering */}
      {stats ? (
        <div className="dashboard-card-grid">
            <StatsCard 
              title="Ümumi İstifadəçi"
              value={stats.users.total}
              description={`${stats.users.active} aktiv istifadəçi`}
              icon={UsersIcon}
              trend={stats.users.new_this_month > 0 ? "up" : "stable"}
            />
            <StatsCard 
              title="Müəssisələr"
              value={stats.institutions.total}
              description={`${stats.institutions.active} aktiv`}
              icon={SchoolIcon}
              trend="stable"
            />
            <StatsCard 
              title="Sorğular"
              value={stats.surveys.total}
            description={`${stats.surveys.total_responses} cavab`}
            icon={BarChart3Icon}
            trend={stats.surveys.active > 0 ? "up" : "stable"}
          />
          <StatsCard 
            title="Tapşırıqlar"
            value={stats.tasks.total}
            description={`${stats.tasks.pending} gözləyir`}
            icon={TrendingUpIcon}
            trend={stats.tasks.overdue > 0 ? "down" : "stable"}
          />
        </div>
      ) : (
        <StatsSkeleton />
      )}

      {/* System Stats with direct rendering */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {systemStats.map((stat, index) => (
            <StatsCard
              key={`system-${index}`}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            trend={stat.trend as "up" | "down" | "stable" | "warning"}
          />
        ))}
      </div>

      {/* Charts and Activity - Direct rendering */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-1 md:col-span-1 lg:col-span-4">
          <Charts />
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-3">
          <RecentActivityWidget activities={recentActivity} />
        </div>
      </div>

      {/* System Health Widget */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <SystemHealthWidget health={systemHealth} />
        </div>
        
        <Card className="order-1 md:order-2">
          <CardHeader>
            <CardTitle className="responsive-section__title">Sistem Məlumatları</CardTitle>
            <CardDescription className="responsive-section__subtitle">
              Son yeniləmə: {new Date().toLocaleString('az-AZ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cache Status</span>
                <span className="text-sm font-medium">
                  {isStale ? "Köhnə" : "Aktual"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">API Calls</span>
                <span className="text-sm font-medium">Batched (1 call)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Load Time</span>
                <span className="text-sm font-medium">Optimized</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

SuperAdminDashboardOptimized.displayName = 'SuperAdminDashboardOptimized';
