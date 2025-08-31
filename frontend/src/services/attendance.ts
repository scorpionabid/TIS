import { BaseService } from './BaseService';

export interface AttendanceRecord {
  id: number;
  school_id: number;
  class_name: string;
  date: string;
  start_count: number;
  end_count: number;
  attendance_rate: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  school?: {
    id: number;
    name: string;
    type: string;
  };
}

export interface CreateAttendanceData {
  school_id: number;
  class_name: string;
  date: string;
  start_count: number;
  end_count: number;
  notes?: string;
}

export interface UpdateAttendanceData extends Partial<CreateAttendanceData> {}

export interface AttendanceFilters {
  school_id?: number;
  class_name?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface AttendanceStats {
  total_students: number;
  average_attendance: number;
  trend_direction: 'up' | 'down' | 'stable';
  total_days: number;
  total_records: number;
}

export interface BulkAttendanceData {
  class_id: number;
  date: string;
  attendance_records: {
    student_id: number;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }[];
}

export interface AttendanceApiResponse {
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

export interface AttendanceStatsResponse {
  success: boolean;
  data: AttendanceStats;
  message?: string;
}

class AttendanceService extends BaseService {
  constructor() {
    super('/school-attendance');
  }

  /**
   * Get attendance records with optional filters
   */
  async getAttendanceRecords(filters?: AttendanceFilters): Promise<AttendanceApiResponse> {
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
    
    const response = await this.get<AttendanceApiResponse>(endpoint);
    return response;
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(filters?: Pick<AttendanceFilters, 'school_id' | 'start_date' | 'end_date'>): Promise<AttendanceStatsResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `${this.baseUrl}/stats?${queryString}` : `${this.baseUrl}/stats`;
    
    const response = await this.get<AttendanceStatsResponse>(endpoint);
    return response;
  }

  /**
   * Create a new attendance record
   */
  async createAttendance(data: CreateAttendanceData): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.post<{ success: boolean; data: AttendanceRecord; message: string }>(this.baseUrl, data);
  }

  /**
   * Get a specific attendance record
   */
  async getAttendance(id: number): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.get<{ success: boolean; data: AttendanceRecord; message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update an attendance record
   */
  async updateAttendance(id: number, data: UpdateAttendanceData): Promise<{ success: boolean; data: AttendanceRecord; message: string }> {
    return this.put<{ success: boolean; data: AttendanceRecord; message: string }>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete an attendance record
   */
  async deleteAttendance(id: number): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get today's attendance records for a specific school
   */
  async getTodayAttendance(schoolId: number): Promise<AttendanceApiResponse> {
    const today = new Date().toISOString().split('T')[0];
    return this.getAttendanceRecords({
      school_id: schoolId,
      date: today
    });
  }

  /**
   * Get weekly attendance summary for a school
   */
  async getWeeklyAttendance(schoolId: number): Promise<AttendanceApiResponse> {
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));

    return this.getAttendanceRecords({
      school_id: schoolId,
      start_date: weekStart.toISOString().split('T')[0],
      end_date: weekEnd.toISOString().split('T')[0]
    });
  }

  /**
   * Get monthly attendance summary for a school
   */
  async getMonthlyAttendance(schoolId: number, month?: number, year?: number): Promise<AttendanceApiResponse> {
    const now = new Date();
    const targetMonth = month ?? now.getMonth();
    const targetYear = year ?? now.getFullYear();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    return this.getAttendanceRecords({
      school_id: schoolId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    });
  }

  /**
   * Get attendance records for a specific class
   */
  async getClassAttendance(schoolId: number, className: string, startDate?: string, endDate?: string): Promise<AttendanceApiResponse> {
    return this.getAttendanceRecords({
      school_id: schoolId,
      class_name: className,
      start_date: startDate,
      end_date: endDate
    });
  }

  /**
   * Bulk create attendance records
   */
  async bulkCreateAttendance(records: CreateAttendanceData[]): Promise<{ success: boolean; created: number; errors: any[]; message: string }> {
    return this.post<{ success: boolean; created: number; errors: any[]; message: string }>(`${this.baseUrl}/bulk`, { records });
  }

  /**
   * Export attendance data to CSV
   */
  async exportAttendance(filters?: AttendanceFilters): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `${this.baseUrl}/export?${queryString}` : `${this.baseUrl}/export`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  /**
   * Get available classes for a school
   */
  async getSchoolClasses(schoolId?: number): Promise<string[]> {
    if (!schoolId) {
      // Return default class options if no school specified
      return [
        '1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D',
        '3A', '3B', '3C', '3D', '4A', '4B', '4C', '4D',
        '5A', '5B', '5C', '5D', '6A', '6B', '6C', '6D',
        '7A', '7B', '7C', '7D', '8A', '8B', '8C', '8D',
        '9A', '9B', '9C', '9D', '10A', '10B', '10C', '10D',
        '11A', '11B', '11C', '11D'
      ];
    }
    const response = await this.get<{ success: boolean; data: string[]; message: string }>(`${this.baseUrl}/schools/${schoolId}/classes`);
    return response.data?.data || [];
  }

  /**
   * Get classes by institution (for attendance management)
   */
  async getClassesByInstitution(institutionId: number): Promise<any[]> {
    try {
      console.log('🏫 AttendanceService: Fetching classes for institution:', institutionId);
      
      // Try to get classes from schoolAdmin service for the institution
      const { schoolAdminService } = await import('./schoolAdmin');
      
      // For now, we'll use the existing getClasses method
      // This should be enhanced to filter by institution on the backend
      const classes = await schoolAdminService.getClasses();
      
      console.log('📚 AttendanceService: Received classes:', classes?.length || 0);
      return classes || [];
    } catch (error) {
      console.error('❌ Error fetching classes by institution:', error);
      return [];
    }
  }

  /**
   * Get students by class (integrates with student service)
   */
  async getStudentsByClass(classId: number, institutionId?: number): Promise<any[]> {
    try {
      console.log('👥 AttendanceService: Fetching students for class:', classId, 'institution:', institutionId);
      
      // Import student service dynamically to avoid circular imports
      const { studentService } = await import('./students');
      
      if (institutionId) {
        // Get students by institution and filter by class
        const response = await studentService.getStudentsByInstitution(institutionId, {
          class_name: classId.toString(),
          per_page: 100
        });
        console.log('📊 AttendanceService: Received students:', response?.students?.length || 0);
        return response.students || [];
      }
      
      // Fallback: return empty if no institution
      console.warn('⚠️ No institution provided for getStudentsByClass');
      return [];
    } catch (error) {
      console.error('❌ Error fetching students by class:', error);
      return [];
    }
  }

  /**
   * Get attendance for specific class and date
   */
  async getAttendanceForClass(classId: number, date: string): Promise<AttendanceRecord[]> {
    const response = await this.getAttendanceRecords({
      class_name: classId.toString(), // Assuming classId maps to class_name
      date: date
    });
    return response.data || [];
  }

  /**
   * Record bulk attendance (using school-attendance API)
   */
  async recordBulkAttendance(data: BulkAttendanceData): Promise<AttendanceRecord[]> {
    const response = await this.post<{ data: AttendanceRecord[] }>(`${this.baseUrl}/bulk`, data);
    return response.data?.data || [];
  }

  /**
   * Record class attendance (using class-attendance API as fallback)
   */
  async recordClassAttendance(data: any): Promise<any> {
    try {
      // Try school-attendance API first
      return await this.recordBulkAttendance(data);
    } catch (error) {
      // Fallback to class-attendance API
      const response = await this.post<{ data: any }>('/class-attendance', data);
      return response.data?.data || {};
    }
  }

  /**
   * Get attendance statistics for a class/date range
   */
  async getAttendanceStatsForClass(classId?: number, dateFrom?: string, dateTo?: string): Promise<AttendanceStats> {
    const filters = {
      class_name: classId?.toString(),
      start_date: dateFrom,
      end_date: dateTo
    };
    const response = await this.getAttendanceStats(filters);
    return response.data || {
      total_students: 0,
      average_attendance: 0,
      trend_direction: 'stable',
      total_days: 0,
      total_records: 0
    };
  }
}

export const attendanceService = new AttendanceService();