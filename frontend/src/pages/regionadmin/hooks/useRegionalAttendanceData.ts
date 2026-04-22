import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { regionalAttendanceService, SchoolClassBreakdown, GradeLevelStatsResponse, MissingReportsResponse, SchoolGradeStatsResponse, RankingsResponse } from '@/services/regionalAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { USER_ROLES } from '@/constants/roles';

export type DatePreset = 'today' | 'thisWeek' | 'thisMonth' | 'custom';

export function useRegionalAttendanceData() {
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

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'gradeLevel' | 'schoolGrade' | 'missingReports' | 'rankings'>('overview');
  const tabInitialized = useRef(false);

  useEffect(() => {
    if (currentUser && !tabInitialized.current) {
      tabInitialized.current = true;
      if (currentUser.role === USER_ROLES.REGIONADMIN) {
        setActiveTab('classes');
      }
    }
  }, [currentUser]);

  const [selectedEducationProgram, setSelectedEducationProgram] = useState<string>('all');
  const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'evening' | 'all'>('all');
  const [pendingRefresh, setPendingRefresh] = useState(false);

  const filters = useMemo(() => {
    const f: Record<string, any> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (selectedSectorId !== 'all') f.sector_id = Number(selectedSectorId);
    if (selectedEducationProgram !== 'all') f.education_program = selectedEducationProgram;
    return f;
  }, [startDate, endDate, selectedSectorId, selectedEducationProgram]);

  // Overview Query
  const {
    data: overview,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['regional-attendance', 'overview', filters],
    queryFn: () => regionalAttendanceService.getOverview(filters),
    enabled: hasAccess,
    staleTime: 60 * 1000,
  });

  const schools = overview?.schools ?? [];
  const sectors = overview?.sectors ?? [];

  // Schools processing
  const processedSchools = useMemo(() => {
    let result = [...schools];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(lowerSearch));
    }
    if (statusFilter !== 'all') {
      result = result.filter((s) => {
        const warnings = s.warnings || [];
        if (statusFilter === 'missing') return warnings.includes('reports_missing');
        if (statusFilter === 'low') return warnings.includes('low_attendance');
        if (statusFilter === 'normal') return warnings.length === 0;
        return true;
      });
    }
    result.sort((a, b) => {
      const aVal: any = (a as any)[sortConfig.key];
      const bVal: any = (b as any)[sortConfig.key];
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal, 'az') : bVal.localeCompare(aVal, 'az');
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [schools, searchTerm, statusFilter, sortConfig]);

  // School Classes Query
  const {
    data: classBreakdown,
    isLoading: classLoading,
    isFetching: classFetching,
    error: classError,
    refetch: refetchClassBreakdown,
  } = useQuery<SchoolClassBreakdown | null>({
    queryKey: ['regional-attendance', 'school-classes', selectedSchoolId, filters],
    queryFn: () => {
      const schoolId = Number(selectedSchoolId);
      if (isNaN(schoolId)) return Promise.resolve(null);
      return regionalAttendanceService.getSchoolClasses(schoolId, filters);
    },
    enabled: hasAccess && Boolean(selectedSchoolId) && !isNaN(Number(selectedSchoolId)),
    staleTime: 60 * 1000,
  });

  // Grade Level Query
  const {
    data: gradeLevelData,
    isLoading: gradeLevelLoading,
    isFetching: gradeLevelFetching,
    error: gradeLevelError,
    refetch: refetchGradeLevel,
  } = useQuery<GradeLevelStatsResponse>({
    queryKey: ['regional-attendance', 'grade-level', filters],
    queryFn: () => regionalAttendanceService.getGradeLevelStats(filters),
    enabled: hasAccess,
    staleTime: 60 * 1000,
  });

  // Missing Reports Query
  const {
    data: missingReportsData,
    isLoading: missingReportsLoading,
    isFetching: missingReportsFetching,
    error: missingReportsError,
    refetch: refetchMissingReports,
  } = useQuery<MissingReportsResponse>({
    queryKey: ['regional-attendance', 'missing-reports', filters],
    queryFn: () => regionalAttendanceService.getSchoolsWithMissingReports(filters),
    enabled: hasAccess,
    staleTime: 60 * 1000,
  });

  // School + Grade Query
  const {
    data: schoolGradeData,
    isLoading: schoolGradeLoading,
    isFetching: schoolGradeFetching,
    error: schoolGradeError,
    refetch: refetchSchoolGrade,
  } = useQuery<SchoolGradeStatsResponse>({
    queryKey: ['regional-attendance', 'school-grade', filters],
    queryFn: () => regionalAttendanceService.getSchoolGradeStats(filters),
    enabled: hasAccess,
    staleTime: 60 * 1000,
  });

  // Rankings Query
  const rankingFilters = useMemo(() => {
    const f: Record<string, any> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (selectedSectorId !== 'all') f.sector_id = Number(selectedSectorId);
    if (selectedShiftType !== 'all') f.shift_type = selectedShiftType;
    return f;
  }, [startDate, endDate, selectedSectorId, selectedShiftType]);

  const {
    data: rankingsData,
    isLoading: rankingsLoading,
    isFetching: rankingsFetching,
    error: rankingsError,
    refetch: refetchRankings,
  } = useQuery<RankingsResponse>({
    queryKey: ['regional-attendance', 'rankings', rankingFilters],
    queryFn: () => regionalAttendanceService.getRankings(rankingFilters),
    enabled: hasAccess && activeTab === 'rankings',
    staleTime: 30 * 1000, // 30 seconds for more frequent updates
  });

  // Sync selected school
  useEffect(() => {
    if (!schools.length) {
      setSelectedSchoolId('');
      return;
    }
    
    if (selectedSchoolId) {
      const exists = schools.some((s) => s.school_id === Number(selectedSchoolId));
      if (!exists && schools[0]?.school_id) {
        setSelectedSchoolId(String(schools[0].school_id));
      }
    } else if (schools[0]?.school_id) {
      setSelectedSchoolId(String(schools[0].school_id));
    }
  }, [schools, selectedSchoolId]);

  // Handle Refresh
  useEffect(() => {
    if (!pendingRefresh) return;
    refetchOverview();
    if (selectedSchoolId) refetchClassBreakdown();
    refetchGradeLevel();
    refetchMissingReports();
    refetchSchoolGrade();
    refetchRankings();
    setPendingRefresh(false);
  }, [pendingRefresh, refetchOverview, refetchClassBreakdown, refetchGradeLevel, refetchMissingReports, refetchSchoolGrade, refetchRankings, selectedSchoolId]);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const n = new Date();
    const t = format(n, 'yyyy-MM-dd');
    if (preset === 'today') {
      setStartDate(t);
      setEndDate(t);
    } else if (preset === 'thisWeek') {
      const dayOfWeek = n.getDay();
      const diff = n.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(n.setDate(diff));
      setStartDate(format(startOfWeek, 'yyyy-MM-dd'));
      setEndDate(t);
    } else if (preset === 'thisMonth') {
      setStartDate(format(new Date(n.getFullYear(), n.getMonth(), 1), 'yyyy-MM-dd'));
      setEndDate(t);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return {
    currentUser,
    hasAccess,
    startDate, setStartDate,
    endDate, setEndDate,
    datePreset, setDatePreset,
    selectedSectorId, setSelectedSectorId,
    selectedSchoolId, setSelectedSchoolId,
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    activeTab, setActiveTab,
    selectedEducationProgram, setSelectedEducationProgram,
    selectedShiftType, setSelectedShiftType,
    pendingRefresh, setPendingRefresh,
    overview, overviewLoading, overviewFetching, overviewError,
    processedSchools,
    classBreakdown, classLoading, classFetching, classError,
    gradeLevelData, gradeLevelLoading, gradeLevelFetching, gradeLevelError,
    missingReportsData, missingReportsLoading, missingReportsFetching, missingReportsError,
    schoolGradeData, schoolGradeLoading, schoolGradeFetching, schoolGradeError,
    rankingsData, rankingsLoading, rankingsFetching, rankingsError,
    handlePresetChange,
    handleSort,
    filters,
    rankingFilters,
    sectors,
    schools
  };
}
