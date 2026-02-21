import { apiClient } from "./api";

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
  session: "morning" | "evening" | "both";
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
  requires_student_count?: boolean;
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

export interface BulkAttendanceErrorItem {
  grade_id: number;
  grade_name: string;
  reason: string;
  type: "missing_student_count" | "invalid_totals";
  details?: {
    total_students: number;
    morning_total: number;
    evening_total: number;
  };
}

export interface BulkAttendanceSaveResponse {
  success: boolean;
  status: "completed" | "partial" | "failed";
  message: string;
  data: {
    saved: Array<{
      id: number;
      grade_id: number;
      grade_name?: string;
      morning_attendance_rate: number;
      evening_attendance_rate: number;
      daily_attendance_rate: number;
      is_complete: boolean;
    }>;
    errors: BulkAttendanceErrorItem[];
  };
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
  grade_level?: number;
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
  private baseUrl = "/schooladmin/bulk-attendance";

  private async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: { cache?: boolean; cacheTtl?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await apiClient.get<T>(url, params, options);
    return response as unknown as T;
  }

  private async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await apiClient.post<T>(url, data);
    return response as unknown as T;
  }

  /**
   * Get all classes with attendance data for a specific date
   */
  async getClassesForDate(date?: string): Promise<BulkAttendanceResponse> {
    const params = date ? { date } : {};
    return this.get<BulkAttendanceResponse>("", params, { cache: false });
  }

  /**
   * Save or update bulk attendance data
   */
  async saveBulkAttendance(
    data: BulkAttendanceRequest
  ): Promise<BulkAttendanceSaveResponse> {
    return this.post<BulkAttendanceSaveResponse>("", data);
  }

  /**
   * Get daily attendance report
   */
  async getDailyReport(date?: string): Promise<DailyReportResponse> {
    const params = date ? { date } : {};
    return this.get<DailyReportResponse>("/daily-report", params, {
      cache: false,
    });
  }

  /**
   * Get weekly attendance summary
   */
  async getWeeklySummary(
    startDate?: string,
    endDate?: string
  ): Promise<{
    success: boolean;
    data: {
      summaries: {
        [date: string]: {
          date: string;
          total_classes: number;
          completed_classes: number;
          total_students: number;
          morning_present_total: number;
          evening_present_total: number;
          overall_daily_rate: number;
          classes: Array<{
            grade_name: string;
            total_students: number;
            morning_present: number;
            morning_excused: number;
            morning_unexcused: number;
            evening_present: number;
            evening_excused: number;
            evening_unexcused: number;
            morning_attendance_rate: number; // Backend casts to float
            evening_attendance_rate: number; // Backend casts to float
            daily_attendance_rate: number;   // Backend casts to float
            is_complete: boolean;
            morning_notes?: string | null;
            evening_notes?: string | null;
          }>;
        };
      };
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
    return this.get("/weekly-summary", params, { cache: false });
  }

  /**
   * Export attendance data as CSV
   */
  async exportCsv(startDate?: string, endDate?: string): Promise<Blob> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get<Blob>(
      "/schooladmin/bulk-attendance/export",
      params,
      {
        responseType: "blob",
        cache: false,
      }
    );

    if (response.data instanceof Blob) {
      return response.data;
    }

    throw new Error("Export cavabı müvafiq CSV məlumatı qaytarmadı");
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
      classes: classesData.map((cls) => ({
        ...cls,
        session: "morning" as const,
      })),
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
      classes: classesData.map((cls) => ({
        ...cls,
        session: "evening" as const,
      })),
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
      classes: classesData.map((cls) => ({
        ...cls,
        session: "both" as const,
      })),
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
    return (
      totalMarked <= totalStudents &&
      present >= 0 &&
      excused >= 0 &&
      unexcused >= 0
    );
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
    const morningTotal =
      attendance.morning_present +
      attendance.morning_excused +
      attendance.morning_unexcused;
    const eveningTotal =
      attendance.evening_present +
      attendance.evening_excused +
      attendance.evening_unexcused;

    return {
      morning: {
        present: attendance.morning_present,
        absent: attendance.morning_excused + attendance.morning_unexcused,
        rate: attendance.morning_attendance_rate,
        recorded: morningTotal > 0,
      },
      evening: {
        present: attendance.evening_present,
        absent: attendance.evening_excused + attendance.evening_unexcused,
        rate: attendance.evening_attendance_rate,
        recorded: eveningTotal > 0,
      },
      daily: {
        rate: attendance.daily_attendance_rate,
        isComplete: attendance.is_complete,
      },
    };
  }

}
// NOTE: Bu servis yalnız data entry (davamiyyət daxiletmə) üçündür.
// Hesabat və analitika üçün attendanceService istifadə edin.

export default new BulkAttendanceService();
