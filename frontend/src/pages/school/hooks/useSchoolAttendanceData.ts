import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  first_recorded_at: string | null;
  last_recorded_at: string | null;
}

export interface SchoolRanking {
  school_id: number;
  name: string;
  first_submission_at: string | null;
  submitted_at: string | null;
  shift_type: 'morning' | 'evening' | null;
  deadline_time: string | null;
  is_late: boolean;
  late_minutes: number;
  late_count: number;
  status: 'on_time' | 'late' | 'not_submitted';
  score: number;
  score_percent: number;
  abs_first: string | null;
  abs_last: string | null;
}

export interface RankingsSummary {
  total_schools: number;
  submitted_count: number;
  on_time_count: number;
  late_count: number;
  not_submitted_count: number;
  has_data: boolean;
}

export function useSchoolAttendanceData() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const attendanceAccess = useModuleAccess('attendance');
  const hasAccess = attendanceAccess.canView;
  
  const urlSchoolId = searchParams.get('school_id');
  const schoolId = urlSchoolId || currentUser?.institution_id || currentUser?.institution?.id;

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'evening' | 'all'>('all');
  const [pendingRefresh, setPendingRefresh] = useState(false);

  const filters = useMemo(() => {
    return {
      start_date: startDate,
      end_date: endDate,
      school_id: schoolId,
    };
  }, [startDate, endDate, schoolId]);

  const rankingFilters = useMemo(() => {
    return {
      start_date: startDate,
      end_date: endDate,
      shift_type: selectedShiftType,
    };
  }, [startDate, endDate, selectedShiftType]);

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
    staleTime: 0,
  });

  // Weekly Stats Query
  const weeklyFilters = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return {
      start_date: format(monday, 'yyyy-MM-dd'),
      end_date: today,
      school_id: schoolId,
    };
  }, [schoolId, today]);

  const { data: weeklyStatsData } = useQuery({
    queryKey: ['school-attendance', 'grade-stats-weekly', weeklyFilters],
    queryFn: () => schoolAttendanceService.getSchoolGradeStats(weeklyFilters),
    enabled: hasAccess,
    staleTime: 0,
  });

  // Monthly Stats Query
  const monthlyFilters = useMemo(() => {
    const d = new Date();
    return {
      start_date: format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd'),
      end_date: today,
      school_id: schoolId,
    };
  }, [schoolId, today]);

  const { data: monthlyStatsData } = useQuery({
    queryKey: ['school-attendance', 'grade-stats-monthly', monthlyFilters],
    queryFn: () => schoolAttendanceService.getSchoolGradeStats(monthlyFilters),
    enabled: hasAccess,
    staleTime: 0,
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
    staleTime: 0,
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

  const matrixData = useMemo(() => {
    const levels = Array.from({ length: 12 }, (_, i) => i); 

    const calculateMatrixGrades = (grades: any[] | undefined) => {
      if (!grades) return levels.map(() => null);
      return levels.map(level => {
        const levelGrades = grades.filter((g: any) => g.grade_level === level);
        if (levelGrades.length === 0) return null;
        const sum = levelGrades.reduce((acc: number, curr: any) => acc + curr.average_attendance_rate, 0);
        return sum / levelGrades.length;
      });
    };

    const currentGrades = calculateMatrixGrades(gradeStatsData?.data?.grades);
    const weeklyGrades = calculateMatrixGrades(weeklyStatsData?.data?.grades);
    const monthlyGrades = calculateMatrixGrades(monthlyStatsData?.data?.grades);

    const schools: any[] = [];
    
    // Row 1: Current Selected Period
    if (gradeStatsData?.data) {
      const mainSchoolId = Number(filters.school_id) || 0;
      schools.push({
        id: mainSchoolId,
        name: gradeStatsData.data.school_name || 'Məktəb',
        grades: currentGrades,
        isMain: true,
        hasWeekly: (gradeStatsData.data.weekly_breakdown?.length || 0) > 0
      });

      // Add Weekly Breakdown Rows
      if (gradeStatsData.data.weekly_breakdown) {
        gradeStatsData.data.weekly_breakdown.forEach((week: any, idx: number) => {
          schools.push({
            id: -(idx + 100), // Unique negative ID for weekly rows
            name: week.week_label,
            grades: calculateMatrixGrades(week.grades),
            isWeekly: true,
            parentId: mainSchoolId
          });
        });
      }
    }

    // Row 2: Average for Current Week (Relative to now)
    schools.push({
      id: -1,
      name: 'Həftəlik (Cari)',
      grades: weeklyGrades,
      isSecondary: true
    });

    // Row 3: Average for Current Month (Relative to now)
    schools.push({
      id: -2,
      name: 'Aylıq (Cari)',
      grades: monthlyGrades,
      isSecondary: true
    });

    return {
      schools,
      regionalAverages: [] // Hide regional averages as requested
    };
  }, [gradeStatsData, weeklyStatsData, monthlyStatsData, filters.school_id]);

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
    // Matrix Data
    matrixData,
    // Rankings
    rankingsData: rankingsData?.data?.schools || [],
    rankingsSummary: rankingsData?.data?.summary || null,
    rankingsLoading,
    rankingsFetching,
    rankingsError,
    refetchRankings,
    mySchoolRank: rankingsData?.data?.my_school_rank || null,
    // Actions
    handlePresetChange,
    filters,
    rankingFilters,
  };
}
