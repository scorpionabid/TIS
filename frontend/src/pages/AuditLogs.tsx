import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardIcon, Search, Filter, Download, Eye, Calendar, User, Activity, AlertTriangle, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import auditLogService, { AuditLogFilters } from "@/services/auditLogService";

function StatCard({ label, value, icon: Icon, iconClass, loading }: {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  iconClass: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value?.toLocaleString() ?? 0}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${iconClass}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuditLogs() {
  const { currentUser } = useAuth();
  const [filters, setFilters] = useState<AuditLogFilters>({ per_page: 25, page: 1 });
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Security check
  if (!currentUser || !['superadmin', 'regionadmin'].includes(currentUser.role)) {
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

  const dateRangeToFilter = (range: string): Partial<AuditLogFilters> => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (range === 'today') return { date_from: fmt(now), date_to: fmt(now) };
    if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return { date_from: fmt(d) }; }
    if (range === 'month') { const d = new Date(now); d.setMonth(d.getMonth() - 1); return { date_from: fmt(d) }; }
    if (range === 'quarter') { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { date_from: fmt(d) }; }
    return {};
  };

  const activeFilters: AuditLogFilters = {
    ...filters,
    search: search || undefined,
    event: eventFilter !== 'all' ? eventFilter : undefined,
    ...dateRangeToFilter(dateRange),
  };

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['audit-logs-summary'],
    queryFn: () => auditLogService.getSummary(),
    staleTime: 60_000,
  });

  const { data: eventTypes } = useQuery({
    queryKey: ['audit-log-event-types'],
    queryFn: () => auditLogService.getEventTypes(),
    staleTime: 300_000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['audit-logs', activeFilters],
    queryFn: () => auditLogService.getLogs(activeFilters),
    staleTime: 30_000,
  });

  const logs = logsData?.data ?? [];
  const meta = logsData?.meta;

  const getEventBadgeVariant = (event: string): "default" | "destructive" | "secondary" | "outline" => {
    if (['deleted', 'authorization', 'password_change'].includes(event)) return 'destructive';
    if (['created', 'updated', 'restored'].includes(event)) return 'default';
    if (['authentication'].includes(event)) return 'secondary';
    return 'outline';
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logları</h1>
          <p className="text-muted-foreground">Sistem fəaliyyət qeydləri və audit izləməsi</p>
        </div>
        <Button className="flex items-center gap-2 w-full sm:w-auto" variant="outline" disabled>
          <Download className="h-4 w-4" />
          Log Eksport
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Bu gün" value={summary?.today} icon={Activity} iconClass="text-primary" loading={summaryLoading} />
        <StatCard label="Bu həftə" value={summary?.this_week} icon={Calendar} iconClass="text-blue-500" loading={summaryLoading} />
        <StatCard label="Aktiv istifadəçilər (24s)" value={summary?.active_users_24h} icon={User} iconClass="text-green-500" loading={summaryLoading} />
        <StatCard label="Təhlükəsizlik hadisələri" value={summary?.security_events_week} icon={ShieldAlert} iconClass="text-red-500" loading={summaryLoading} />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrləmə və Axtarış
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="URL, IP axtarın..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Hadisə növü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün hadisələr</SelectItem>
                {eventTypes?.map((evt) => (
                  <SelectItem key={evt} value={evt}>{evt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Vaxt aralığı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün vaxtlar</SelectItem>
                <SelectItem value="today">Bu gün</SelectItem>
                <SelectItem value="week">Son 7 gün</SelectItem>
                <SelectItem value="month">Son 30 gün</SelectItem>
                <SelectItem value="quarter">Son 90 gün</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              onClick={() => { setSearch(''); setEventFilter('all'); setDateRange('all'); }}
            >
              Sıfırla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardIcon className="h-5 w-5" />
            Audit Log Qeydləri
          </CardTitle>
          <CardDescription>
            {meta ? `${meta.total.toLocaleString()} qeydin ${meta.current_page}/${meta.last_page} səhifəsi` : 'Yüklənir...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Heç bir audit qeydi tapılmadı</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={getEventBadgeVariant(log.event)}>{log.event}</Badge>
                      {log.auditable_type && (
                        <span className="text-xs text-muted-foreground truncate">
                          {log.auditable_type.split('\\').pop()} #{log.auditable_id}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.user
                        ? <><span className="font-medium text-foreground">{log.user.first_name} {log.user.last_name}</span> · {log.user.username}</>
                        : <span className="italic">Sistem</span>
                      }
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                      {log.institution?.name && <span>{log.institution.name}</span>}
                      <span>{new Date(log.created_at).toLocaleString('az-AZ')}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" title="Ətraflı">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {((meta.current_page - 1) * meta.per_page) + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} / {meta.total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.current_page === 1}
                  onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  Əvvəlki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.current_page === meta.last_page}
                  onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  Növbəti
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
