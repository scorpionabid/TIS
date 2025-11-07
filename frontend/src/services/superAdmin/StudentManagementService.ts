import { apiClient } from '../api';
import { SchoolStudent, CreateStudentData } from '../schoolAdmin';
import { PaginationParams } from '../BaseService';
import { handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * Student Management Service for SuperAdmin
 * Handles all student-related operations
 */
class StudentManagementService {
  async getStudents(params?: PaginationParams & {
    class_id?: number;
    status?: string;
    search?: string;
  }): Promise<SchoolStudent[]> {
    try {
      logger.debug('SuperAdmin fetching students', {
        component: 'StudentManagementService',
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
      return handleArrayResponse<SchoolStudent>(response, 'StudentManagementService.getStudents');

    } catch (error) {
      logger.error('Failed to fetch students as SuperAdmin', error);
      return []; // Safe fallback for students
    }
  }

  async getStudent(studentId: number): Promise<SchoolStudent> {
    try {
      const response = await apiClient.get<SchoolStudent>(`/students/${studentId}`);
      return handleApiResponseWithError<SchoolStudent>(response, `StudentManagementService.getStudent(${studentId})`, 'StudentManagementService');
    } catch (error) {
      logger.error(`Failed to fetch student ${studentId}`, error);
      throw error;
    }
  }

  async createStudent(data: CreateStudentData): Promise<SchoolStudent> {
    try {
      const response = await apiClient.post<SchoolStudent>('/students', data);
      return handleApiResponseWithError<SchoolStudent>(response, 'StudentManagementService.createStudent', 'StudentManagementService');
    } catch (error) {
      logger.error('Failed to create student as SuperAdmin', error);
      throw error;
    }
  }

  async updateStudent(studentId: number, data: Partial<CreateStudentData>): Promise<SchoolStudent> {
    try {
      const response = await apiClient.put<SchoolStudent>(`/students/${studentId}`, data);
      return handleApiResponseWithError<SchoolStudent>(response, `StudentManagementService.updateStudent(${studentId})`, 'StudentManagementService');
    } catch (error) {
      logger.error(`Failed to update student ${studentId}`, error);
      throw error;
    }
  }

  async deleteStudent(studentId: number): Promise<void> {
    try {
      await apiClient.delete(`/students/${studentId}`);
      logger.info(`Successfully deleted student ${studentId}`, {
        component: 'StudentManagementService',
        action: 'deleteStudent'
      });
    } catch (error) {
      logger.error(`Failed to delete student ${studentId}`, error);
      throw error;
    }
  }
}

export const studentManagementService = new StudentManagementService();
export { StudentManagementService };
