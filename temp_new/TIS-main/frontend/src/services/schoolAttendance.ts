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
      first_recorded_at: string | null;
      last_recorded_at: string | null;
    }>;
    weekly_breakdown?: Array<{
      week_label: string;
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
    }>;
  };
}

export interface SchoolRankingEntry {
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

export interface SchoolRankingsResponse {
  success: boolean;
  data: {
    date: string;
    start_date: string;
    end_date: string;
    shift_type: 'morning' | 'evening' | 'all';
    morning_deadline: string;
    evening_deadline: string;
    my_school_rank: {
      rank: number;
      total_schools: number;
      region_rank: number | null;
      region_total: number;
      data: SchoolRankingEntry;
    } | null;
    schools: SchoolRankingEntry[];
    summary: RankingsSummary;
    active_sector: { id: number; name: string; level: number } | null;
  };
}

export const schoolAttendanceService = {
  async getSchoolGradeStats(filters: { start_date: string; end_date: string }): Promise<SchoolGradeStatsResponse> {
    const response = await apiClient.get<SchoolGradeStatsResponse>('school-attendance/school-grade-stats', filters, {
      cache: false,
    });
    return response as any;
  },

  async getRankings(filters: { start_date: string; end_date: string; shift_type: 'morning' | 'evening' | 'all'; school_id?: number | string }): Promise<SchoolRankingsResponse> {
    const response = await apiClient.get<SchoolRankingsResponse>('school-attendance/rankings', filters);
    return response as any;
  },
};
