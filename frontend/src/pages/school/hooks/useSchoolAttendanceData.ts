import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { schoolAttendanceService } from '@/services/schoolAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';

export type DatePreset = 'today' | 'thisWeek' | 'thisMonth' | 'custom';

export interface GradeStat {
  grade_id: number;
  grade_name: string;
  grade_level: number;
  total_students: number;
  record_count: number;
  average_attendance_rate: number;
  total_present: number;
  total_absent: number;
  uniform_violations: number;
}

export interface SchoolRanking {
  school_id: number;
  name: string;
  submitted_at: string | null;
  shift_type: 'morning' | 'evening' | null;
  deadline_time: string | null;
  is_late: boolean;
  late_minutes: number;
  status: 'on_time' | 'late' | 'not_submitted';
}

export function useSchoolAttendanceData() {
  const { currentUser } = useAuth();
  const attendanceAccess = useModuleAccess('attendance');
  const hasAccess = attendanceAccess.canView;

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'evening' | 'all'>('all');
  const [pendingRefresh, setPendingRefresh] = useState(false);

  const filters = useMemo(() => {
    return {
      start_date: startDate,
      end_date: endDate,
    };
  }, [startDate, endDate]);

  const rankingFilters = useMemo(() => {
    return {
      date: startDate,
      shift_type: selectedShiftType,
    };
  }, [startDate, selectedShiftType]);

  // School Grade Stats Query
  const {
    data: gradeStatsData,
    isLoading: gradeStatsLoading,
    isFetching: gradeStatsFetching,
    error: gradeStatsError,
    refetch: refetchGradeStats,
  } = useQuery({
    queryKey: ['school-attendance', 'grade-stats', filters],
    queryFn: () => schoolAttendanceService.getSchoolGradeStats(filters),
    enabled: hasAccess,
    staleTime: 60 * 1000,
  });

  // Rankings Query
  const {
    data: rankingsData,
    isLoading: rankingsLoading,
    isFetching: rankingsFetching,
    error: rankingsError,
    refetch: refetchRankings,
  } = useQuery({
    queryKey: ['school-attendance', 'rankings', rankingFilters],
    queryFn: () => schoolAttendanceService.getRankings(rankingFilters),
    enabled: hasAccess,
    staleTime: 30 * 1000,
  });

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

  return {
    currentUser,
    hasAccess,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    datePreset,
    setDatePreset,
    selectedShiftType,
    setSelectedShiftType,
    pendingRefresh,
    setPendingRefresh,
    // Grade Stats
    gradeStatsData,
    gradeStatsLoading,
    gradeStatsFetching,
    gradeStatsError,
    refetchGradeStats,
    // Rankings
    rankingsData,
    rankingsLoading,
    rankingsFetching,
    rankingsError,
    refetchRankings,
    // Actions
    handlePresetChange,
    filters,
    rankingFilters,
  };
}
