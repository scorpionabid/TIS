import { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { attendanceService } from '@/services/attendance';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { USER_ROLES } from '@/constants/roles';
import { toast } from 'sonner';

const DEFAULT_PER_PAGE = 20;
const AGGREGATION_FETCH_LIMIT = 500;

export function useAttendanceReports() {
  const { currentUser } = useAuth();
  const { canAccess, isSchoolAdmin } = useRoleCheck();
  const attendanceAccess = useModuleAccess('attendance');
  const hasAccess = attendanceAccess.canView;

  const defaultDateRange = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    return { start: today, end: today };
  }, []);

  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<string>(defaultDateRange.start);
  const [endDate, setEndDate] = useState<string>(defaultDateRange.end);
  const [activeDatePreset, setActiveDatePreset] = useState<string>('today');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(DEFAULT_PER_PAGE);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'date' | 'class_name' | 'attendance_rate'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const isDailyView = reportType === 'daily';
  const userInstitutionId = currentUser?.institution?.id;

  useEffect(() => {
    setPage(1);
  }, [selectedSchool, selectedClass, startDate, endDate, reportType]);

  const canLoadSchools = canAccess([USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]) || attendanceAccess.canManage;

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

  const targetSchoolIdForClasses = isSchoolAdmin ? userInstitutionId : (selectedSchool !== 'all' ? parseInt(selectedSchool, 10) : undefined);

  const {
    data: attendanceResponse,
    isLoading: attendanceLoading,
    isFetching: attendanceFetching,
    error: attendanceError,
    refetch
  } = useQuery<any, Error>({
    queryKey: ['attendance-reports', selectedSchool, selectedClass, startDate, endDate, reportType, currentUser?.role, currentUser?.institution?.id, isDailyView ? page : 'all', isDailyView ? perPage : AGGREGATION_FETCH_LIMIT, sortField, sortDirection],
    queryFn: () => {
      const filters: any = { start_date: startDate, end_date: endDate, group_by: reportType, sort_field: sortField, sort_direction: sortDirection };
      if (isSchoolAdmin && userInstitutionId) filters.school_id = userInstitutionId;
      else if (selectedSchool !== 'all') filters.school_id = parseInt(selectedSchool);
      if (selectedClass !== 'all') filters.class_name = selectedClass;
      if (isDailyView) { filters.page = page; filters.per_page = perPage; }
      else { filters.page = 1; filters.per_page = AGGREGATION_FETCH_LIMIT; }
      return attendanceService.getAttendanceReports(filters);
    },
    enabled: hasAccess,
    placeholderData: keepPreviousData,
  });

  const { data: statsResponse, isLoading: statsLoading, error: statsError } = useQuery<any, Error>({
    queryKey: ['attendance-stats-reports', selectedSchool, selectedClass, startDate, endDate, currentUser?.role, currentUser?.institution?.id],
    queryFn: () => {
      const filters: any = { start_date: startDate, end_date: endDate };
      if (isSchoolAdmin && userInstitutionId) filters.school_id = userInstitutionId;
      else if (selectedSchool !== 'all') filters.school_id = parseInt(selectedSchool);
      if (selectedClass !== 'all') filters.class_name = selectedClass;
      return attendanceService.getAttendanceStats(filters);
    },
    enabled: hasAccess,
    placeholderData: keepPreviousData,
  });

  const { data: fetchedClassOptions, isLoading: classOptionsLoading, error: classOptionsError } = useQuery<string[] | null, Error>({
    queryKey: ['attendance-class-options', targetSchoolIdForClasses ?? 'all'],
    queryFn: () => attendanceService.getSchoolClasses(targetSchoolIdForClasses),
    enabled: hasAccess && (!!targetSchoolIdForClasses || !isSchoolAdmin),
  });

  const handleExportReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const filters: any = { start_date: startDate, end_date: endDate, group_by: reportType };
      if (isSchoolAdmin && userInstitutionId) filters.school_id = userInstitutionId;
      else if (selectedSchool !== 'all') filters.school_id = parseInt(selectedSchool);
      if (selectedClass !== 'all') filters.class_name = selectedClass;
      const blob = await attendanceService.exportAttendance(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `davamiyyet_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Hesabat uğurla export edildi');
    } catch (error) {
      toast.error('Export zamanı xəta baş verdi');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const n = new Date();
    const today = format(n, 'yyyy-MM-dd');
    if (presetId === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (presetId === 'thisWeek') {
      const weekStart = startOfWeek(n, { weekStartsOn: 1 });
      setStartDate(format(weekStart, 'yyyy-MM-dd'));
      setEndDate(today);
    } else if (presetId === 'thisMonth') {
      setStartDate(format(new Date(n.getFullYear(), n.getMonth(), 1), 'yyyy-MM-dd'));
      setEndDate(today);
    }
    setActiveDatePreset(presetId);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedSchool('all');
    setSelectedClass('all');
    setReportType('daily');
    setPage(1);
    setPerPage(DEFAULT_PER_PAGE);
    setSortField('date');
    setSortDirection('desc');
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    setEndDate(today);
    setActiveDatePreset('today');
  };

  return {
    currentUser,
    isSchoolAdmin,
    hasAccess,
    selectedSchool, setSelectedSchool,
    selectedClass, setSelectedClass,
    reportType, setReportType,
    startDate, setStartDate,
    endDate, setEndDate,
    activeDatePreset, setActiveDatePreset,
    page, setPage,
    perPage, setPerPage,
    isExporting,
    sortField, setSortField,
    sortDirection, setSortDirection,
    schools, schoolsError,
    attendanceData: attendanceResponse?.data || [],
    attendanceMeta: attendanceResponse?.meta,
    attendanceLoading, attendanceFetching, attendanceError, refetch,
    statsData: statsResponse?.data || {},
    statsLoading, statsError,
    classOptions: fetchedClassOptions || [],
    classOptionsLoading, classOptionsError,
    handleExportReport, handlePresetSelect, handleResetFilters
  };
}
