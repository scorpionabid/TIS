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
import { useMemo, Suspense, lazy } from "react";
import { DashboardSkeleton, StatsSkeleton } from "./skeletons";
import { usePerformanceMonitor } from "@/utils/performance/hooks";

// Lazy load heavy components
const Charts = lazy(() => import("./Charts"));
const RecentActivityWidget = lazy(() => import("./RecentActivityWidget"));
const SystemHealthWidget = lazy(() => import("./SystemHealthWidget"));

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

export const SuperAdminDashboardOptimized = () => {
  // Performance monitoring
  usePerformanceMonitor('SuperAdminDashboard');

  // Single optimized API call with batching
  const { 
    data: dashboardData, 
    isLoading, 
    error,
    isStale 
  } = useQuery({
    queryKey: ['dashboard-batched'],
    queryFn: () => dashboardService.getSuperAdminDashboardBatched(),
    staleTime: 2 * 60 * 1000, // 2 minutes - reduced from 30s
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes instead of 30s
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 2, // Reduce retry attempts
  });

  // Memoized stats to prevent unnecessary re-renders
  const stats = useMemo(() => {
    if (!dashboardData?.stats) return null;
    
    const data = dashboardData.stats;
    return {
      users: data.users || { total: 0, active: 0, new_this_month: 0 },
      institutions: data.institutions || { total: 0, active: 0 },
      surveys: data.surveys || { total: 0, active: 0, completed: 0, total_responses: 0 },
      tasks: data.tasks || { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 }
    };
  }, [dashboardData?.stats]);

  const recentActivity = useMemo(() => 
    dashboardData?.recentActivity || [], 
    [dashboardData?.recentActivity]
  );

  const systemHealth = useMemo(() => 
    dashboardData?.systemHealth || { status: 'ok' }, 
    [dashboardData?.systemHealth]
  );

  // Memoized system stats to prevent re-calculation
  const systemStats = useMemo(() => [
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
  ], [systemHealth, isStale]);

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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">SuperAdmin Panel</h2>
        <p className="text-muted-foreground">
          Sistem statistikaları və son fəaliyyət
          {isLoading && <span className="ml-2 text-sm">(yenilənir...)</span>}
        </p>
      </div>

      {/* Stats Cards with fallback */}
      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* System Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {systemStats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            trend={stat.trend as "up" | "down" | "stable" | "warning"}
          />
        ))}
      </div>

      {/* Charts and Activity - Lazy loaded */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <Suspense fallback={<ChartsSkeleton />}>
            <Charts />
          </Suspense>
        </div>

        <div className="col-span-3">
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivityWidget activities={recentActivity} />
          </Suspense>
        </div>
      </div>

      {/* System Health Widget */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Suspense fallback={<ActivitySkeleton />}>
            <SystemHealthWidget health={systemHealth} />
          </Suspense>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sistem Məlumatları</CardTitle>
            <CardDescription>Son yeniləmə: {new Date().toLocaleString('az-AZ')}</CardDescription>
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
};