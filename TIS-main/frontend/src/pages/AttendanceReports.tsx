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
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BookOpen,
  PieChart,
  School as SchoolIcon,
  Users
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { keepPreviousData } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance';
import { institutionService } from '@/services/institutions';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { az } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { USER_ROLES } from '@/constants/roles';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TablePagination } from '@/components/common/TablePagination';

const formatClassLabel = (value?: string | null, level?: number | string | null): string => {
  const base = level !== undefined && level !== null && value
    ? `${level}-${value}`
    : value ?? '';
  const trimmed = base.trim();
  if (!trimmed) return '-';
  const match = trimmed.match(/^(\d+)\s*[-\s]?([A-Za-zƏəÖöÜüÇçĞğİıŞş]+)$/);
  if (match) {
    return `${match[1]}-${match[2].toLowerCase()}`;
  }
  return trimmed;
};

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

interface AttendanceRecord {
  id: number;
  date: string;
  school_name?: string;
  class_name: string;
  start_count: number;
  end_count: number;
  attendance_rate: number;
  uniform_violation?: number;
  uniform_compliance_rate?: number;
  notes?: string;
  total_students?: number;
  grade_level?: number;
  first_session_absent?: number;
  last_session_absent?: number;
  morning_attendance_rate?: number;
  evening_attendance_rate?: number;
  morning_notes?: string | null;
  evening_notes?: string | null;
  date_label?: string;
  range_start?: string;
  range_end?: string;
  record_count?: number;
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
  total_uniform_violations?: number;
  uniform_compliance_rate?: number;
  uniform_violation_rate?: number;
  total_days: number;
  total_records: number;
}

const DEFAULT_PER_PAGE = 20;
const AGGREGATION_FETCH_LIMIT = 500;

export default function AttendanceReports({ embedded = false }: { embedded?: boolean } = {}) {
  const { currentUser } = useAuth();
  const {
    canAccess,
    isSuperAdmin,
    isRegionAdmin,
    isSektorAdmin,
    isSchoolAdmin
  } = useRoleCheck();
  const attendanceAccess = useModuleAccess('attendance');
  const hasAccess = attendanceAccess.canView;

  // Derived defaults
  const defaultDateRange = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    return {
      start: today,
      end: today
    };
  }, []);

  // State hooks - all at the top
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<string>(defaultDateRange.start);
  const [endDate, setEndDate] = useState<string>(defaultDateRange.end);
  type DatePresetKey = 'today' | 'thisWeek' | 'thisMonth' | 'custom';
  type PresetOption = Exclude<DatePresetKey, 'custom'>;
  const [activeDatePreset, setActiveDatePreset] = useState<DatePresetKey>('today');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(DEFAULT_PER_PAGE);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'date' | 'class_name' | 'attendance_rate'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const isDailyView = reportType === 'daily';

  // Get current user's institution for filtering
  const userInstitutionId = currentUser?.institution?.id;

  useEffect(() => {
    setPage(1);
  }, [selectedSchool, selectedClass, startDate, endDate, reportType]);

  const canLoadSchools =
    canAccess([USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]) ||
    attendanceAccess.canManage;

  // Load schools data (only for higher admins) - use enabled prop
  const { data: schoolsResponse, error: schoolsError } = useQuery({
    queryKey: ['institutions', 'schools', currentUser?.role, currentUser?.institution?.id],
    queryFn: () => institutionService.getAll(),
    enabled: hasAccess && canLoadSchools
  });

  const schools = useMemo(() => {
    if (!schoolsResponse?.data) return [];
    const data = Array.isArray(schoolsResponse.data) ? schoolsResponse.data : [];
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
        label: 'Gün',
        getRange: () => {
          const today = format(new Date(), 'yyyy-MM-dd');
          return { start: today, end: today };
        }
      },
      {
        id: 'thisWeek',
        label: 'Həftə',
        getRange: () => {
          const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          return { start, end };
        }
      },
      {
        id: 'thisMonth',
        label: 'Ay',
        getRange: () => {
          const now = new Date();
          const start = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
          const end = format(new Date(), 'yyyy-MM-dd');
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
  } = useQuery<any, Error>({
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
      isDailyView ? perPage : AGGREGATION_FETCH_LIMIT,
      sortField,
      sortDirection
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

      filters.group_by = reportType;
      filters.sort_field = sortField;
      filters.sort_direction = sortDirection;

      return attendanceService.getAttendanceReports(filters);
    },
    enabled: hasAccess,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    retry: 1,
  });

  // Load attendance stats - use enabled prop
  const {
    data: statsResponse,
    isLoading: statsLoading,
    error: statsError
  } = useQuery<any, Error>({
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
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const attendanceData: AttendanceRecord[] = attendanceResponse?.data || [];
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

  const attendanceStats: AttendanceStats = statsResponse?.data || {
    total_students: 0,
    average_attendance: 0,
    trend_direction: 'stable',
    total_uniform_violations: 0,
    uniform_compliance_rate: 0,
    uniform_violation_rate: 0,
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
  // Load class options for the selected school scope
  const {
    data: fetchedClassOptions,
    isLoading: classOptionsLoading,
    error: classOptionsError
  } = useQuery<string[] | null, Error>({
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

  const displayRecords = attendanceData;

  // Security check after all hooks
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu bölməni görmək üçün Davamiyyət icazəsi (`attendance.read`) tələb olunur.
          </p>
        </div>
      </div>
    );
  }

  const handleExportReport = async () => {
    console.log('[Export] Button clicked');
    if (isExporting) {
      console.log('[Export] Already exporting, returning');
      return;
    }
    setIsExporting(true);
    console.log('[Export] Starting export...');
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

      filters.group_by = reportType;

      console.log('[Export] Calling API with filters:', filters);
      const blob = await attendanceService.exportAttendance(filters);
      console.log('[Export] Blob received:', { type: blob.type, size: blob.size });

      // Create download link exactly like region admin does
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `davamiyyet_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      console.log('[Export] Download triggered');
      
      toast.success('Hesabat uğurla export edildi');
    } catch (error) {
      console.error('[Export] Error:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsExporting(false);
      console.log('[Export] Finished');
    }
  };

  const handleResetFilters = () => {
    setSelectedSchool('all');
    setSelectedClass('all');
    handlePresetSelect('today');
    setReportType('daily');
    setPage(1);
    setPerPage(DEFAULT_PER_PAGE);
    setSortField('date');
    setSortDirection('desc');
  };

  const handleSortChange = (field: 'date' | 'class_name' | 'attendance_rate') => {
    setSortField(field);
    setSortDirection((prev) => {
      if (sortField === field) {
        return prev === 'asc' ? 'desc' : 'asc';
      }
      return 'asc';
    });
    setPage(1);
  };

  const getErrorMessage = (error: unknown) => {
    if (!error) return '';
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Gözlənilməz xəta baş verdi.';
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {!embedded && (
        <>
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Davamiyyət hesabatları</h1>
            <p className="text-sm text-muted-foreground">
              Detallı davamiyyət analizi və statistika
              {(currentUser?.institution?.name || currentUser?.department?.name || currentUser?.region?.name) && (
                <span className="text-muted-foreground">
                  {' '}·{' '}
                  {currentUser?.institution?.name || currentUser?.department?.name || currentUser?.region?.name}
                </span>
              )}
            </p>
          </div>
        </>
      )}

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

      {/* Filters - Move to top for school admin */}
      {isSchoolAdmin && (
        <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filterlər</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handlePresetSelect('today');
                    refetch();
                  }}
                  disabled={attendanceLoading || isRefetchingAttendance}
                  className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {isRefetchingAttendance ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                  )}
                  {isRefetchingAttendance ? 'Yenilənir...' : 'Yenilə'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportReport}
                  disabled={isExporting}
                  className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1.5" />
                  )}
                  {isExporting ? 'Export olunur...' : 'Eksport (Excel)'}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlanğıc tarixi</Label>
                <Input
                  type="date"
                  className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
                  value={startDate}
                  onChange={(e) => {
                    setActiveDatePreset('custom');
                    setStartDate(e.target.value);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Son tarix</Label>
                <Input
                  type="date"
                  className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
                  value={endDate}
                  onChange={(e) => {
                    setActiveDatePreset('custom');
                    setEndDate(e.target.value);
                  }}
                  min={startDate}
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sinif</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
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

              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hesabat növü</Label>
                <Select value={reportType} onValueChange={(value) => setReportType(value as 'daily' | 'weekly' | 'monthly')}>
                  <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Günlük</SelectItem>
                    <SelectItem value="weekly">Həftəlik</SelectItem>
                    <SelectItem value="monthly">Aylıq</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mt-5">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeDatePreset === preset.id
                          ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                          : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-not-allowed ${
                      activeDatePreset === 'custom'
                        ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                        : 'text-slate-400'
                    }`}
                  >
                    Fərdi
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {!isSchoolAdmin && (
        <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filterlər</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handlePresetSelect('today');
                    refetch();
                  }}
                  disabled={attendanceLoading || isRefetchingAttendance}
                  className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {isRefetchingAttendance ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                  )}
                  {isRefetchingAttendance ? 'Yenilənir...' : 'Yenilə'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportReport}
                  disabled={isExporting}
                  className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1.5" />
                  )}
                  {isExporting ? 'Export olunur...' : 'Eksport (Excel)'}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlanğıc tarixi</Label>
                <Input
                  type="date"
                  className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
                  value={startDate}
                  onChange={(e) => {
                    setActiveDatePreset('custom');
                    setStartDate(e.target.value);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Son tarix</Label>
                <Input
                  type="date"
                  className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
                  value={endDate}
                  onChange={(e) => {
                    setActiveDatePreset('custom');
                    setEndDate(e.target.value);
                  }}
                  min={startDate}
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sinif</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
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

              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hesabat növü</Label>
                <Select value={reportType} onValueChange={(value) => setReportType(value as 'daily' | 'weekly' | 'monthly')}>
                  <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Günlük</SelectItem>
                    <SelectItem value="weekly">Həftəlik</SelectItem>
                    <SelectItem value="monthly">Aylıq</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mt-5">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                        activeDatePreset === preset.id
                          ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                          : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-not-allowed ${
                      activeDatePreset === 'custom'
                        ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                        : 'text-slate-400'
                    }`}
                  >
                    Fərdi
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {statsError ? (
        <Alert variant="destructive">
          <AlertTitle>Statistika yüklənmədi</AlertTitle>
          <AlertDescription>{getErrorMessage(statsError)}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_26px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#2563eb]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500">Ümumi qeyd</CardTitle>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br from-[#2563eb] to-[#60a5fa]">
                <FileText className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-[#1d4ed8]">{attendanceStats.total_records}</div>
              <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {attendanceStats.total_days} tədris günü
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_26px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#10b981]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500">Orta davamiyyət</CardTitle>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br from-[#10b981] to-[#6ee7b7]">
                <BarChart3 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-[#047857]">
                {statsLoading && !statsResponse ? <Loader2 className="h-6 w-6 animate-spin" /> : `${attendanceStats.average_attendance}%`}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {attendanceStats.total_students} şagird üzrə
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_26px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#6366f1]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500">Məktəbli forma</CardTitle>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br from-[#6366f1] to-[#a5b4fc]">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-[#3730a3]">
                {statsLoading && !statsResponse ? <Loader2 className="h-6 w-6 animate-spin" /> : `${Number(attendanceStats.uniform_compliance_rate ?? 0).toFixed(1)}%`}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {Number(attendanceStats.total_uniform_violations ?? 0)} pozuntu
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_26px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#7c3aed]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500">Dinamika</CardTitle>
              {attendanceStats.trend_direction === 'up' ? (
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br from-[#10b981] to-[#6ee7b7]">
                  <TrendingUp className="h-5 w-5" />
                </div>
              ) : attendanceStats.trend_direction === 'down' ? (
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br from-[#ef4444] to-[#fda4af]">
                  <TrendingDown className="h-5 w-5" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br from-[#7c3aed] to-[#c084fc]">
                  <PieChart className="h-5 w-5" />
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-base font-extrabold ${
                attendanceStats.trend_direction === 'up' ? 'text-[#047857]' : 
                attendanceStats.trend_direction === 'down' ? 'text-[#be123c]' : 'text-[#6d28d9]'
              }`}>
                {activeTrendCopy.label}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1 line-clamp-2">
                {activeTrendCopy.description}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_26px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#f59e0b]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500">Hesabat dövrü</CardTitle>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br from-[#f97316] to-[#facc15]">
                <CalendarIcon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-extrabold flex flex-wrap gap-1 text-[#b45309]">
                <span>{format(new Date(startDate), 'dd MMM', { locale: az })}</span>
                <span className="text-muted-foreground font-normal">→</span>
                <span>{format(new Date(endDate), 'dd MMM', { locale: az })}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                {activeDatePreset === 'custom' ? 'Fərdi seçim' : datePresets.find(p => p.id === activeDatePreset)?.label}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {!isSchoolAdmin && (
        <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filterlər</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  handlePresetSelect('today');
                  refetch();
                }}
                disabled={attendanceLoading || isRefetchingAttendance}
                className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
              >
                {isRefetchingAttendance ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                )}
                {isRefetchingAttendance ? 'Yenilənir...' : 'Yenilə'}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportReport}
                disabled={isExporting}
                className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5" />
                )}
                {isExporting ? 'Export olunur...' : 'Eksport (Excel)'}
              </Button>
            </div>
          </div>

          <div className="flex gap-3 items-end flex-wrap">
            {/* School filter - only for non-school admins */}
            {!isSchoolAdmin && (
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Məktəb</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
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

            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sinif</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
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

            <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hesabat növü</Label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as 'daily' | 'weekly' | 'monthly')}>
                <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="weekly">Həftəlik</SelectItem>
                  <SelectItem value="monthly">Aylıq</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tarix aralığı</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
                  value={startDate}
                  onChange={(e) => {
                    setActiveDatePreset('custom');
                    setStartDate(e.target.value);
                  }}
                />
                <span className="text-slate-400 text-xs">-</span>
                <Input
                  type="date"
                  className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
                  value={endDate}
                  onChange={(e) => {
                    setActiveDatePreset('custom');
                    setEndDate(e.target.value);
                  }}
                  min={startDate}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hazır intervallar</Label>
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                {datePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                      activeDatePreset === preset.id
                        ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                        : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-not-allowed ${
                    activeDatePreset === 'custom'
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                      : 'text-slate-400'
                  }`}
                >
                  Fərdi
                </button>
              </div>
            </div>
          </div>
        </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Davamiyyət Qeydləri</CardTitle>
          <p className="text-sm text-muted-foreground">
            {displayRecords.length} {reportType === 'daily' ? 'günlük' : reportType === 'weekly' ? 'həftəlik' : 'aylıq'} qeyd tapıldı
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSortChange('date')} 
                      className="px-0 hover:bg-transparent font-bold flex items-center gap-1"
                    >
                      Tarix
                      <ArrowUpDown className={`h-4 w-4 ${sortField === 'date' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                    </Button>
                  </TableHead>
                  {!isSchoolAdmin && <TableHead>Məktəb</TableHead>}
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSortChange('class_name')} 
                      className="px-0 hover:bg-transparent font-bold flex items-center gap-1"
                    >
                      Sinif
                      <ArrowUpDown className={`h-4 w-4 ${sortField === 'class_name' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Səhər (İştirak)</TableHead>
                  <TableHead className="text-center">Günorta (İştirak)</TableHead>
                  <TableHead className="text-center w-[180px]">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSortChange('attendance_rate')} 
                      className="px-0 hover:bg-transparent font-bold flex items-center gap-1 mx-auto"
                    >
                      Davamiyyət %
                      <ArrowUpDown className={`h-4 w-4 ${sortField === 'attendance_rate' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center w-[160px]">Məktəbli forması</TableHead>
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
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    </TableRow>
                  ))
                ) : displayRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSchoolAdmin ? 7 : 8} className="text-center py-8 text-muted-foreground">
                      Seçilmiş kriteriyalara uyğun məlumat tapılmadı
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRecords.map((record: AttendanceRecord, index: number) => {
                    const formattedDate =
                      record.date_label && reportType !== 'daily'
                        ? record.date_label
                        : format(new Date(record.date), 'dd.MM.yyyy', { locale: az });
                    const startCount = typeof record.start_count === 'number' ? record.start_count : 0;
                    const endCount = typeof record.end_count === 'number' ? record.end_count : 0;
                    const totalStudents = record.total_students;
                    const attendanceRate = typeof record.attendance_rate === 'number' ? record.attendance_rate : 0;
                    const attendanceTone =
                      attendanceRate >= 95
                        ? 'text-green-600'
                        : attendanceRate >= 85
                        ? 'text-yellow-600'
                        : 'text-red-600';
                    const noteHints = [
                      record.morning_notes ? `İlk dərs: ${record.morning_notes}` : null,
                      record.evening_notes ? `Son dərs: ${record.evening_notes}` : null,
                    ].filter(Boolean);
                    const combinedNotes = record.notes || (noteHints.length ? noteHints.join(' | ') : null);
                    const formattedClassName = formatClassLabel(record.class_name, record.grade_level);

                    const uniformComplianceRate = Number(record.uniform_compliance_rate ?? 0);
                    const uniformViolations = Number(record.uniform_violation ?? 0);
                    const uniformTone =
                      uniformComplianceRate >= 95
                        ? 'text-emerald-600'
                        : uniformComplianceRate >= 85
                        ? 'text-amber-600'
                        : 'text-rose-600';

                    return (
                    <TableRow key={`${reportType}-${record.id ?? index}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{formattedDate}</span>
                          {reportType !== 'daily' && record.record_count && (
                            <span className="text-[10px] text-muted-foreground italic">
                              {record.record_count} qeyd
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {!isSchoolAdmin && (
                        <TableCell className="font-medium text-blue-600">
                          <div className="flex items-center gap-2">
                            <SchoolIcon className="h-4 w-4 opacity-50" />
                            {record.school?.name || record.school_name}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="font-bold border-blue-200 bg-blue-50/30 text-blue-700">
                          {formattedClassName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <div className="font-bold text-base">{startCount}</div>
                          {typeof totalStudents === 'number' && totalStudents > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              cəmi {totalStudents}
                            </span>
                          )}
                          {typeof record.first_session_absent === 'number' && record.first_session_absent > 0 && (
                            <Badge variant="secondary" className="mt-1 h-4 px-1 text-[10px] bg-rose-50 text-rose-600 border-rose-100">
                              -{record.first_session_absent} qayıb
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <div className="font-bold text-base">{endCount}</div>
                          {typeof totalStudents === 'number' && totalStudents > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              cəmi {totalStudents}
                            </span>
                          )}
                          {typeof record.last_session_absent === 'number' && record.last_session_absent > 0 && (
                            <Badge variant="secondary" className="mt-1 h-4 px-1 text-[10px] bg-rose-50 text-rose-600 border-rose-100">
                              -{record.last_session_absent} qayıb
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 w-full max-w-[140px] mx-auto">
                          <div className="flex justify-between items-center px-1">
                            <span className={`text-xs font-bold ${attendanceTone}`}>
                              {attendanceRate}%
                            </span>
                          </div>
                          <Progress 
                            value={attendanceRate} 
                            className={`h-1.5 ${
                              attendanceRate >= 95 ? '[&>div]:bg-emerald-500' : 
                              attendanceRate >= 85 ? '[&>div]:bg-amber-500' : '[&>div]:bg-rose-500'
                            }`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${uniformTone}`}>
                            {formatPercent(uniformComplianceRate)} ({uniformViolations})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-muted-foreground line-clamp-2 italic" title={combinedNotes || ''}>
                            {combinedNotes || '-'}
                          </div>
                          {uniformViolations > 0 && (
                            <span className="text-[10px] text-muted-foreground">Forma pozuntusu: {uniformViolations}</span>
                          )}
                        </div>
                      </TableCell>
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
