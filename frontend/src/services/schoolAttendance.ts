import { apiClient } from './apiOptimized';

export interface SchoolGradeStatsResponse {
  success: boolean;
  data: {
    school_id: number;
    school_name: string;
    period: {
      start_date: string;
      end_date: string;
    };
    summary: {
      total_grades: number;
      total_students: number;
      total_records: number;
      average_attendance_rate: number;
    };
    grades: Array<{
      grade_id: number;
      grade_name: string;
      grade_level: number;
      total_students: number;
      record_count: number;
      average_attendance_rate: number;
      total_present: number;
      total_absent: number;
      uniform_violations: number;
    }>;
  };
}

export interface SchoolRankingsResponse {
  success: boolean;
  data: {
    date: string;
    shift_type: 'morning' | 'evening' | 'all';
    morning_deadline: string;
    evening_deadline: string;
    my_school_rank: {
      rank: number;
      total_schools: number;
      data: {
        school_id: number;
        name: string;
        submitted_at: string | null;
        shift_type: 'morning' | 'evening' | null;
        deadline_time: string | null;
        is_late: boolean;
        late_minutes: number;
        status: 'on_time' | 'late' | 'not_submitted';
      };
    } | null;
    schools: Array<{
      school_id: number;
      name: string;
      submitted_at: string | null;
      shift_type: 'morning' | 'evening' | null;
      deadline_time: string | null;
      is_late: boolean;
      late_minutes: number;
      status: 'on_time' | 'late' | 'not_submitted';
    }>;
    summary: {
      total_schools: number;
      submitted_count: number;
      on_time_count: number;
      late_count: number;
      not_submitted_count: number;
    };
  };
}

export const schoolAttendanceService = {
  async getSchoolGradeStats(filters: { start_date: string; end_date: string }): Promise<SchoolGradeStatsResponse> {
    const response = await apiClient.get('/api/school-attendance/school-grade-stats', {
      params: filters,
    });
    return response.data;
  },

  async getRankings(filters: { date: string; shift_type: 'morning' | 'evening' | 'all' }): Promise<SchoolRankingsResponse> {
    const response = await apiClient.get('/api/school-attendance/rankings', {
      params: filters,
    });
    return response.data;
  },
};
