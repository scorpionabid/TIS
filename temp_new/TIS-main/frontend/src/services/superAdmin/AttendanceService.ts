import { apiClient } from '../api';
import { AttendanceRecord } from '../schoolAdmin';
import { handleArrayResponse } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Attendance Service for SuperAdmin
 * Handles all attendance-related operations
 */
class AttendanceService {
  async getAttendanceForClass(classId: number, date: string): Promise<AttendanceRecord[]> {
    try {
      logger.debug('SuperAdmin fetching attendance for class', {
        component: 'AttendanceService',
        action: 'getAttendanceForClass',
        data: { classId, date }
      });

      const response = await apiClient.get<AttendanceRecord[]>(`/attendance`, {
        class_id: classId,
        date
      });
      return handleArrayResponse<AttendanceRecord>(response, `AttendanceService.getAttendanceForClass(${classId})`);
    } catch (error) {
      logger.error(`Failed to fetch attendance for class ${classId}`, error);
      throw error;
    }
  }

  async recordBulkAttendance(data: {
    class_id: number;
    date: string;
    attendance_records: {
      student_id: number;
      status: 'present' | 'absent' | 'late' | 'excused';
      notes?: string;
    }[];
  }): Promise<AttendanceRecord[]> {
    try {
      logger.debug('SuperAdmin recording bulk attendance', {
        component: 'AttendanceService',
        action: 'recordBulkAttendance',
        data: { class_id: data.class_id, date: data.date, recordCount: data.attendance_records.length }
      });

      const response = await apiClient.post<AttendanceRecord[]>('/attendance/bulk-update', data);
      return handleArrayResponse<AttendanceRecord>(response, 'AttendanceService.recordBulkAttendance');
    } catch (error) {
      logger.error('Failed to record bulk attendance', error);
      throw error;
    }
  }
}

export const attendanceService = new AttendanceService();
export { AttendanceService };
