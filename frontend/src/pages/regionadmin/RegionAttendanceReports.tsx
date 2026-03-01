import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, BarChart3, AlertTriangle, Building2, Users, Target, FileDown, Search, ArrowUpDown, School as SchoolIcon, Shirt, MapPin } from 'lucide-react';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/constants/roles';
import { useQuery } from '@tanstack/react-query';
import { regionalAttendanceService } from '@/services/regionalAttendance';
import { format, subDays } from 'date-fns';
import { az } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const numberFormatter = new Intl.NumberFormat('az');

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

const getChartColor = (rate: number) => {
  if (rate >= 95) return '#22c55e'; // Green-500
  if (rate >= 85) return '#eab308'; // Yellow-500
  return '#ef4444'; // Red-500
};

const getDefaultDates = () => {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  return {
    start: today,
    end: today,
  };
};

type DatePreset = 'today' | 'thisWeek' | 'thisMonth' | 'custom';

export default function RegionAttendanceReports() {
  const { currentUser } = useAuth();
  const { canAccess } = useRoleCheck();
  const attendanceAccess = useModuleAccess('attendance');
  const hasAccess =
    attendanceAccess.canView &&
    canAccess([
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.SEKTORADMIN,
      USER_ROLES.REGIONOPERATOR,
    ]);

  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'classes'>('overview');
  const [pendingRefresh, setPendingRefresh] = useState(false);

  const overviewFilters = useMemo(() => {
    const filters: Record<string, unknown> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (selectedSectorId !== 'all') {
      filters.sector_id = Number(selectedSectorId);
    }
    return filters;
  }, [startDate, endDate, selectedSectorId]);

  const {
    data: overview,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['regional-attendance', 'overview', overviewFilters],
    queryFn: () => regionalAttendanceService.getOverview(overviewFilters),
    enabled: hasAccess,
    staleTime: 60 * 1000,
  });

  const schools = overview?.schools ?? [];
  const sectors = overview?.sectors ?? [];

  const processedSchools = useMemo(() => {
    let result = [...schools];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(lowerSearch));
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((s) => {
        const warnings = s.warnings || [];
        if (statusFilter === 'missing') return warnings.includes('reports_missing');
        if (statusFilter === 'low') return warnings.includes('low_attendance');
        if (statusFilter === 'normal') return warnings.length === 0;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const aVal: any = a[sortConfig.key as keyof typeof a];
      const bVal: any = b[sortConfig.key as keyof typeof b];

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal, 'az') 
          : bVal.localeCompare(aVal, 'az');
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [schools, searchTerm, statusFilter, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  useEffect(() => {
    if (!schools.length) {
      setSelectedSchoolId('');
      return;
    }

    if (selectedSchoolId) {
      const exists = schools.some((school) => school.school_id === Number(selectedSchoolId));
      if (!exists) {
        setSelectedSchoolId(String(schools[0].school_id));
      }
    } else {
      setSelectedSchoolId(String(schools[0].school_id));
    }
  }, [schools, selectedSchoolId]);

  const {
    data: classBreakdown,
    isLoading: classLoading,
    isFetching: classFetching,
    error: classError,
    refetch: refetchClassBreakdown,
  } = useQuery({
    queryKey: ['regional-attendance', 'school-classes', selectedSchoolId, startDate, endDate],
    queryFn: () =>
      selectedSchoolId
        ? regionalAttendanceService.getSchoolClasses(Number(selectedSchoolId), {
            start_date: startDate,
            end_date: endDate,
          })
        : Promise.resolve(null),
    enabled: hasAccess && Boolean(selectedSchoolId),
    staleTime: 60 * 1000,
  });

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'thisWeek') {
      // Get start of week (Monday)
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(now.setDate(diff));
      setStartDate(format(startOfWeek, 'yyyy-MM-dd'));
      setEndDate(today);
    } else if (preset === 'thisMonth') {
      const start = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      setStartDate(start);
      setEndDate(today);
    }
  };

  useEffect(() => {
    if (!pendingRefresh) return;
    refetchOverview();
    if (selectedSchoolId) refetchClassBreakdown();
    setPendingRefresh(false);
  }, [pendingRefresh, refetchOverview, refetchClassBreakdown, selectedSchoolId]);

  const handleExport = async () => {
    try {
      const blob = await regionalAttendanceService.exportExcel(overviewFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `regional_davamiyyet_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (!error) return '';
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Gözlənilməz xəta baş verdi.';
  };

  const filteredSchoolOptions = useMemo(() => {
    if (selectedSectorId === 'all') {
      return schools;
    }
    return schools.filter((school) => school.sector_id === Number(selectedSectorId));
  }, [schools, selectedSectorId]);

  const selectedSchoolName = useMemo(() => {
    if (!selectedSchoolId) return '';
    return filteredSchoolOptions.find((school) => school.school_id === Number(selectedSchoolId))?.name ?? '';
  }, [filteredSchoolOptions, selectedSchoolId]);

  const selectedSchoolStudentCount = useMemo(() => {
    return classBreakdown?.classes?.reduce((sum, cls) => sum + (cls.student_count ?? 0), 0) ?? 0;
  }, [classBreakdown?.classes]);

  const institutionName =
    currentUser?.region?.name || currentUser?.department?.name || currentUser?.institution?.name || '';

  const selectedSectorName = useMemo(() => {
    if (selectedSectorId === 'all') return '';
    return sectors.find((sector) => sector.sector_id === Number(selectedSectorId))?.name ?? '';
  }, [sectors, selectedSectorId]);

  const headerChipText = useMemo(() => {
    if (!institutionName) return '';
    if (selectedSectorName) return `${institutionName} · ${selectedSectorName}`;
    return institutionName;
  }, [institutionName, selectedSectorName]);

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>İcazə yoxdur</AlertTitle>
          <AlertDescription>
            Bu bölmə üçün Davamiyyət icazəsi (`attendance.read`) tələb olunur.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderSummaryCards = () => {
    const summary = overview?.summary;
    if (!summary) return null;

    const cards = [
      {
        label: 'Məktəblər',
        value: summary.total_schools,
        icon: Building2,
        description: `${summary.total_sectors} sektor`,
      },
      {
        label: 'Şagird sayı',
        value: summary.total_students,
        icon: Users,
        description: `${summary.reported_days} hesabat günü`,
      },
      {
        label: 'Orta davamiyyət',
        value: `${summary.average_attendance_rate.toFixed(1)}%`,
        icon: Target,
        description: 'Hesabat dövrü üzrə',
      },
      {
        label: 'Məktəbli forma',
        value: formatPercent(summary.uniform_compliance_rate),
        icon: Shirt,
        description: `${numberFormatter.format(summary.total_uniform_violations ?? 0)} pozuntu`,
      },
      {
        label: 'Məlumat çatışmazlığı',
        value: summary.schools_missing_reports,
        icon: AlertTriangle,
        description: 'Gözlənilən hesabat daxil olmayan məktəblər',
      },
    ];

    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((card, idx) => {
          const palette =
            idx === 0
              ? { line: 'bg-[#2563eb]', icon: 'from-[#2563eb] to-[#60a5fa]', value: 'text-[#1d4ed8]' }
              : idx === 1
              ? { line: 'bg-[#7c3aed]', icon: 'from-[#7c3aed] to-[#c084fc]', value: 'text-[#6d28d9]' }
              : idx === 2
              ? { line: 'bg-[#10b981]', icon: 'from-[#10b981] to-[#6ee7b7]', value: 'text-[#047857]' }
              : idx === 3
              ? { line: 'bg-[#6366f1]', icon: 'from-[#6366f1] to-[#a5b4fc]', value: 'text-[#3730a3]' }
              : { line: 'bg-[#f59e0b]', icon: 'from-[#f97316] to-[#facc15]', value: 'text-[#b45309]' };

          return (
            <Card
              key={card.label}
              className={`relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_26px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 ${
                idx === 4 ? 'bg-gradient-to-br from-[#fff8eb] to-[#fff4d7] border border-amber-200' : ''
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${palette.line}`} />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500">{card.label}</CardTitle>
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br ${palette.icon}`}
                >
                  <card.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-extrabold ${palette.value}`}>
                  {typeof card.value === 'number' ? numberFormatter.format(card.value) : card.value}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderUniformSectorChart = () => {
    if (!sectors.length) return null;

    const data = sectors.map((s) => ({
      name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
      fullName: s.name,
      rate: Number(s.uniform_compliance_rate ?? 0),
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Sektor müqayisəsi (Məktəbli forma %)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Məktəbli forma']}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getChartColor(entry.rate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSectorChart = () => {
    if (!sectors.length) return null;

    const data = sectors.map((s) => ({
      name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
      fullName: s.name,
      rate: s.average_attendance_rate,
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Sektor müqayisəsi (Davamiyyət %)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  angle={-15} 
                  textAnchor="end" 
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Davamiyyət']}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getChartColor(entry.rate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTrendChart = () => {
    if (!overview?.trends?.length) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Dinamika (Gündəlik davamiyyət %)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.trends} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="short_date" 
                  fontSize={11}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Davamiyyət']}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="px-2 py-4 sm:px-4 space-y-4">
      {/* Header with Institution Name - School Admin Style */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Davamiyyət hesabatı</h1>
            <p className="text-sm text-slate-500">
              Sektorlar və məktəblər üzrə real-vaxt iştirak analitikası
            </p>
          </div>
        </div>

        {headerChipText ? (
          <div className="hidden sm:block">
            <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 shadow-sm max-w-[420px]">
              <div className="flex items-center justify-end gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-700 text-right truncate min-w-0">{headerChipText}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {(overviewError || classError) && (
        <Alert variant="destructive">
          <AlertTitle>Hesabat yüklənmədi</AlertTitle>
          <AlertDescription>
            {getErrorMessage(overviewError || classError)}
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filterlər</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const today = format(new Date(), 'yyyy-MM-dd');
                  setDatePreset('today');
                  setStartDate(today);
                  setEndDate(today);
                  setPendingRefresh(true);
                }}
                disabled={pendingRefresh || overviewLoading || overviewFetching}
                className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
              >
                {(pendingRefresh || overviewLoading || overviewFetching) ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                )}
                {(pendingRefresh || overviewLoading || overviewFetching) ? 'Yenilənir...' : 'Yenilə'}
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={overviewLoading || !overview}
                className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
              >
                <FileDown className="mr-1.5 h-4 w-4" />
                Eksport (Excel)
              </Button>
            </div>
          </div>

          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlanğıc tarixi</Label>
              <Input
                type="date"
                value={startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(event) => {
                  setDatePreset('custom');
                  setStartDate(event.target.value);
                }}
                className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Son tarix</Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(event) => {
                  setDatePreset('custom');
                  setEndDate(event.target.value);
                }}
                className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sektor</Label>
              <Select value={selectedSectorId} onValueChange={(value) => setSelectedSectorId(value)}>
                <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
                  <SelectValue placeholder="Sektor seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün sektorlar</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.sector_id} value={sector.sector_id.toString()}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mt-5">
                <button
                  type="button"
                  onClick={() => handlePresetChange('today')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    datePreset === 'today'
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                      : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  Gün
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('thisWeek')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    datePreset === 'thisWeek'
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                      : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  Həftə
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('thisMonth')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    datePreset === 'thisMonth'
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                      : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  Ay
                </button>
                <button
                  type="button"
                  disabled
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-not-allowed ${
                    datePreset === 'custom'
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                      : 'text-slate-400'
                  }`}
                >
                  Fərdi
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards Inline */}
          <div className="pt-3 border-t border-slate-100">
            {overviewLoading ? (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : overview?.summary ? (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-blue-50 to-white">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Məktəblər</p>
                        <p className="text-xl font-bold text-blue-600">{overview.summary.total_schools}</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{overview.summary.total_sectors} sektor</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-emerald-50 to-white">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Orta davamiyyət</p>
                        <p className="text-xl font-bold text-emerald-600">{overview.summary.average_attendance_rate.toFixed(1)}%</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                        <Target className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{overview.summary.reported_days} gün üzrə</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-violet-50 to-white">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500" />
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Məktəbli forma</p>
                        <p className="text-xl font-bold text-violet-600">{formatPercent(overview.summary.uniform_compliance_rate)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                        <Shirt className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{numberFormatter.format(overview.summary.total_uniform_violations ?? 0)} pozuntu</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-amber-50 to-white">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Şagird sayı</p>
                        <p className="text-xl font-bold text-amber-600">{numberFormatter.format(overview.summary.total_students)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Ümumi şagird sayı</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'classes')}>
        <TabsList className="inline-flex w-full sm:w-auto rounded-2xl bg-slate-100 p-1 gap-1 h-auto">
          <TabsTrigger
            value="overview"
            className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
          >
            Ümumi Panorama
          </TabsTrigger>
          <TabsTrigger
            value="classes"
            className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
          >
            Məktəb &amp; Sinif nəzarəti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {renderSectorChart()}
            {renderUniformSectorChart()}
            {renderTrendChart()}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sektor icmalı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {overviewFetching && !overview ? (
                  <Skeleton className="h-40 w-full" />
                ) : sectors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Seçilmiş filterlər üçün sektor tapılmadı.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sektor</TableHead>
                        <TableHead className="text-center">Məktəb</TableHead>
                        <TableHead className="text-center">Şagird</TableHead>
                        <TableHead className="text-center">Orta davamiyyət</TableHead>
                        <TableHead className="text-center">Məktəbli forma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectors.map((sector) => (
                        <TableRow key={sector.sector_id}>
                          <TableCell>
                            <div className="font-medium">{sector.name}</div>
                            <p className="text-xs text-muted-foreground">
                              {sector.reported_days} hesabat günü
                            </p>
                          </TableCell>
                          <TableCell className="text-center">{sector.school_count}</TableCell>
                          <TableCell className="text-center">
                            {numberFormatter.format(sector.total_students)}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {formatPercent(sector.average_attendance_rate)}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {formatPercent(sector.uniform_compliance_rate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bildirişlər</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm">Məlumat göndərməyən məktəblər</h4>
                  <div className="mt-2 space-y-1">
                    {overview?.alerts.missing_reports && overview.alerts.missing_reports.length > 0 ? (
                      <>
                        {overview.alerts.missing_reports.slice(0, 5).map((alert) => (
                          <div key={alert.school_id} className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            {alert.name}
                          </div>
                        ))}
                        {overview.alerts.missing_reports.length > 5 && (
                          <p className="text-[10px] text-muted-foreground italic">
                            və daha {overview.alerts.missing_reports.length - 5} məktəb...
                          </p>
                        )}
                      </>
                    ) : overview?.summary.schools_missing_reports ? (
                      <div className="flex items-center gap-2 text-sm text-yellow-600 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        {overview.summary.schools_missing_reports} məktəbdən hesabat gözlənilir.
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-green-600">Bütün məktəblər hesabat göndərib.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Aşağı davamiyyət</h4>
                  <div className="mt-2 space-y-1">
                    {overview?.alerts.low_attendance && overview.alerts.low_attendance.length > 0 ? (
                      overview.alerts.low_attendance.slice(0, 5).map((alert) => (
                        <div key={alert.school_id} className="flex items-center justify-between text-sm">
                          <span>{alert.name}</span>
                          <span className="font-semibold text-red-600">{formatPercent(alert.rate)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Aşağı davamiyyət müşahidə edilmir.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
              <div>
                <CardTitle>Məktəblər</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {schools.length} məktəbdən {processedSchools.length}-i göstərilir
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status üzrə filtr" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün statuslar</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="missing">Hesabat yoxdur</SelectItem>
                    <SelectItem value="low">Aşağı davamiyyət</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Məktəb axtar..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Məktəb
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('total_students')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Şagird
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('reported_days')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Hesabat günləri
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('average_attendance_rate')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Orta davamiyyət
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-center cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('uniform_compliance_rate')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Məktəbli forma
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedSchools.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Filtrə uyğun məktəb tapılmadı.
                          </TableCell>
                        </TableRow>
                      ) : (
                        processedSchools.map((school) => {
                          const warnings = school.warnings || [];
                          return (
                            <TableRow 
                              key={school.school_id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => {
                                setSelectedSchoolId(String(school.school_id));
                                setActiveTab('classes');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <TableCell>
                                <div className="font-medium">{school.name}</div>
                                <p className="text-xs text-muted-foreground">
                                  {school.reported_classes} sinif
                                </p>
                                <p className="text-xs text-slate-400">
                                  {currentUser?.region?.name || currentUser?.department?.name || currentUser?.institution?.name}
                                </p>
                              </TableCell>
                              <TableCell className="text-center">
                                {numberFormatter.format(school.total_students)}
                              </TableCell>
                              <TableCell className="text-center">
                                {school.reported_days}/{school.expected_school_days}
                              </TableCell>
                              <TableCell className="text-center font-semibold">
                                {formatPercent(school.average_attendance_rate)}
                              </TableCell>
                              <TableCell className="text-center font-semibold">
                                {formatPercent(school.uniform_compliance_rate)}
                              </TableCell>
                              <TableCell className="text-center">
                                {warnings.length === 0 ? (
                                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                                    Normal
                                  </Badge>
                                ) : (
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {warnings.map((warning) => (
                                      <Badge key={warning} variant="destructive">
                                        {warning === 'reports_missing' ? 'Hesabat yoxdur' : 'Aşağı davamiyyət'}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
                <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-slate-50 to-white lg:w-[360px]">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900/70" />
                  <CardContent className="p-2.5 pt-3">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Məktəb</Label>
                    <div className="mt-2">
                      <Select value={selectedSchoolId} onValueChange={(value) => setSelectedSchoolId(value)}>
                        <SelectTrigger className="h-10 w-full rounded-xl border-[1.4px] border-slate-200 bg-white shadow-sm text-slate-700">
                          <SelectValue placeholder="Məktəb seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSchoolOptions.map((school) => (
                            <SelectItem key={school.school_id} value={school.school_id.toString()}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {selectedSchoolId ? (
                  classLoading || classFetching ? (
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:flex-1">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : classBreakdown?.summary ? (
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:flex-1">
                      <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-blue-50 to-white">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                        <CardContent className="p-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase">Sinif sayı</p>
                              <p className="text-lg font-bold text-blue-600">{classBreakdown?.summary?.total_classes ?? 0}</p>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <Building2 className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{classBreakdown?.summary?.reported_classes ?? 0} sinif hesabat göndərib</p>
                        </CardContent>
                      </Card>

                      <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-emerald-50 to-white">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                        <CardContent className="p-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase">Orta davamiyyət</p>
                              <p className="text-lg font-bold text-emerald-600">{formatPercent(classBreakdown?.summary?.average_attendance_rate)}</p>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                              <Target className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Seçilmiş dövr üzrə</p>
                        </CardContent>
                      </Card>

                      <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-violet-50 to-white">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500" />
                        <CardContent className="p-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase">Məktəbli forma</p>
                              <p className="text-lg font-bold text-violet-600">{formatPercent(classBreakdown?.summary?.uniform_compliance_rate)}</p>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                              <Shirt className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{numberFormatter.format(classBreakdown?.summary?.total_uniform_violations ?? 0)} pozuntu</p>
                        </CardContent>
                      </Card>

                      <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-amber-50 to-white">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                        <CardContent className="p-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase">Şagird sayı</p>
                              <p className="text-lg font-bold text-amber-600">{numberFormatter.format(selectedSchoolStudentCount)}</p>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                              <Users className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Seçilmiş məktəb üzrə</p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null
                ) : null}
              </div>
            </CardContent>
          </Card>

          {(!selectedSchoolId || !filteredSchoolOptions.length) && (
            <Alert>
              <AlertTitle>Məktəb seçilməyib</AlertTitle>
              <AlertDescription>
                Göstərmək istədiyiniz məktəbi seçimdən əlavə edin.
              </AlertDescription>
            </Alert>
          )}

          {selectedSchoolId && (
            <>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Siniflər üzrə hesabat
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {selectedSchoolName}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {classLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : classBreakdown?.classes?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sinif</TableHead>
                          <TableHead className="text-center">Şagird</TableHead>
                          <TableHead className="text-center">Hesabat günləri</TableHead>
                          <TableHead className="text-center">Orta davamiyyət</TableHead>
                          <TableHead className="text-center">Məktəbli forma</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classBreakdown?.classes?.map((classStat) => (
                          <TableRow key={classStat.grade_id ?? classStat.name}>
                            <TableCell>
                              <div className="font-medium flex items-center gap-2">
                                <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                                {classStat.class_level}-{classStat.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {numberFormatter.format(classStat.student_count)}
                            </TableCell>
                            <TableCell className="text-center">
                              {classStat.reported_days}/{classStat.expected_school_days}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {formatPercent(classStat.average_attendance_rate)}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {formatPercent(classStat.uniform_compliance_rate)}
                            </TableCell>
                            <TableCell className="text-center">
                              {classStat.warnings?.length ? (
                                <Badge variant="destructive">
                                  {classStat.warnings.includes('reports_missing')
                                    ? 'Hesabat yoxdur'
                                    : 'Aşağı davamiyyət'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Normal</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sinif məlumatı tapılmadı.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
