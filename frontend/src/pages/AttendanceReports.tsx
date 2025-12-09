import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  CalendarIcon,
  BarChart3,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { attendanceService } from '@/services/attendance';
import { institutionService } from '@/services/institutions';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { az } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TablePagination } from '@/components/common/TablePagination';

interface AttendanceRecord {
  id: number;
  date: string;
  school_name: string;
  class_name: string;
  start_count: number;
  end_count: number;
  attendance_rate: number;
  notes?: string;
  school?: {
    id: number;
    name: string;
    type: string;
  };
}

interface AttendanceStats {
  total_students: number;
  average_attendance: number;
  trend_direction: 'up' | 'down' | 'stable';
  total_days: number;
  total_records: number;
}

const DEFAULT_PER_PAGE = 20;
const AGGREGATION_FETCH_LIMIT = 500;

export default function AttendanceReports() {
  const { currentUser } = useAuth();
  const {
    canAccess,
    isSuperAdmin,
    isRegionAdmin,
    isSektorAdmin,
    isSchoolAdmin
  } = useRoleCheck();

  // Security check - only educational administrative roles can access attendance reports
  const allowedRoles = [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM];
  const hasAccess = canAccess(allowedRoles);

  // Derived defaults
  const defaultDateRange = useMemo(() => {
    const now = new Date();
    return {
      start: format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd')
    };
  }, []);

  // State hooks - all at the top
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<string>(defaultDateRange.start);
  const [endDate, setEndDate] = useState<string>(defaultDateRange.end);
  type DatePresetKey = 'today' | 'thisWeek' | 'thisMonth' | 'last30' | 'custom';
  type PresetOption = Exclude<DatePresetKey, 'custom'>;
  const [activeDatePreset, setActiveDatePreset] = useState<DatePresetKey>('thisMonth');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(DEFAULT_PER_PAGE);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const isDailyView = reportType === 'daily';

  // Get current user's institution for filtering
  const userInstitutionId = currentUser?.institution?.id;

  useEffect(() => {
    setPage(1);
  }, [selectedSchool, selectedClass, startDate, endDate, reportType]);

  // Load schools data (only for higher admins) - use enabled prop
  const { data: schoolsResponse, error: schoolsError } = useQuery({
    queryKey: ['institutions', 'schools', currentUser?.role, currentUser?.institution?.id],
    queryFn: () => institutionService.getAll(),
    enabled: hasAccess && (isSuperAdmin || isRegionAdmin || isSektorAdmin)
  });

  const schools = useMemo(() => {
    if (!schoolsResponse?.success || !schoolsResponse.data) return [];
    const data = Array.isArray(schoolsResponse.data) ? schoolsResponse.data : schoolsResponse.data.data || [];
    return data.filter((institution: any) =>
      ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'].includes(institution.type)
    );
  }, [schoolsResponse]);

  const targetSchoolIdForClasses = isSchoolAdmin
    ? userInstitutionId
    : selectedSchool !== 'all'
    ? parseInt(selectedSchool, 10)
    : undefined;

  const datePresets: { id: PresetOption; label: string; getRange: () => { start: string; end: string } }[] = useMemo(
    () => [
      {
        id: 'today',
        label: 'Bugün',
        getRange: () => {
          const today = format(new Date(), 'yyyy-MM-dd');
          return { start: today, end: today };
        }
      },
      {
        id: 'thisWeek',
        label: 'Bu həftə',
        getRange: () => {
          const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          return { start, end };
        }
      },
      {
        id: 'thisMonth',
        label: 'Bu ay',
        getRange: () => {
          const now = new Date();
          const start = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
          const end = format(new Date(), 'yyyy-MM-dd');
          return { start, end };
        }
      },
      {
        id: 'last30',
        label: 'Son 30 gün',
        getRange: () => {
          const end = format(new Date(), 'yyyy-MM-dd');
          const start = format(subDays(new Date(), 29), 'yyyy-MM-dd');
          return { start, end };
        }
      }
    ],
    []
  );

  const handlePresetSelect = (presetId: PresetOption) => {
    const preset = datePresets.find((item) => item.id === presetId);
    if (!preset) return;
    const range = preset.getRange();
    setActiveDatePreset(presetId);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  // Load attendance data - use enabled prop
  const {
    data: attendanceResponse,
    isLoading: attendanceLoading,
    isFetching: attendanceFetching,
    error: attendanceError,
    refetch
  } = useQuery({
    queryKey: [
      'attendance-reports',
      selectedSchool,
      selectedClass,
      startDate,
      endDate,
      reportType,
      currentUser?.role,
      currentUser?.institution?.id,
      isDailyView ? page : 'all',
      isDailyView ? perPage : AGGREGATION_FETCH_LIMIT
    ],
    queryFn: () => {
      const filters: any = {
        start_date: startDate,
        end_date: endDate
      };

      // For school admin, only show their school's data
      if (isSchoolAdmin && userInstitutionId) {
        filters.school_id = userInstitutionId;
      } else if (selectedSchool !== 'all') {
        filters.school_id = parseInt(selectedSchool);
      }

      if (selectedClass !== 'all') {
        filters.class_name = selectedClass;
      }

      if (isDailyView) {
        filters.page = page;
        filters.per_page = perPage;
      } else {
        filters.page = 1;
        filters.per_page = AGGREGATION_FETCH_LIMIT;
      }

      return attendanceService.getAttendanceRecords(filters);
    },
    enabled: hasAccess,
    keepPreviousData: true,
    staleTime: 60 * 1000,
    retry: 1,
  });

  // Load attendance stats - use enabled prop
  const {
    data: statsResponse,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['attendance-stats-reports', selectedSchool, startDate, endDate, currentUser?.role, currentUser?.institution?.id],
    queryFn: () => {
      const filters: any = {
        start_date: startDate,
        end_date: endDate
      };

      if (isSchoolAdmin && userInstitutionId) {
        filters.school_id = userInstitutionId;
      } else if (selectedSchool !== 'all') {
        filters.school_id = parseInt(selectedSchool);
      }

      return attendanceService.getAttendanceStats(filters);
    },
    enabled: hasAccess,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const attendanceData = attendanceResponse?.data || [];
  const attendanceMeta = attendanceResponse?.meta;
  const totalRecords = attendanceMeta?.total ?? attendanceData.length;
  const paginationPerPage = attendanceMeta?.per_page ?? perPage;
  const paginationCurrentPage = attendanceMeta?.current_page ?? page;
  const paginationTotalPages =
    attendanceMeta?.last_page ?? Math.max(1, Math.ceil(totalRecords / (paginationPerPage || 1)));
  const paginationStartIndex = attendanceMeta?.from
    ? Math.max(attendanceMeta.from - 1, 0)
    : (paginationCurrentPage - 1) * paginationPerPage;
  const paginationEndIndex = attendanceMeta?.to ?? Math.min(paginationStartIndex + attendanceData.length, totalRecords);
  const shouldShowPagination = isDailyView && totalRecords > paginationPerPage;
  const isRefetchingAttendance = attendanceFetching && !attendanceLoading;

  const attendanceStats = statsResponse?.data || {
    total_students: 0,
    average_attendance: 0,
    trend_direction: 'stable' as const,
    total_days: 0,
    total_records: 0
  };
  const trendCopy: Record<'up' | 'down' | 'stable', { label: string; description: string }> = {
    up: {
      label: 'Artan trend',
      description: 'Son dövrdə davamiyyət göstəriciləri yüksəlir.'
    },
    down: {
      label: 'Azalan trend',
      description: 'Son dövrdə davamiyyət əvvəlki aralığa nisbətən zəifləyib.'
    },
    stable: {
      label: 'Sabit trend',
      description: 'Davamiyyət göstəricilərində ciddi dəyişiklik yoxdur.'
    }
  };
  const activeTrendCopy = trendCopy[attendanceStats.trend_direction];

  // Determine school label for grouped records
  const activeSchoolName = useMemo(() => {
    if (isSchoolAdmin && currentUser?.institution?.name) {
      return currentUser.institution.name;
    }

    if (!isSchoolAdmin && selectedSchool !== 'all') {
      const found = schools.find((school) => school.id.toString() === selectedSchool);
      return found?.name ?? 'Seçilmiş məktəb';
    }

    return 'Bütün məktəblər';
  }, [isSchoolAdmin, currentUser, selectedSchool, schools]);

  // Load class options for the selected school scope
  const {
    data: fetchedClassOptions,
    isLoading: classOptionsLoading,
    error: classOptionsError
  } = useQuery({
    queryKey: ['attendance-class-options', targetSchoolIdForClasses ?? 'all'],
    queryFn: () => attendanceService.getSchoolClasses(targetSchoolIdForClasses),
    enabled: hasAccess && (!!targetSchoolIdForClasses || !isSchoolAdmin),
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Get unique classes from filtered data as fallback
  const fallbackClasses = useMemo(() => {
    const classes = [...new Set(attendanceData.map((record: AttendanceRecord) => record.class_name))];
    return classes.sort();
  }, [attendanceData]);

  const classOptions = useMemo(() => {
    const optionSet = new Set<string>();
    (fetchedClassOptions || []).forEach((cls) => {
      if (cls) optionSet.add(cls);
    });
    fallbackClasses.forEach((cls) => {
      if (cls) optionSet.add(cls);
    });
    if (selectedClass !== 'all') {
      optionSet.add(selectedClass);
    }
    return Array.from(optionSet).sort((a, b) => a.localeCompare(b, 'az', { numeric: true }));
  }, [fetchedClassOptions, fallbackClasses, selectedClass]);

  const classLabel = selectedClass !== 'all' ? selectedClass : 'Bütün siniflər';

  const groupedAttendance = useMemo(() => {
    const parsedRecords = attendanceData
      .map((record: AttendanceRecord) => ({
        ...record,
        dateObj: new Date(record.date),
      }))
      .filter((record) => !Number.isNaN(record.dateObj.getTime()));

    const aggregate = (groupType: 'weekly' | 'monthly') => {
      const buckets = new Map<
        string,
        {
          start: Date;
          end: Date;
          totalStart: number;
          totalEnd: number;
          totalRate: number;
          count: number;
        }
      >();

      parsedRecords.forEach((record) => {
        const rangeStart =
          groupType === 'weekly'
            ? startOfWeek(record.dateObj, { weekStartsOn: 1 })
            : startOfMonth(record.dateObj);
        const rangeEnd =
          groupType === 'weekly'
            ? endOfWeek(record.dateObj, { weekStartsOn: 1 })
            : endOfMonth(record.dateObj);
        const key =
          groupType === 'weekly'
            ? format(rangeStart, 'yyyy-MM-dd')
            : format(rangeStart, 'yyyy-MM');

        if (!buckets.has(key)) {
          buckets.set(key, {
            start: rangeStart,
            end: rangeEnd,
            totalStart: 0,
            totalEnd: 0,
            totalRate: 0,
            count: 0,
          });
        }

        const bucket = buckets.get(key)!;
        bucket.totalStart += record.start_count;
        bucket.totalEnd += record.end_count;
        bucket.totalRate += record.attendance_rate;
        bucket.count += 1;
      });

      return Array.from(buckets.entries())
        .sort((a, b) => b[1].start.getTime() - a[1].start.getTime())
        .map(([, bucket], index) => ({
          id: index + 1,
          date: bucket.start.toISOString(),
          dateLabel:
            groupType === 'weekly'
              ? `${format(bucket.start, 'dd.MM', { locale: az })} - ${format(bucket.end, 'dd.MM.yyyy', { locale: az })}`
              : format(bucket.start, 'MMMM yyyy', { locale: az }),
          school_name: activeSchoolName,
          class_name: classLabel,
          start_count: bucket.totalStart,
          end_count: bucket.totalEnd,
          attendance_rate: bucket.count > 0 ? Math.round(bucket.totalRate / bucket.count) : 0,
          notes: `${bucket.count} qeyd`,
        }));
    };

    return {
      daily: attendanceData,
      weekly: aggregate('weekly'),
      monthly: aggregate('monthly'),
    };
  }, [attendanceData, activeSchoolName, classLabel]);

  const displayRecords =
    reportType === 'weekly'
      ? groupedAttendance.weekly
      : reportType === 'monthly'
      ? groupedAttendance.monthly
      : groupedAttendance.daily;

  // Security check after all hooks
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız təhsil idarəçiləri və müəllimlər daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  const handleExportReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const filters: any = {
        start_date: startDate,
        end_date: endDate
      };

      if (isSchoolAdmin && userInstitutionId) {
        filters.school_id = userInstitutionId;
      } else if (selectedSchool !== 'all') {
        filters.school_id = parseInt(selectedSchool);
      }

      if (selectedClass !== 'all') {
        filters.class_name = selectedClass;
      }

      const blob = await attendanceService.exportAttendance(filters);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `davamiyyət-hesabatı-${format(new Date(), 'dd-MM-yyyy')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Hesabat uğurla export edildi');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedSchool('all');
    setSelectedClass('all');
    handlePresetSelect('thisMonth');
    setReportType('daily');
    setPage(1);
    setPerPage(DEFAULT_PER_PAGE);
  };

  const getErrorMessage = (error: unknown) => {
    if (!error) return '';
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Gözlənilməz xəta baş verdi.';
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Davamiyyət Hesabatları</h1>
          <p className="text-muted-foreground">
            Detallı davamiyyət analizi və statistika 
            {isSchoolAdmin && currentUser?.institution && (
              <span className="text-blue-600 font-medium"> - {currentUser.institution.name}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={attendanceLoading || isRefetchingAttendance}
          >
            {isRefetchingAttendance ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            {isRefetchingAttendance ? 'Yenilənir...' : 'Yenilə'}
          </Button>
          <Button onClick={handleExportReport} disabled={isExporting || attendanceData.length === 0}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Export olunur...' : 'Export'}
          </Button>
        </div>
      </div>

      {attendanceError && (
        <Alert variant="destructive">
          <AlertTitle>Davamiyyət məlumatı yüklənmədi</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{getErrorMessage(attendanceError)}</span>
            <Button size="sm" onClick={() => refetch()} variant="secondary">
              Yenidən cəhd et
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {schoolsError && (
        <Alert variant="destructive">
          <AlertTitle>Məktəblər siyahısı yüklənmədi</AlertTitle>
          <AlertDescription>{getErrorMessage(schoolsError)}</AlertDescription>
        </Alert>
      )}
      {classOptionsError && (
        <Alert variant="destructive">
          <AlertTitle>Sinif siyahısı yüklənə bilmədi</AlertTitle>
          <AlertDescription>{getErrorMessage(classOptionsError)}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {statsError ? (
        <Alert variant="destructive">
          <AlertTitle>Statistika yüklənmədi</AlertTitle>
          <AlertDescription>{getErrorMessage(statsError)}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ümumi Qeyd</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceStats.total_records}</div>
              <p className="text-xs text-muted-foreground">
                {attendanceStats.total_days} gün
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orta Davamiyyət</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading && !statsResponse ? <Loader2 className="h-5 w-5 animate-spin" /> : `${attendanceStats.average_attendance}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                {attendanceStats.total_students} şagird
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trend</CardTitle>
              {attendanceStats.trend_direction === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : attendanceStats.trend_direction === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <BarChart3 className="h-4 w-4 text-blue-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-semibold ${
                attendanceStats.trend_direction === 'up' ? 'text-green-600' : 
                attendanceStats.trend_direction === 'down' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {activeTrendCopy.label}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTrendCopy.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dövr</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(new Date(startDate), 'dd.MM', { locale: az })} - {format(new Date(endDate), 'dd.MM', { locale: az })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filterlər
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* School filter - only for non-school admins */}
            {!isSchoolAdmin && (
              <div className="space-y-2">
                <Label>Məktəb</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Məktəb seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün məktəblər</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id.toString()}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Sinif</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder={classOptionsLoading ? 'Yüklənir...' : 'Sinif seçin'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün siniflər</SelectItem>
                  {classOptions.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hesabat növü</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="weekly">Həftəlik</SelectItem>
                  <SelectItem value="monthly">Aylıq</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Başlanğıc tarixi</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setActiveDatePreset('custom');
                  setStartDate(e.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Son tarix</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setActiveDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                min={startDate}
              />
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label>Hazır intervallar</Label>
              <div className="flex flex-wrap gap-2">
                {datePresets.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={activeDatePreset === preset.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetSelect(preset.id)}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={activeDatePreset === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveDatePreset('custom')}
                  disabled={activeDatePreset === 'custom'}
                >
                  Fərdi
                </Button>
              </div>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleResetFilters} className="w-full">
                Sıfırla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Davamiyyət Qeydləri</CardTitle>
          <p className="text-sm text-muted-foreground">
            {displayRecords.length} {reportType === 'daily' ? 'günlük' : reportType === 'weekly' ? 'həftəlik' : 'aylıq'} qeyd tapıldı
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarix</TableHead>
                  {!isSchoolAdmin && <TableHead>Məktəb</TableHead>}
                  <TableHead>Sinif</TableHead>
                  <TableHead className="text-center">Başlanğıc</TableHead>
                  <TableHead className="text-center">Son</TableHead>
                  <TableHead className="text-center">Davamiyyət %</TableHead>
                  <TableHead>Qeydlər</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      {!isSchoolAdmin && <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>}
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    </TableRow>
                  ))
                ) : displayRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSchoolAdmin ? 6 : 7} className="text-center py-8 text-muted-foreground">
                      Seçilmiş kriteriyalara uyğun məlumat tapılmadı
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRecords.map((record: AttendanceRecord & { dateLabel?: string }, index: number) => {
                    const formattedDate = record.dateLabel
                      ? record.dateLabel
                      : format(new Date(record.date), 'dd.MM.yyyy', { locale: az });

                    return (
                    <TableRow key={`${reportType}-${record.id ?? index}`}>
                      <TableCell>
                        {formattedDate}
                      </TableCell>
                      {!isSchoolAdmin && (
                        <TableCell className="font-medium">
                          {record.school?.name || record.school_name}
                        </TableCell>
                      )}
                      <TableCell>{record.class_name}</TableCell>
                      <TableCell className="text-center">{record.start_count}</TableCell>
                      <TableCell className="text-center">{record.end_count}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${
                          record.attendance_rate >= 95 
                            ? 'text-green-600' 
                            : record.attendance_rate >= 85 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                        }`}>
                          {record.attendance_rate}%
                        </span>
                      </TableCell>
                      <TableCell>{record.notes || '-'}</TableCell>
                    </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {shouldShowPagination && (
            <TablePagination
              currentPage={paginationCurrentPage}
              totalPages={paginationTotalPages}
              totalItems={totalRecords}
              itemsPerPage={paginationPerPage}
              startIndex={paginationStartIndex}
              endIndex={paginationEndIndex}
              onPageChange={setPage}
              onItemsPerPageChange={(value) => {
                setPerPage(value);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
