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
            daily_attendance_rate: number;
            is_complete: boolean;
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

  /**
   * Get attendance reports in format compatible with AttendanceReports page
   * Transforms bulk attendance data to match the expected format
   */
  async getAttendanceReports(filters: {
    start_date?: string;
    end_date?: string;
    school_id?: number;
    class_name?: string;
    page?: number;
    per_page?: number;
    group_by?: 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    success: boolean;
    data: Array<{
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
    }>;
    meta?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      from: number;
      to: number;
    };
  }> {
    // Use weekly summary to get data for the date range
    const response = await this.getWeeklySummary(filters.start_date, filters.end_date);

    if (!response.success) {
      return { success: false, data: [] };
    }

    // Transform the data to match AttendanceReports format
    const transformedData: any[] = [];
    let recordId = 1;

    Object.entries(response.data.summaries).forEach(([date, summary]) => {
      summary.classes.forEach((classData) => {
        // Skip if class filter is applied and doesn't match
        if (filters.class_name && filters.class_name !== classData.grade_name) {
          return;
        }

        transformedData.push({
          id: recordId++,
          date: date,
          school_name: response.data.school.name,
          class_name: classData.grade_name,
          start_count: summary.morning_present_total || 0,
          end_count: summary.evening_present_total || 0,
          attendance_rate: classData.daily_attendance_rate || 0,
          notes: classData.is_complete ? 'Tamamlandı' : 'Davam edir',
          school: {
            id: response.data.school.id,
            name: response.data.school.name,
            type: 'secondary_school'
          }
        });
      });
    });

    // Sort by date descending
    transformedData.sort((a, b) => b.date.localeCompare(a.date));

    // Apply pagination if requested
    const page = filters.page || 1;
    const perPage = filters.per_page || 20;
    const total = transformedData.length;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedData = transformedData.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedData,
      meta: {
        current_page: page,
        last_page: Math.ceil(total / perPage),
        per_page: perPage,
        total: total,
        from: startIndex + 1,
        to: Math.min(endIndex, total)
      }
    };
  }

  /**
   * Get attendance statistics for reports page
   */
  async getAttendanceStats(filters: {
    start_date?: string;
    end_date?: string;
    school_id?: number;
  }): Promise<{
    success: boolean;
    data: {
      total_students: number;
      average_attendance: number;
      trend_direction: 'up' | 'down' | 'stable';
      total_days: number;
      total_records: number;
    };
  }> {
    const response = await this.getWeeklySummary(filters.start_date, filters.end_date);

    if (!response.success) {
      return {
        success: false,
        data: {
          total_students: 0,
          average_attendance: 0,
          trend_direction: 'stable',
          total_days: 0,
          total_records: 0
        }
      };
    }

    // Calculate statistics from summaries
    const summaries = Object.values(response.data.summaries);
    const totalDays = summaries.length;
    const totalRecords = summaries.reduce((sum, s) => sum + s.total_classes, 0);
    const totalStudents = summaries.length > 0 ? summaries[0].total_students : 0;
    const averageAttendance = summaries.reduce((sum, s) => sum + (s.overall_daily_rate || 0), 0) / (totalDays || 1);

    // Calculate trend (simple: compare first half vs second half)
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (summaries.length >= 2) {
      const midPoint = Math.floor(summaries.length / 2);
      const firstHalfAvg = summaries.slice(0, midPoint).reduce((sum, s) => sum + (s.overall_daily_rate || 0), 0) / midPoint;
      const secondHalfAvg = summaries.slice(midPoint).reduce((sum, s) => sum + (s.overall_daily_rate || 0), 0) / (summaries.length - midPoint);

      if (secondHalfAvg > firstHalfAvg + 2) {
        trendDirection = 'up';
      } else if (secondHalfAvg < firstHalfAvg - 2) {
        trendDirection = 'down';
      }
    }

    return {
      success: true,
      data: {
        total_students: totalStudents,
        average_attendance: Math.round(averageAttendance * 100) / 100,
        trend_direction: trendDirection,
        total_days: totalDays,
        total_records: totalRecords
      }
    };
  }
}

export default new BulkAttendanceService();
