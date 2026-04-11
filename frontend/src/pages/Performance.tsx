import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  MonitorIcon, 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  AlertTriangle, 
  TrendingUp, 
  Database, 
  Server, 
  RefreshCcw, 
  FileText,
  ChevronRight,
  Lightbulb,
  Clock,
  Zap,
  CheckCircle2
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { performanceService, PerformanceTrend } from "@/services/performanceService";
import { format, parseISO, subHours, subDays, isAfter } from 'date-fns';
import { az } from 'date-fns/locale';

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

function formatUptime(seconds: number | string): string {
  if (typeof seconds === 'string') return seconds;
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}g ${hours % 24}s`;
  return `${hours}s`;
}

// ── components ─────────────────────────────────────────────────────────────

interface TrendChartProps {
  data: PerformanceTrend[];
  dataKey: string;
  color: string;
  label: string;
  unit?: string;
}

const PerformanceTrendChart: React.FC<TrendChartProps> = ({ data, dataKey, color, label, unit = "" }) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: format(parseISO(item.hour), 'HH:mm'),
      value: (item.metrics as any)[dataKey]
    }));
  }, [data, dataKey]);

  return (
    <div className="h-[200px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            width={unit === "ms" ? 35 : 25}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            formatter={(value: number) => [`${value}${unit}`, label]}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#color-${dataKey})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function Performance() {
  const { currentUser } = useAuth();
  const [timeRange, setTimeRange] = useState('1h');
  const [showReport, setShowReport] = useState(false);

  const hasAccess = !!currentUser && ['superadmin', 'regionadmin'].includes(currentUser.role);

  // Metrics (Real-time)
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: () => performanceService.getMetrics(),
    refetchInterval: 30000,
    enabled: hasAccess,
  });

  // Health
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['performance-health'],
    queryFn: () => performanceService.getHealth(),
    refetchInterval: 60000,
    enabled: hasAccess,
  });

  // Trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['performance-trends'],
    queryFn: () => performanceService.getTrends(),
    staleTime: 300000,
    enabled: hasAccess,
  });

  // Report
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['performance-report'],
    queryFn: () => performanceService.getReport(),
    enabled: hasAccess && showReport,
  });

  const filteredTrends = useMemo(() => {
    if (!trends) return [];
    const now = new Date();
    let cutOff: Date;
    
    switch (timeRange) {
      case '1h': cutOff = subHours(now, 1); break;
      case '24h': cutOff = subDays(now, 1); break;
      case '7d': cutOff = subDays(now, 7); break;
      default: return trends;
    }
    
    return trends.filter(t => isAfter(parseISO(t.hour), cutOff));
  }, [trends, timeRange]);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">Bu səhifəyə yalnız SuperAdmin və RegionAdmin istifadəçiləri daxil ola bilər</p>
        </div>
      </div>
    );
  }

  const systemStatus = health?.status ?? metrics?.system_status ?? 'healthy';
  const memoryPercent = metrics && metrics.memory_total > 0
      ? Math.round((metrics.memory_usage / metrics.memory_total) * 100)
      : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-950 to-slate-600 bg-clip-text text-transparent">
            Performans Monitorinqi
          </h1>
          <p className="text-slate-500 text-lg">Sistemin işləmə vəziyyəti və resurs istifadəsi</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 border-slate-200 bg-white shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Son 1 saat</SelectItem>
              <SelectItem value="24h">Son 24 saat</SelectItem>
              <SelectItem value="7d">Son 7 gün</SelectItem>
              <SelectItem value="all">Bütün dövr</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetchMetrics()} className="shadow-sm">
            <RefreshCcw className="h-4 w-4 mr-2" /> Yenilə
          </Button>
          {isSuperAdmin && (
            <Button onClick={() => setShowReport(!showReport)} className="shadow-md bg-blue-600 hover:bg-blue-700">
              <FileText className="h-4 w-4 mr-2" /> {showReport ? "Hesabatı Gizlə" : "Tam Hesabat"}
            </Button>
          )}
        </div>
      </div>

      {/* Real-time Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md overflow-hidden group">
          <div className={`h-1.5 w-full ${systemStatus === 'healthy' ? 'bg-green-500' : 'bg-orange-500'}`} />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black">{getStatusLabel(systemStatus)}</span>
                </div>
              </div>
              <Server className={`h-10 w-10 ${getStatusColor(systemStatus)} opacity-20 group-hover:opacity-100 transition-opacity`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden group">
          <div className="h-1.5 w-full bg-blue-500" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Response</p>
                <p className={`text-2xl font-black ${metrics ? getResponseColor(metrics.response_time_ms) : ''}`}>
                  {metrics ? `${metrics.response_time_ms}ms` : '--'}
                </p>
              </div>
              <Activity className="h-10 w-10 text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden group">
          <div className="h-1.5 w-full bg-purple-500" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Bağlantılar</p>
                <p className="text-2xl font-black">
                  {metrics ? metrics.active_connections.toLocaleString() : '--'}
                </p>
              </div>
              <Wifi className="h-10 w-10 text-purple-500 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden group">
          <div className="h-1.5 w-full bg-amber-500" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Növbə</p>
                <p className="text-2xl font-black">
                  {health ? health.queue.pending_jobs : '--'}
                </p>
              </div>
              <Clock className="h-10 w-10 text-amber-500 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Detailed Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Trends Chart */}
          <Card className="border-none shadow-lg bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Performans Meylləri
                  </CardTitle>
                  <CardDescription>Zaman üzrə ardıcıl response vaxtı</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1">
                     <div className="h-2 w-2 rounded-full bg-blue-500" />
                     <span className="text-[10px] font-bold text-slate-500 uppercase">Response</span>
                   </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {trendsLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <PerformanceTrendChart 
                  data={filteredTrends} 
                  dataKey="avg_response_time" 
                  color="#3b82f6" 
                  label="Response" 
                  unit="ms"
                />
              )}
            </CardContent>
          </Card>

          {/* Resource Usage Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-500" /> CPU Yükü
                  </div>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{metrics?.cpu_usage || 0}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PerformanceTrendChart 
                  data={filteredTrends} 
                  dataKey="avg_query_count" 
                  color="#6366f1" 
                  label="Queries" 
                />
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-500" /> RAM İstifadəsi
                  </div>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{memoryPercent}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PerformanceTrendChart 
                  data={filteredTrends} 
                  dataKey="avg_memory_usage" 
                  color="#10b981" 
                  label="Memory" 
                  unit="MB"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar: Health & Recommendations */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border-none shadow-lg bg-white overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b">
               <CardTitle className="text-lg flex items-center gap-2">
                 <Zap className="h-5 w-5 text-amber-500" /> Sistem Komponentləri
               </CardTitle>
             </CardHeader>
             <CardContent className="p-4 space-y-3">
               {healthLoading ? (
                 [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)
               ) : health ? (
                 <>
                   <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors bg-white group shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                          <Database className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Verilənlər Bazası</p>
                          <p className="text-[10px] text-slate-400 font-mono italic">{health.database.response_ms}ms response</p>
                        </div>
                     </div>
                     <Badge className={health.database.status === 'healthy' ? 'bg-green-500' : 'bg-orange-500'}>
                       {getStatusLabel(health.database.status)}
                     </Badge>
                   </div>

                   <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 transition-colors bg-white group shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Cache (Redis)</p>
                          <p className="text-[10px] text-slate-400 font-mono italic">Aktiv qoşulma</p>
                        </div>
                     </div>
                     <Badge className={health.cache.connected ? 'bg-green-500' : 'bg-red-500'}>
                       {health.cache.connected ? 'OK' : 'FAIL'}
                     </Badge>
                   </div>

                   <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors bg-white group shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Növbə Arxitekturası</p>
                          <p className="text-[10px] text-slate-400 font-mono italic">{health.queue.pending_jobs} iş növbədə</p>
                        </div>
                     </div>
                     <Badge className={health.queue.status === 'healthy' ? 'bg-green-500' : 'bg-orange-500'}>
                        {getStatusLabel(health.queue.status)}
                     </Badge>
                   </div>
                 </>
               ) : null}
             </CardContent>
          </Card>

          {/* Recommendations Card (Functional via report data) */}
          {showReport && (
            <Card className="border-none shadow-lg bg-blue-600 text-white overflow-hidden animate-in slide-in-from-right duration-300">
               <CardHeader className="pb-2">
                 <CardTitle className="text-lg flex items-center gap-2">
                   <Lightbulb className="h-5 w-5 text-blue-200" /> Tövsiyələr
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                 <div className="px-6 py-4 space-y-3">
                   {reportLoading ? (
                     <Skeleton className="h-20 w-full bg-blue-500/50" />
                   ) : report?.recommendations.map((rec, i) => (
                     <div key={i} className="flex gap-3 text-sm font-medium border-b border-blue-500/50 pb-2 last:border-0 last:pb-0">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-200" />
                        <span>{rec}</span>
                     </div>
                   ))}
                 </div>
                 <div className="bg-blue-700/50 p-4 mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 opacity-60">Sistem Hesabatı</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs">Uptime: {report?.summary.uptime || '--'}</span>
                      <span className="text-xs">Uğursuz: {report ? (report.summary.error_rate * 100).toFixed(1) : '--'}%</span>
                    </div>
                 </div>
               </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Full Report Table Section */}
      {showReport && (
        <Card className="border-none shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-500">
          <CardHeader className="bg-slate-50/50 border-b py-6 px-8">
            <CardTitle>Ən Yavaş Endpointlər</CardTitle>
            <CardDescription>Sistem üzrə ən çox resurs tələb edən sorğuların siyahısı</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-8">API Endpoint</TableHead>
                  <TableHead>Orta Vaxt (ms)</TableHead>
                  <TableHead>Sorğu Sayı</TableHead>
                  <TableHead className="text-right px-8">Vəziyyət</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4} className="px-8"><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : report?.top_slow_endpoints.map((ep, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-xs px-8 text-blue-600 font-bold">{ep.endpoint}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-black",
                        ep.avg_time > 500 ? "text-red-500" : "text-amber-500"
                      )}>{ep.avg_time}ms</span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-500">{ep.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right px-8">
                       <Badge variant="outline" className={ep.avg_time > 500 ? "border-red-200 text-red-700" : "border-amber-200 text-amber-700"}>
                         {ep.avg_time > 500 ? "KRİTİK" : "YAVAŞ"}
                       </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

