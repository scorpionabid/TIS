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
  async getSchoolClasses(schoolId: number): Promise<{ success: boolean; data: string[]; message: string }> {
    return this.get<{ success: boolean; data: string[]; message: string }>(`${this.baseUrl}/schools/${schoolId}/classes`);
  }
}

export const attendanceService = new AttendanceService();