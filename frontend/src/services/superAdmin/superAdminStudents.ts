/**
 * SuperAdmin Students Service
 */

import { apiClient } from '../api';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';
import type { SchoolStudent, CreateStudentData, PaginationParams } from './types';

export const getStudents = async (params?: PaginationParams & {
  class_id?: number;
  status?: string;
  search?: string;
}): Promise<SchoolStudent[]> => {
  try {
    logger.debug('SuperAdmin fetching students', {
      component: 'SuperAdminStudentsService',
      action: 'getStudents',
      data: { params }
    });

    const response = await apiClient.get<{data: {students: SchoolStudent[]; pagination: any}; success: boolean}>('/students', params);

    // Handle unified API response format
    if (response.data?.data?.students) {
      const students = response.data.data.students.map(student => ({
        id: student.id,
        student_id: student.student_number || '',
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        date_of_birth: student.date_of_birth,
        gender: student.gender as 'male' | 'female',
        grade_level: student.current_grade_level,
        class_name: student.class_name,
        enrollment_status: student.status as 'active' | 'inactive' | 'transferred' | 'graduated',
        enrollment_date: student.enrollment_date,
        address: student.address,
      }));

      logger.debug(`Successfully mapped ${students.length} students`);
      return students;
    }

    // Fallback to safe array extraction
    return handleArrayResponse<SchoolStudent>(response, 'SuperAdminStudentsService.getStudents');

  } catch (error) {
    logger.error('Failed to fetch students as SuperAdmin', error);
    return []; // Safe fallback for students
  }
};

export const getStudent = async (studentId: number): Promise<SchoolStudent> => {
  try {
    const response = await apiClient.get<SchoolStudent>(`/students/${studentId}`);
    return handleApiResponseWithError<SchoolStudent>(response, `SuperAdminStudentsService.getStudent(${studentId})`, 'SuperAdminStudentsService');
  } catch (error) {
    logger.error(`Failed to fetch student ${studentId}`, error);
    throw error;
  }
};

export const createStudent = async (data: CreateStudentData): Promise<SchoolStudent> => {
  try {
    const response = await apiClient.post<SchoolStudent>('/students', data);
    return handleApiResponseWithError<SchoolStudent>(response, 'SuperAdminStudentsService.createStudent', 'SuperAdminStudentsService');
  } catch (error) {
    logger.error('Failed to create student', error);
    throw error;
  }
};

export const updateStudent = async (studentId: number, data: Partial<CreateStudentData>): Promise<SchoolStudent> => {
  try {
    const response = await apiClient.put<SchoolStudent>(`/students/${studentId}`, data);
    return handleApiResponseWithError<SchoolStudent>(response, `SuperAdminStudentsService.updateStudent(${studentId})`, 'SuperAdminStudentsService');
  } catch (error) {
    logger.error(`Failed to update student ${studentId}`, error);
    throw error;
  }
};

export const deleteStudent = async (studentId: number): Promise<void> => {
  try {
    await apiClient.delete(`/students/${studentId}`);
    logger.info(`Successfully deleted student ${studentId}`);
  } catch (error) {
    logger.error(`Failed to delete student ${studentId}`, error);
    throw error;
  }
};
