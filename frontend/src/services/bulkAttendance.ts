import { apiClient } from './api';

// Types for bulk attendance
export interface ClassAttendanceData {
  grade_id: number;
  morning_present?: number;
  morning_excused?: number;
  morning_unexcused?: number;
  evening_present?: number;
  evening_excused?: number;
  evening_unexcused?: number;
  morning_notes?: string;
  evening_notes?: string;
  session: 'morning' | 'evening' | 'both';
}

export interface BulkAttendanceRequest {
  attendance_date: string;
  academic_year_id: number;
  classes: ClassAttendanceData[];
}

export interface AttendanceRecord {
  id: number;
  morning_present: number;
  morning_excused: number;
  morning_unexcused: number;
  evening_present: number;
  evening_excused: number;
  evening_unexcused: number;
  morning_attendance_rate: number;
  evening_attendance_rate: number;
  daily_attendance_rate: number;
  morning_notes?: string;
  evening_notes?: string;
  is_complete: boolean;
  morning_recorded_at?: string;
  evening_recorded_at?: string;
}

export interface ClassWithAttendance {
  id: number;
  name: string;
  level: string;
  description?: string;
  total_students: number;
  homeroom_teacher?: {
    id: number;
    name: string;
  };
  room?: {
    id: number;
    name: string;
    building?: string;
  };
  attendance?: AttendanceRecord;
}

export interface BulkAttendanceResponse {
  success: boolean;
  data: {
    classes: ClassWithAttendance[];
    date: string;
    academic_year?: {
      id: number;
      name: string;
    };
    school: {
      id: number;
      name: string;
    };
  };
  message: string;
}

export interface DailyReportSummary {
  total_classes: number;
  completed_classes: number;
  total_students: number;
  morning_present_total: number;
  morning_absent_total: number;
  evening_present_total: number;
  evening_absent_total: number;
  overall_morning_rate: number;
  overall_evening_rate: number;
  overall_daily_rate: number;
}

export interface DailyReportClass {
  grade_name: string;
  total_students: number;
  morning_present: number;
  morning_excused: number;
  morning_unexcused: number;
  evening_present: number;
  evening_excused: number;
  evening_unexcused: number;
  morning_attendance_rate: number;
  evening_attendance_rate: number;
  daily_attendance_rate: number;
  is_complete: boolean;
}

export interface DailyReportResponse {
  success: boolean;
  data: {
    summary: DailyReportSummary;
    classes: DailyReportClass[];
  };
  date: string;
}

class BulkAttendanceService {
  private baseUrl = '/schooladmin/bulk-attendance';

  private async get(endpoint: string, params?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    return await apiClient.get(url, { params });
  }

  private async post(endpoint: string, data: any) {
    const url = `${this.baseUrl}${endpoint}`;
    return await apiClient.post(url, data);
  }

  /**
   * Get all classes with attendance data for a specific date
   */
  async getClassesForDate(date?: string): Promise<BulkAttendanceResponse> {
    const params = date ? { date } : {};
    return this.get('', params);
  }

  /**
   * Save or update bulk attendance data
   */
  async saveBulkAttendance(data: BulkAttendanceRequest): Promise<{
    success: boolean;
    message: string;
    data: {
      id: number;
      grade_name: string;
      morning_attendance_rate: number;
      evening_attendance_rate: number;
      daily_attendance_rate: number;
      is_complete: boolean;
    }[];
  }> {
    return this.post('', data);
  }

  /**
   * Get daily attendance report
   */
  async getDailyReport(date?: string): Promise<DailyReportResponse> {
    const params = date ? { date } : {};
    return this.get('/daily-report', params);
  }

  /**
   * Get weekly attendance summary
   */
  async getWeeklySummary(startDate?: string, endDate?: string): Promise<{
    success: boolean;
    data: {
      summaries: { [date: string]: {
        date: string;
        total_classes: number;
        completed_classes: number;
        total_students: number;
        morning_present_total: number;
        evening_present_total: number;
        overall_daily_rate: number;
        classes: Array<{
          grade_name: string;
          daily_attendance_rate: number;
          is_complete: boolean;
        }>;
      }};
      period: {
        start_date: string;
        end_date: string;
      };
      school: {
        id: number;
        name: string;
      };
    };
  }> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return this.get('/weekly-summary', params);
  }

  /**
   * Export attendance data
   */
  async exportData(startDate?: string, endDate?: string): Promise<{
    success: boolean;
    data: any[];
    filename: string;
  }> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return this.get('/export', params);
  }

  /**
   * Save morning session attendance for multiple classes
   */
  async saveMorningAttendance(
    date: string,
    academicYearId: number,
    classesData: Array<{
      grade_id: number;
      morning_present: number;
      morning_excused: number;
      morning_unexcused: number;
      morning_notes?: string;
    }>
  ) {
    const data: BulkAttendanceRequest = {
      attendance_date: date,
      academic_year_id: academicYearId,
      classes: classesData.map(cls => ({
        ...cls,
        session: 'morning' as const
      }))
    };
    return this.saveBulkAttendance(data);
  }

  /**
   * Save evening session attendance for multiple classes
   */
  async saveEveningAttendance(
    date: string,
    academicYearId: number,
    classesData: Array<{
      grade_id: number;
      evening_present: number;
      evening_excused: number;
      evening_unexcused: number;
      evening_notes?: string;
    }>
  ) {
    const data: BulkAttendanceRequest = {
      attendance_date: date,
      academic_year_id: academicYearId,
      classes: classesData.map(cls => ({
        ...cls,
        session: 'evening' as const
      }))
    };
    return this.saveBulkAttendance(data);
  }

  /**
   * Save both morning and evening sessions for multiple classes
   */
  async saveFullDayAttendance(
    date: string,
    academicYearId: number,
    classesData: Array<{
      grade_id: number;
      morning_present: number;
      morning_excused: number;
      morning_unexcused: number;
      evening_present: number;
      evening_excused: number;
      evening_unexcused: number;
      morning_notes?: string;
      evening_notes?: string;
    }>
  ) {
    const data: BulkAttendanceRequest = {
      attendance_date: date,
      academic_year_id: academicYearId,
      classes: classesData.map(cls => ({
        ...cls,
        session: 'both' as const
      }))
    };
    return this.saveBulkAttendance(data);
  }

  /**
   * Validate attendance counts for a class
   */
  validateAttendanceCounts(
    totalStudents: number,
    present: number,
    excused: number,
    unexcused: number
  ): boolean {
    const totalMarked = present + excused + unexcused;
    return totalMarked <= totalStudents && 
           present >= 0 && 
           excused >= 0 && 
           unexcused >= 0;
  }

  /**
   * Calculate attendance rate
   */
  calculateAttendanceRate(present: number, total: number): number {
    return total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0;
  }

  /**
   * Get attendance summary for a class
   */
  getAttendanceSummary(attendance: AttendanceRecord, totalStudents: number) {
    const morningTotal = attendance.morning_present + attendance.morning_excused + attendance.morning_unexcused;
    const eveningTotal = attendance.evening_present + attendance.evening_excused + attendance.evening_unexcused;
    
    return {
      morning: {
        present: attendance.morning_present,
        absent: attendance.morning_excused + attendance.morning_unexcused,
        rate: attendance.morning_attendance_rate,
        recorded: morningTotal > 0
      },
      evening: {
        present: attendance.evening_present,
        absent: attendance.evening_excused + attendance.evening_unexcused,
        rate: attendance.evening_attendance_rate,
        recorded: eveningTotal > 0
      },
      daily: {
        rate: attendance.daily_attendance_rate,
        isComplete: attendance.is_complete
      }
    };
  }
}

export default new BulkAttendanceService();