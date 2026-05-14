import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  Search, 
  Filter, 
  Eye, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Activity, 
  ShieldAlert,
  X,
  RefreshCcw,
  Monitor,
  Globe,
  ChevronRight,
  Database,
  Building2,
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import auditLogService, { AuditLogFilters, AuditLogEntry } from "@/services/auditLogService";
import { UserSearchSelect } from "@/components/audit-logs/UserSearchSelect";
import { CustomDateRangePicker } from "@/components/audit-logs/CustomDateRangePicker";
import { AuditLogDetailSheet } from "@/components/audit-logs/AuditLogDetailSheet";
import { InstitutionSearchSelect } from "@/components/audit-logs/InstitutionSearchSelect";
import { ActiveFilterBar } from "@/components/audit-logs/ActiveFilterBar";
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import { az } from 'date-fns/locale';

function StatCard({ label, value, icon: Icon, iconClass, loading, trend, onClick, active }: {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  iconClass: string;
  loading: boolean;
  trend?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-none shadow-md bg-white hover:shadow-xl transition-all duration-300 group cursor-pointer",
        active && "ring-2 ring-blue-500 shadow-lg scale-[1.02]"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full transition-all duration-300",
        active ? "w-2 bg-blue-600" : iconClass.split(' ')[0].replace('text-', 'bg-')
      )} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
            {loading ? (
              <Skeleton className="h-9 w-20 mt-1" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold tracking-tight">{value?.toLocaleString() ?? 0}</p>
                {trend && <span className="text-[10px] font-medium text-green-600">{trend}</span>}
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl bg-slate-50 group-hover:scale-110 transition-transform duration-300",
            active && "bg-blue-50"
          )}>
            <Icon className={cn("h-6 w-6", active ? "text-blue-600" : iconClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuditLogs() {
  const { currentUser } = useAuth();
  const [filters, setFilters] = useState<AuditLogFilters>({ per_page: 25, page: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [auditableTypeFilter, setAuditableTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date, to?: Date } | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [selectedInstId, setSelectedInstId] = useState<number | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const hasAccess = !!currentUser && ['superadmin', 'regionadmin'].includes(currentUser.role);
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const activeFiltersParams = useMemo((): AuditLogFilters => ({
    ...filters,
    search: debouncedSearch || undefined,
    event: eventFilter !== 'all' ? eventFilter : undefined,
    auditable_type: auditableTypeFilter !== 'all' ? auditableTypeFilter : undefined,
    user_id: selectedUserId,
    institution_id: selectedInstId,
    date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  }), [filters, debouncedSearch, eventFilter, auditableTypeFilter, selectedUserId, selectedInstId, dateRange]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['audit-logs-summary'],
    queryFn: () => auditLogService.getSummary(),
    staleTime: 60_000,
    enabled: hasAccess,
  });

  const { data: eventTypes } = useQuery({
    queryKey: ['audit-log-event-types'],
    queryFn: () => auditLogService.getEventTypes(),
    staleTime: 300_000,
    enabled: hasAccess,
  });

  const { data: auditableTypes } = useQuery({
    queryKey: ['audit-log-auditable-types'],
    queryFn: () => auditLogService.getAuditableTypes(),
    staleTime: 300_000,
    enabled: hasAccess,
  });

  const { data: logsData, isLoading: logsLoading, refetch } = useQuery({
    queryKey: ['audit-logs', activeFiltersParams],
    queryFn: () => auditLogService.getLogs(activeFiltersParams),
    staleTime: 30_000,
    enabled: hasAccess,
  });

  const logs = logsData?.data ?? [];
  const meta = logsData?.meta;

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setEventFilter('all');
    setAuditableTypeFilter('all');
    setDateRange(undefined);
    setSelectedUserId(undefined);
    setSelectedInstId(undefined);
    setFilters({ per_page: 25, page: 1 });
  };

  const removeFilter = (key: string) => {
    switch(key) {
      case 'search': setSearch(''); setDebouncedSearch(''); break;
      case 'event': setEventFilter('all'); break;
      case 'auditable_type': setAuditableTypeFilter('all'); break;
      case 'user': setSelectedUserId(undefined); break;
      case 'institution': setSelectedInstId(undefined); break;
      case 'date': setDateRange(undefined); break;
    }
  };

  const handleQuickDate = (days: number) => {
    const to = new Date();
    const from = subDays(startOfDay(to), days);
    setDateRange({ from, to });
  };

  const handleStatClick = (type: 'today' | 'week' | 'security') => {
    handleResetFilters();
    if (type === 'today') {
      const today = new Date();
      setDateRange({ from: startOfDay(today), to: today });
    } else if (type === 'week') {
      handleQuickDate(7);
    } else if (type === 'security') {
      // Assuming security events have these names
      setEventFilter('authentication'); 
    }
  };

  const handleOpenDetail = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md border border-red-50">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-2xl font-bold mb-2">Giriş Məhdudlaşdırılıb</h3>
          <p className="text-muted-foreground">
            Audit logları yalnız yüksək səviyyəli adminstratorlar tərəfindən izlənilə bilər. 
            Müvafiq icazəniz yoxdur.
          </p>
        </div>
      </div>
    );
  }

  const getEventBadge = (event: string) => {
    const variants: Record<string, string> = {
      deleted: 'bg-red-100 text-red-700 border-red-200',
      created: 'bg-green-100 text-green-700 border-green-200',
      updated: 'bg-blue-100 text-blue-700 border-blue-200',
      authentication: 'bg-amber-100 text-amber-700 border-amber-200',
      authorization: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return (
      <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider", variants[event] || 'bg-slate-100 text-slate-700')}>
        {event}
      </Badge>
    );
  };

  const filterBadges = [
    { key: 'search', label: 'Axtarış', value: search },
    { key: 'event', label: 'Hadisə', value: eventFilter !== 'all' ? eventFilter : undefined },
    { key: 'auditable_type', label: 'Obyekt', value: auditableTypeFilter !== 'all' ? auditableTypeFilter : undefined },
    { key: 'user', label: 'İstifadəçi', value: selectedUserId ? "Seçilib" : undefined },
    { key: 'institution', label: 'Müəssisə', value: selectedInstId ? "Seçilib" : undefined },
    { key: 'date', label: 'Tarix', value: dateRange?.from ? `${format(dateRange.from, 'dd.MM')} - ${dateRange.to ? format(dateRange.to, 'dd.MM') : '...'}` : undefined },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-950 to-slate-600 bg-clip-text text-transparent">
            Sistem Auditi
          </h1>
          <p className="text-slate-500 text-lg">Bütün istifadəçi fəaliyyətləri və sistem dəyişikliklərinin ətraflı xronologiyası</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} className="shadow-sm hover:bg-blue-50 hover:text-blue-600 border-slate-200 transition-all active:scale-95">
            <RefreshCcw className={cn("h-4 w-4 mr-2", logsLoading && "animate-spin")} /> Yenilə
          </Button>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          label="Bu gün" 
          value={summary?.today} 
          icon={Activity} 
          iconClass="text-blue-600" 
          loading={summaryLoading} 
          onClick={() => handleStatClick('today')}
          active={!!dateRange?.from && format(dateRange.from, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
        />
        <StatCard 
          label="Son 7 gün" 
          value={summary?.this_week} 
          icon={CalendarIcon} 
          iconClass="text-indigo-600" 
          loading={summaryLoading} 
          onClick={() => handleStatClick('week')}
        />
        <StatCard 
          label="Aktiv İstifadəçilər" 
          value={summary?.active_users_24h} 
          icon={UserIcon} 
          iconClass="text-emerald-600" 
          loading={summaryLoading} 
          trend="Son 24s"
        />
        <StatCard 
          label="Təhlükəsizlik" 
          value={summary?.security_events_week} 
          icon={ShieldAlert} 
          iconClass="text-rose-600" 
          loading={summaryLoading} 
          trend="Xəbərdarlıqlar"
          onClick={() => handleStatClick('security')}
          active={eventFilter === 'authentication'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Filters Sidebar/Column */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="shadow-lg border-none bg-white/90 backdrop-blur-md sticky top-8 overflow-hidden group">
            <div className="h-1.5 w-full bg-blue-600/10 group-hover:bg-blue-600 transition-all duration-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                Filtrlər
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Group: Essential Search */}
              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Əsas Axtarış</p>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="URL, IP, Hadisə..."
                      className="pl-10 h-10 border-slate-200 focus:ring-blue-500 transition-all"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Group: Object Filtering */}
              <div className="space-y-4">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Obyekt Filtri</p>
                
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" /> Müəssisə
                    </label>
                    <InstitutionSearchSelect 
                      value={selectedInstId} 
                      onChange={setSelectedInstId} 
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <UserIcon className="h-3 w-3" /> İstifadəçi
                  </label>
                  <UserSearchSelect 
                    value={selectedUserId} 
                    onChange={setSelectedUserId} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Database className="h-3 w-3" /> Obyekt Növü
                  </label>
                  <Select value={auditableTypeFilter} onValueChange={setAuditableTypeFilter}>
                    <SelectTrigger className="h-10 border-slate-200 bg-white">
                      <SelectValue placeholder="Bütün növlər" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün növlər</SelectItem>
                      {auditableTypes?.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.split('\\').pop()?.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Activity className="h-3 w-3" /> Hadisə Növü
                  </label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="h-10 border-slate-200 bg-white">
                      <SelectValue placeholder="Bütün hadisələr" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün hadisələr</SelectItem>
                      {eventTypes?.map((evt) => (
                        <SelectItem key={evt} value={evt} className="capitalize">{evt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Group: Time Filtering */}
              <div className="space-y-4">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Zaman Filtri</p>
                <div className="space-y-3">
                  <CustomDateRangePicker 
                    value={dateRange} 
                    onChange={setDateRange} 
                  />
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" className="text-[10px] h-7 border-slate-100 hover:bg-blue-50" onClick={() => handleQuickDate(0)}>Bu gün</Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-7 border-slate-100 hover:bg-blue-50" onClick={() => handleQuickDate(1)}>Dünən</Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-7 border-slate-100 hover:bg-blue-50" onClick={() => handleQuickDate(7)}>7 gün</Button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  variant="ghost" 
                  className="w-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border-t border-slate-100 pt-4 rounded-none h-12" 
                  onClick={handleResetFilters}
                >
                  <X className="h-4 w-4 mr-2" /> Filtrləri Təmizlə
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Logs Table */}
        <div className="xl:col-span-3 space-y-4">
          {/* Active Filter Badges */}
          <ActiveFilterBar 
            filters={filterBadges} 
            onRemove={removeFilter} 
            onClearAll={handleResetFilters} 
          />

          <Card className="shadow-lg border-none overflow-hidden min-h-[600px] flex flex-col bg-white">
            <CardHeader className="bg-slate-50/50 border-b py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-slate-800">Fəaliyyət Jurnalı</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 font-medium text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {meta ? (
                      <>Göstərilən: <span className="text-blue-600 font-bold">{meta.total.toLocaleString()}</span> qeyd</>
                    ) : 'Məlumatlar yüklənir...'}
                  </CardDescription>
                </div>
                {logsLoading && <Loader2 className="h-6 w-6 animate-spin text-blue-500 opacity-20" />}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="overflow-x-auto flex-1">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-b-2">
                      <TableHead className="w-[180px] font-bold text-slate-600 uppercase text-[11px] tracking-wider px-8">Tarix & Hadisə</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[11px] tracking-wider">İstifadəçi</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[11px] tracking-wider">Obyekt</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[11px] tracking-wider">Məlumat</TableHead>
                      <TableHead className="text-right font-bold text-slate-600 uppercase text-[11px] tracking-wider px-8">Aksiyon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="px-8"><Skeleton className="h-10 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                          <TableCell className="px-8"><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-96 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4 text-slate-400">
                            <div className="p-6 rounded-full bg-slate-50 border-2 border-dashed">
                              <Search className="h-12 w-12 opacity-20" />
                            </div>
                            <p className="text-lg font-medium italic">Heç bir audit qeydi tapılmadı.</p>
                            <Button variant="outline" size="sm" onClick={handleResetFilters}>Filtrləri təmizlə və yenidən yoxla</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id} className="group hover:bg-blue-50/30 transition-all border-b border-slate-100 last:border-0">
                          <TableCell className="align-top py-5 px-8">
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <span className="font-bold text-[14px]">{format(parseISO(log.created_at), 'dd.MM.yyyy')}</span>
                                <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 rounded font-mono">
                                  {format(parseISO(log.created_at), 'HH:mm')}
                                </span>
                              </div>
                              {getEventBadge(log.event)}
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 group-hover:bg-white group-hover:border-blue-200 transition-all">
                                <UserIcon className="h-5 w-5" />
                              </div>
                              <div className="max-w-[200px]">
                                <p className="text-sm font-bold text-slate-800 truncate">
                                  {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Sistem'}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1">
                                  {log.user ? (
                                    <>
                                      <span className="text-blue-500">@</span>
                                      {log.user.username}
                                    </>
                                  ) : 'automatic'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-5">
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                {log.auditable_type?.split('\\').pop() || 'N/A'}
                              </div>
                              <p className="text-[10px] text-slate-400 pl-2">ID: <span className="text-slate-600 font-mono">#{log.auditable_id}</span></p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-5">
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-slate-600 bg-slate-50/50 p-1.5 rounded-md w-fit border border-slate-100">
                                <Globe className="h-3.5 w-3.5 text-blue-500/60" />
                                <span className="font-mono text-[11px] tracking-tight">{log.ip_address}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400 max-w-[250px] group/url">
                                <Monitor className="h-3.5 w-3.5" />
                                <span className="truncate text-[10px] group-hover/url:text-blue-600 transition-colors" title={log.url || ''}>{log.url || '/'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-5 text-right px-8">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 px-4 opacity-0 group-hover:opacity-100 transition-all bg-white border shadow-sm hover:text-blue-600 hover:border-blue-200 hover:shadow-md active:scale-95"
                              onClick={() => handleOpenDetail(log)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> Bak
                              <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-50" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Enhanced Pagination */}
              {meta && meta.last_page > 1 && (
                <div className="p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    SIYAHI: <span className="text-slate-900">{((meta.current_page - 1) * meta.per_page) + 1}</span> – <span className="text-slate-900">{Math.min(meta.current_page * meta.per_page, meta.total)}</span> / {meta.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.current_page === 1}
                      onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
                      className="h-9 px-4 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all"
                    >
                      Əvvəlki
                    </Button>
                    <div className="flex items-center px-5 text-sm font-bold bg-white border h-9 rounded-md shadow-sm min-w-[80px] justify-center text-blue-600">
                      {meta.current_page} / {meta.last_page}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.current_page === meta.last_page}
                      onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                      className="h-9 px-4 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all"
                    >
                      Növbəti
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Slide-over */}
      <AuditLogDetailSheet 
        log={selectedLog} 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </div>
  );
}
