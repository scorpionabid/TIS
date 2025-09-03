import { BaseService } from './BaseService';

export interface AttendanceRecord {
  id: number;
  student_id: number;
  subject_id?: number;
  teacher_id: number;
  academic_year_id: number;
  academic_term_id?: number;
  attendance_date: string;
  period_start_time?: string;
  period_end_time?: string;
  period_number?: number;
  status: 'present' | 'absent' | 'late' | 'excused' | 'medical' | 'authorized' | 'suspended' | 'early_dismissal';
  arrival_time?: string;
  departure_time?: string;
  minutes_late: number;
  minutes_absent: number;
  recording_method: 'manual' | 'rfid_card' | 'biometric' | 'qr_code' | 'mobile_app' | 'automated';
  device_id?: string;
  location?: string;
  recorded_by: number;
  recorded_at: string;
  approved_by?: number;
  approved_at?: string;
  absence_reason?: string;
  absence_request_id?: number;
  supporting_documents?: any[];
  parent_notified: boolean;
  parent_notified_at?: string;
  notification_method?: 'sms' | 'email' | 'phone' | 'app';
  notes?: string;
  metadata?: any;
  affects_grade: boolean;
  attendance_weight?: number;
  created_at: string;
  updated_at: string;
  
  // Relationships
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    student_number?: string;
    profile?: any;
  };
  subject?: {
    id: number;
    name: string;
    code: string;
    description?: string;
  };
  teacher?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  academicYear?: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  academicTerm?: {
    id: number;
    name: string;
  };
  recordedBy?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  approvedBy?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

export interface CreateAttendanceRecordData {
  student_id: number;
  subject_id?: number;
  teacher_id: number;
  academic_year_id: number;
  academic_term_id?: number;
  attendance_date: string;
  period_number?: number;
  period_start_time?: string;
  period_end_time?: string;
  status: AttendanceRecord['status'];
  arrival_time?: string;
  departure_time?: string;
  recording_method?: AttendanceRecord['recording_method'];
  absence_reason?: string;
  notes?: string;
}

export interface BulkAttendanceRecordData {
  class_id: number;
  subject_id?: number;
  teacher_id: number;
  academic_year_id: number;
  academic_term_id?: number;
  attendance_date: string;
  period_number?: number;
  period_start_time?: string;
  period_end_time?: string;
  attendance_records: {
    student_id: number;
    status: AttendanceRecord['status'];
    arrival_time?: string;
    departure_time?: string;
    notes?: string;
  }[];
}

export interface AttendanceRecordFilters {
  student_id?: number;
  subject_id?: number;
  teacher_id?: number;
  class_id?: number;
  date?: string;
  start_date?: string;
  end_date?: string;
  status?: AttendanceRecord['status'];
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface AttendanceRecordApiResponse {
  success: boolean;
  data: AttendanceRecord[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  message?: string;
}

export interface AttendanceRecordStatsResponse {
  success: boolean;
  data: {
    total_records: number;
    total_students: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
    attendance_rate: number;
  };
  message?: string;
}

class AttendanceRecordService extends BaseService {
  constructor() {
    super('/attendance-records');
  }

  /**
   * Get attendance records with filters
   */
  async getAttendanceRecords(filters?: AttendanceRecordFilters): Promise<AttendanceRecordApiResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    
    return this.get<AttendanceRecordApiResponse>(endpoint);
  }

  /**
   * Create a new attendance record
   */
  async createAttendanceRecord(data: CreateAttendanceRecordData): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.post<{ success: boolean; data: AttendanceRecord; message: string }>(this.baseUrl, data);
  }

  /**
   * Get a specific attendance record
   */
  async getAttendanceRecord(id: number): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.get<{ success: boolean; data: AttendanceRecord; message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update an attendance record
   */
  async updateAttendanceRecord(id: number, data: Partial<CreateAttendanceRecordData>): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.put<{ success: boolean; data: AttendanceRecord; message: string }>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete an attendance record
   */
  async deleteAttendanceRecord(id: number): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Bulk create attendance records for a class
   */
  async bulkCreateAttendanceRecords(data: BulkAttendanceRecordData): Promise<{
    success: boolean;
    message: string;
    data: {
      created_count: number;
      updated_count: number;
      error_count: number;
      errors: any[];
    };
  }> {
    return this.post<{
      success: boolean;
      message: string;
      data: {
        created_count: number;
        updated_count: number;
        error_count: number;
        errors: any[];
      };
    }>(`${this.baseUrl}/bulk`, data);
  }

  /**
   * Get class attendance statistics
   */
  async getClassStatistics(filters: {
    class_id: number;
    start_date: string;
    end_date: string;
    subject_id?: number;
  }): Promise<AttendanceRecordStatsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.get<AttendanceRecordStatsResponse>(`${this.baseUrl}/statistics/class?${params.toString()}`);
  }

  /**
   * Get student attendance records
   */
  async getStudentAttendance(studentId: number, filters?: {
    start_date?: string;
    end_date?: string;
    subject_id?: number;
  }): Promise<AttendanceRecordApiResponse> {
    return this.getAttendanceRecords({
      student_id: studentId,
      ...filters
    });
  }

  /**
   * Get attendance for specific class and date
   */
  async getClassAttendanceForDate(classId: number, date: string, subjectId?: number): Promise<AttendanceRecordApiResponse> {
    return this.getAttendanceRecords({
      class_id: classId,
      date: date,
      subject_id: subjectId
    });
  }

  /**
   * Get teacher's attendance records
   */
  async getTeacherAttendance(teacherId: number, filters?: {
    start_date?: string;
    end_date?: string;
    subject_id?: number;
    class_id?: number;
  }): Promise<AttendanceRecordApiResponse> {
    return this.getAttendanceRecords({
      teacher_id: teacherId,
      ...filters
    });
  }

  /**
   * Mark student as present
   */
  async markPresent(data: {
    student_id: number;
    subject_id?: number;
    teacher_id: number;
    academic_year_id: number;
    attendance_date: string;
    period_number?: number;
    arrival_time?: string;
    notes?: string;
  }): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.createAttendanceRecord({
      ...data,
      status: 'present'
    });
  }

  /**
   * Mark student as absent
   */
  async markAbsent(data: {
    student_id: number;
    subject_id?: number;
    teacher_id: number;
    academic_year_id: number;
    attendance_date: string;
    period_number?: number;
    absence_reason?: string;
    notes?: string;
  }): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.createAttendanceRecord({
      ...data,
      status: 'absent'
    });
  }

  /**
   * Mark student as late
   */
  async markLate(data: {
    student_id: number;
    subject_id?: number;
    teacher_id: number;
    academic_year_id: number;
    attendance_date: string;
    period_number?: number;
    arrival_time: string;
    period_start_time?: string;
    notes?: string;
  }): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.createAttendanceRecord({
      ...data,
      status: 'late'
    });
  }

  /**
   * Excuse an absence
   */
  async excuseAbsence(recordId: number, data: {
    absence_reason: string;
    notes?: string;
  }): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.updateAttendanceRecord(recordId, {
      status: 'excused',
      ...data
    });
  }

  /**
   * Get attendance summary for a period
   */
  async getAttendanceSummary(filters: {
    start_date: string;
    end_date: string;
    class_id?: number;
    student_id?: number;
    subject_id?: number;
  }): Promise<{
    success: boolean;
    data: {
      total_days: number;
      present_days: number;
      absent_days: number;
      late_days: number;
      excused_days: number;
      attendance_percentage: number;
      detailed_records: AttendanceRecord[];
    };
    message?: string;
  }> {
    const records = await this.getAttendanceRecords(filters);
    
    if (!records.success || !records.data) {
      return {
        success: false,
        data: {
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          late_days: 0,
          excused_days: 0,
          attendance_percentage: 0,
          detailed_records: []
        },
        message: 'Failed to fetch attendance data'
      };
    }

    const attendanceRecords = records.data;
    const summary = {
      total_days: attendanceRecords.length,
      present_days: attendanceRecords.filter(r => r.status === 'present').length,
      absent_days: attendanceRecords.filter(r => r.status === 'absent').length,
      late_days: attendanceRecords.filter(r => r.status === 'late').length,
      excused_days: attendanceRecords.filter(r => ['excused', 'medical', 'authorized'].includes(r.status)).length,
      attendance_percentage: 0,
      detailed_records: attendanceRecords
    };

    if (summary.total_days > 0) {
      summary.attendance_percentage = Math.round(
        ((summary.present_days + summary.late_days) / summary.total_days) * 100
      );
    }

    return {
      success: true,
      data: summary
    };
  }
}

export const attendanceRecordService = new AttendanceRecordService();