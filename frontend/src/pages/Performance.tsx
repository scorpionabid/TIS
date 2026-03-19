import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MonitorIcon, Activity, Cpu, HardDrive, Wifi, AlertTriangle, TrendingUp, Database, Server } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { performanceService } from "@/services/performanceService";

// ── helpers ──────────────────────────────────────────────────────────────────

function getStatusLabel(status: 'healthy' | 'warning' | 'critical' | 'degraded' | string): string {
  switch (status) {
    case 'healthy':  return 'Əlçatan';
    case 'warning':  return 'Xəbərdarlıq';
    case 'critical': return 'Kritik';
    case 'degraded': return 'Zəifləmiş';
    default:         return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':  return 'text-green-500';
    case 'warning':  return 'text-orange-500';
    case 'critical': return 'text-red-500';
    case 'degraded': return 'text-orange-500';
    default:         return 'text-muted-foreground';
  }
}

function getResponseLabel(ms: number): string {
  if (ms < 200) return 'Əla';
  if (ms < 500) return 'Yaxşı';
  if (ms < 1000) return 'Orta';
  return 'Zəif';
}

function getResponseColor(ms: number): string {
  if (ms < 200) return 'text-green-500';
  if (ms < 500) return 'text-blue-500';
  if (ms < 1000) return 'text-orange-500';
  return 'text-red-500';
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}g ${hours % 24}s`;
  return `${hours}s`;
}

// ── skeleton helpers ──────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Performance() {
  const { currentUser } = useAuth();

  const hasAccess =
    !!currentUser && ['superadmin', 'regionadmin'].includes(currentUser.role);

  // Hooks must always be called — conditionally disable queries when access is denied
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: () => performanceService.getMetrics(),
    refetchInterval: 30000,
    retry: 2,
    enabled: hasAccess,
  });

  const { data: health, isLoading: healthLoading, isError: healthError } = useQuery({
    queryKey: ['performance-health'],
    queryFn: () => performanceService.getHealth(),
    refetchInterval: 60000,
    retry: 2,
    enabled: hasAccess,
  });

  // Security check — only SuperAdmin and RegionAdmin can access system performance monitoring
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız SuperAdmin və RegionAdmin istifadəçiləri daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  const systemStatus = health?.status ?? metrics?.system_status ?? 'healthy';
  const memoryPercent =
    metrics && metrics.memory_total > 0
      ? Math.round((metrics.memory_usage / metrics.memory_total) * 100)
      : 0;
  const memoryUsedGB = metrics ? (metrics.memory_usage / 1024).toFixed(1) : '--';
  const memoryTotalGB = metrics ? (metrics.memory_total / 1024).toFixed(0) : '--';

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performans Monitorinqi</h1>
          <p className="text-muted-foreground">Sistem performansının real vaxt izlənməsi</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="realtime">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Canlı</SelectItem>
              <SelectItem value="1h">Son 1 saat</SelectItem>
              <SelectItem value="24h">Son 24 saat</SelectItem>
              <SelectItem value="7d">Son 7 gün</SelectItem>
            </SelectContent>
          </Select>
          {currentUser?.role === 'superadmin' && (
            <Button>
              Hesabat Al
            </Button>
          )}
        </div>
      </div>

      {/* API error banner */}
      {(metricsError || healthError) && (
        <div className="flex items-center gap-2 p-3 border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Performans məlumatları yüklənərkən xəta baş verdi. Son məlumatlar göstərilir.</span>
        </div>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sistem statusu */}
        {healthLoading ? (
          <StatCardSkeleton />
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sistem Statusu</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        systemStatus === 'healthy'
                          ? 'bg-green-500'
                          : systemStatus === 'critical'
                          ? 'bg-red-500'
                          : 'bg-orange-500'
                      }`}
                    />
                    <span className="text-sm font-medium">{getStatusLabel(systemStatus)}</span>
                  </div>
                </div>
                <Server className={`h-8 w-8 ${getStatusColor(systemStatus)}`} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Response vaxtı */}
        {metricsLoading ? (
          <StatCardSkeleton />
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response vaxtı</p>
                  <p className="text-2xl font-bold">
                    {metrics ? `${metrics.response_time_ms}ms` : '--'}
                  </p>
                  {metrics && (
                    <p className={`text-xs ${getResponseColor(metrics.response_time_ms)}`}>
                      {getResponseLabel(metrics.response_time_ms)}
                    </p>
                  )}
                </div>
                <Activity
                  className={`h-8 w-8 ${metrics ? getResponseColor(metrics.response_time_ms) : 'text-muted-foreground'}`}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aktiv bağlantılar */}
        {metricsLoading ? (
          <StatCardSkeleton />
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aktiv bağlantılar</p>
                  <p className="text-2xl font-bold">
                    {metrics ? metrics.active_connections.toLocaleString() : '--'}
                  </p>
                  <p className="text-xs text-blue-500">Normal</p>
                </div>
                <Wifi className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queue / pending jobs */}
        {healthLoading ? (
          <StatCardSkeleton />
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Növbə işləri</p>
                  <p className="text-2xl font-bold">
                    {health ? health.queue.pending_jobs : '--'}
                  </p>
                  <p
                    className={`text-xs ${
                      !health || health.queue.pending_jobs === 0
                        ? 'text-green-500'
                        : health.queue.pending_jobs < 10
                        ? 'text-orange-500'
                        : 'text-red-500'
                    }`}
                  >
                    {!health
                      ? ''
                      : health.queue.pending_jobs === 0
                      ? 'Boş'
                      : 'Gözləyir'}
                  </p>
                </div>
                <AlertTriangle
                  className={`h-8 w-8 ${
                    !health || health.queue.pending_jobs === 0
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              CPU İstifadəsi
            </CardTitle>
            <CardDescription>Prozessor yükü monitorinqi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metricsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Ümumi CPU</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics ? `${metrics.cpu_usage}%` : '--'}
                    </span>
                  </div>
                  <Progress value={metrics?.cpu_usage ?? 0} className="h-2" />
                </div>
                {/* Database connection status as a secondary metric */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database</span>
                    <span className="text-sm text-muted-foreground">
                      {health
                        ? `${health.database.response_ms}ms — ${health.database.status}`
                        : '--'}
                    </span>
                  </div>
                  <Progress
                    value={
                      health
                        ? Math.min(Math.round((health.database.response_ms / 500) * 100), 100)
                        : 0
                    }
                    className="h-2"
                  />
                </div>
                {/* Cache status */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cache Hit Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics ? `${metrics.cache_hit_rate}%` : '--'}
                    </span>
                  </div>
                  <Progress value={metrics?.cache_hit_rate ?? 0} className="h-2" />
                </div>
                {/* Uptime */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Uptime</span>
                  <span className="text-sm font-medium">
                    {metrics ? formatUptime(metrics.uptime_seconds) : '--'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Yaddaş İstifadəsi
            </CardTitle>
            <CardDescription>RAM istifadəsi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metricsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">RAM</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics
                        ? `${memoryUsedGB}MB / ${memoryTotalGB}MB (${memoryPercent}%)`
                        : '--'}
                    </span>
                  </div>
                  <Progress value={memoryPercent} className="h-2" />
                </div>
                {/* Database health */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database Status</span>
                    <span
                      className={`text-sm font-medium ${getStatusColor(health?.database.status ?? '')}`}
                    >
                      {health ? getStatusLabel(health.database.status) : '--'}
                    </span>
                  </div>
                  <Progress
                    value={health?.database.status === 'healthy' ? 100 : 30}
                    className="h-2"
                  />
                </div>
                {/* Cache connection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cache (Redis)</span>
                    <span
                      className={`text-sm font-medium ${
                        health?.cache.connected ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {health
                        ? health.cache.connected
                          ? 'Qoşulub'
                          : 'Qoşulmayıb'
                        : '--'}
                    </span>
                  </div>
                  <Progress
                    value={health?.cache.connected ? 100 : 0}
                    className="h-2"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performans Məlumatları
          </CardTitle>
          <CardDescription>Detallı performans göstəriciləri</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* API Performance */}
            <div className="space-y-3">
              <h4 className="font-medium">API Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Orta response vaxtı</span>
                  {metricsLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <Badge variant="outline">
                      {metrics ? `${metrics.response_time_ms}ms` : '--'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Aktiv bağlantılar</span>
                  {metricsLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <Badge variant="outline">
                      {metrics ? metrics.active_connections.toLocaleString() : '--'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Sistem statusu</span>
                  {metricsLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <Badge
                      className={
                        systemStatus === 'healthy'
                          ? 'bg-green-500'
                          : systemStatus === 'critical'
                          ? 'bg-red-500'
                          : 'bg-orange-500'
                      }
                    >
                      {getStatusLabel(systemStatus)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Database Performance */}
            <div className="space-y-3">
              <h4 className="font-medium">Database Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Response vaxtı</span>
                  {healthLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <Badge variant="outline">
                      {health ? `${health.database.response_ms}ms` : '--'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Status</span>
                  {healthLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <Badge
                      className={
                        health?.database.status === 'healthy'
                          ? 'bg-green-500'
                          : 'bg-orange-500'
                      }
                    >
                      {health ? getStatusLabel(health.database.status) : '--'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Növbə işləri</span>
                  {healthLoading ? (
                    <Skeleton className="h-5 w-12" />
                  ) : (
                    <Badge
                      className={
                        !health || health.queue.pending_jobs === 0
                          ? 'bg-green-500'
                          : health.queue.pending_jobs < 10
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      }
                    >
                      {health ? health.queue.pending_jobs : '--'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Cache Performance */}
            <div className="space-y-3">
              <h4 className="font-medium">Cache Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Hit rate</span>
                  {metricsLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <Badge
                      className={
                        (metrics?.cache_hit_rate ?? 0) >= 80
                          ? 'bg-green-500'
                          : 'bg-orange-500'
                      }
                    >
                      {metrics ? `${metrics.cache_hit_rate}%` : '--'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Redis bağlantısı</span>
                  {healthLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <Badge
                      className={
                        health?.cache.connected ? 'bg-green-500' : 'bg-red-500'
                      }
                    >
                      {health
                        ? health.cache.connected
                          ? 'Aktiv'
                          : 'Deaktiv'
                        : '--'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">CPU istifadəsi</span>
                  {metricsLoading ? (
                    <Skeleton className="h-5 w-12" />
                  ) : (
                    <Badge variant="outline">
                      {metrics ? `${metrics.cpu_usage}%` : '--'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Status Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorIcon className="h-5 w-5" />
            Sistem Komponentləri
          </CardTitle>
          <CardDescription>Hər komponentin hazırkı vəziyyəti</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            ) : health ? (
              <>
                <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <Database
                    className={`h-4 w-4 ${getStatusColor(health.database.status)}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Database (PostgreSQL)</p>
                    <p className="text-xs text-muted-foreground">
                      Response: {health.database.response_ms}ms
                    </p>
                  </div>
                  <Badge
                    className={
                      health.database.status === 'healthy'
                        ? 'bg-green-500'
                        : 'bg-orange-500'
                    }
                  >
                    {getStatusLabel(health.database.status)}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <Activity
                    className={`h-4 w-4 ${
                      health.cache.connected ? 'text-green-500' : 'text-red-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cache (Redis)</p>
                    <p className="text-xs text-muted-foreground">
                      {getStatusLabel(health.cache.status)}
                    </p>
                  </div>
                  <Badge
                    className={
                      health.cache.connected ? 'bg-green-500' : 'bg-red-500'
                    }
                  >
                    {health.cache.connected ? 'Qoşulub' : 'Qoşulmayıb'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <HardDrive
                    className={`h-4 w-4 ${
                      health.queue.pending_jobs === 0
                        ? 'text-green-500'
                        : health.queue.pending_jobs < 10
                        ? 'text-orange-500'
                        : 'text-red-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Queue İşçisi</p>
                    <p className="text-xs text-muted-foreground">
                      Gözləyən işlər: {health.queue.pending_jobs}
                    </p>
                  </div>
                  <Badge
                    className={
                      health.queue.status === 'healthy'
                        ? 'bg-green-500'
                        : 'bg-orange-500'
                    }
                  >
                    {getStatusLabel(health.queue.status)}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Komponent məlumatları əlçatan deyil
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
