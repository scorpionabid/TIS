/**
 * SuperAdmin Attendance Service
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { AttendanceRecord } from './types';

export const getAttendanceForClass = async (classId: number, date: string): Promise<AttendanceRecord[]> => {
  try {
    const response = await apiClient.get<AttendanceRecord[]>(`/classes/${classId}/attendance`, { date });
    return handleArrayResponse<AttendanceRecord>(response, 'SuperAdminAttendanceService.getAttendanceForClass');
  } catch (error) {
    logger.error('Failed to fetch attendance', error);
    throw error;
  }
};

export const recordBulkAttendance = async (data: { class_id: number; date: string; records: any[] }): Promise<any> => {
  try {
    const response = await apiClient.post('/attendance/bulk', data);
    return handleApiResponseWithError(response, 'SuperAdminAttendanceService.recordBulkAttendance', 'SuperAdminAttendanceService');
  } catch (error) {
    logger.error('Failed to record bulk attendance', error);
    throw error;
  }
};
