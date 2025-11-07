import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';
import { SchoolTeacher, SchoolStudent, CreateStudentData, AttendanceRecord, Assessment } from './schoolAdmin';
import { Grade } from './grades';
import { handleApiResponse, handleArrayResponse, handleApiResponseWithError } from '@/utils/apiResponseHandler';
import { logger } from '@/utils/logger';

/**
 * SuperAdmin Service
 * 
 * SuperAdmin has direct access to all API endpoints without role-specific prefixes.
 * This service provides full system-wide access to all functionalities.
 */
class SuperAdminService {
  private baseEndpoint: string = '';  // SuperAdmin uses direct API endpoints
  
  constructor() {
    // Auto-bind all methods to preserve context
    Object.getOwnPropertyNames(SuperAdminService.prototype).forEach(methodName => {
      if (methodName !== 'constructor' && typeof this[methodName] === 'function') {
        this[methodName] = this[methodName].bind(this);
      }
    });
  }

  // ===================
  // CLASS MANAGEMENT
  // ===================
  async getClasses(params?: PaginationParams): Promise<Grade[]> {
    try {
      logger.debug('SuperAdmin fetching classes', {
        component: 'SuperAdminService',
        action: 'getClasses',
        data: { params }
      });
      
      const endpoint = '/classes';
      const response = await apiClient.get<Grade[]>(endpoint, params);
      return handleArrayResponse<Grade>(response, 'SuperAdminService.getClasses');
      
    } catch (error) {
      logger.error('Failed to fetch classes as SuperAdmin', error);
      throw error;
    }
  }

  async getClass(classId: number): Promise<Grade> {
    try {
      const response = await apiClient.get<Grade>(`/classes/${classId}`);
      return handleApiResponseWithError<Grade>(response, `SuperAdminService.getClass(${classId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to fetch class ${classId}`, error);
      throw error;
    }
  }

  async createClass(data: Partial<Grade>): Promise<Grade> {
    try {
      const response = await apiClient.post<Grade>('/classes', data);
      return handleApiResponseWithError<Grade>(response, 'SuperAdminService.createClass', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to create class as SuperAdmin', error);
      throw error;
    }
  }

  async updateClass(classId: number, data: Partial<Grade>): Promise<Grade> {
    try {
      const response = await apiClient.put<Grade>(`/classes/${classId}`, data);
      return handleApiResponseWithError<Grade>(response, `SuperAdminService.updateClass(${classId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to update class ${classId}`, error);
      throw error;
    }
  }

  async deleteClass(classId: number): Promise<void> {
    try {
      await apiClient.delete(`/classes/${classId}`);
      logger.info(`Successfully deleted class ${classId}`, {
        component: 'SuperAdminService',
        action: 'deleteClass'
      });
    } catch (error) {
      logger.error(`Failed to delete class ${classId}`, error);
      throw error;
    }
  }

  async getClassStudents(classId: number): Promise<SchoolStudent[]> {
    try {
      const response = await apiClient.get<SchoolStudent[]>(`/classes/${classId}/students`);
      return handleArrayResponse<SchoolStudent>(response, `SuperAdminService.getClassStudents(${classId})`);
    } catch (error) {
      logger.error(`Failed to fetch students for class ${classId}`, error);
      throw error;
    }
  }

  async getClassTeachers(classId: number): Promise<SchoolTeacher[]> {
    try {
      const response = await apiClient.get<SchoolTeacher[]>(`/classes/${classId}/teachers`);
      return handleArrayResponse<SchoolTeacher>(response, `SuperAdminService.getClassTeachers(${classId})`);
    } catch (error) {
      logger.error(`Failed to fetch teachers for class ${classId}`, error);
      throw error;
    }
  }

  // ===================
  // STUDENT MANAGEMENT
  // ===================
  async getStudents(params?: PaginationParams & { 
    class_id?: number; 
    status?: string;
    search?: string;
  }): Promise<SchoolStudent[]> {
    try {
      logger.debug('SuperAdmin fetching students', {
        component: 'SuperAdminService',
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
      return handleArrayResponse<SchoolStudent>(response, 'SuperAdminService.getStudents');
      
    } catch (error) {
      logger.error('Failed to fetch students as SuperAdmin', error);
      return []; // Safe fallback for students
    }
  }

  async getStudent(studentId: number): Promise<SchoolStudent> {
    try {
      const response = await apiClient.get<SchoolStudent>(`/students/${studentId}`);
      return handleApiResponseWithError<SchoolStudent>(response, `SuperAdminService.getStudent(${studentId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to fetch student ${studentId}`, error);
      throw error;
    }
  }

  async createStudent(data: CreateStudentData): Promise<SchoolStudent> {
    try {
      const response = await apiClient.post<SchoolStudent>('/students', data);
      return handleApiResponseWithError<SchoolStudent>(response, 'SuperAdminService.createStudent', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to create student as SuperAdmin', error);
      throw error;
    }
  }

  async updateStudent(studentId: number, data: Partial<CreateStudentData>): Promise<SchoolStudent> {
    try {
      const response = await apiClient.put<SchoolStudent>(`/students/${studentId}`, data);
      return handleApiResponseWithError<SchoolStudent>(response, `SuperAdminService.updateStudent(${studentId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to update student ${studentId}`, error);
      throw error;
    }
  }

  async deleteStudent(studentId: number): Promise<void> {
    try {
      await apiClient.delete(`/students/${studentId}`);
      logger.info(`Successfully deleted student ${studentId}`, {
        component: 'SuperAdminService',
        action: 'deleteStudent'
      });
    } catch (error) {
      logger.error(`Failed to delete student ${studentId}`, error);
      throw error;
    }
  }

  // ===================
  // TEACHER MANAGEMENT (Using Users API for SuperAdmin)
  // ===================
  // ===================
  // TEACHERS MANAGEMENT 
  // ===================
  async getTeachers(params?: PaginationParams): Promise<SchoolTeacher[]> {
    try {
      logger.debug('SuperAdmin fetching teachers', {
        component: 'SuperAdminService',
        action: 'getTeachers',
        data: { params }
      });
      
      const endpoint = '/teachers';
      const response = await apiClient.get<SchoolTeacher[]>(endpoint, params);
      return handleArrayResponse<SchoolTeacher>(response, 'SuperAdminService.getTeachers');
      
    } catch (error) {
      logger.error('Failed to fetch teachers as SuperAdmin', error);
      throw error;
    }
  }

  async getTeacher(teacherId: number): Promise<SchoolTeacher> {
    try {
      const response = await apiClient.get<SchoolTeacher>(`/teachers/${teacherId}`);
      return handleApiResponseWithError<SchoolTeacher>(response, `SuperAdminService.getTeacher(${teacherId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to fetch teacher ${teacherId}`, error);
      throw error;
    }
  }

  async createTeacher(data: any): Promise<SchoolTeacher> {
    try {
      const response = await apiClient.post<SchoolTeacher>('/teachers', data);
      return handleApiResponseWithError<SchoolTeacher>(response, 'SuperAdminService.createTeacher', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to create teacher as SuperAdmin', error);
      throw error;
    }
  }

  async updateTeacher(teacherId: number, data: any): Promise<SchoolTeacher> {
    try {
      const response = await apiClient.put<SchoolTeacher>(`/teachers/${teacherId}`, data);
      return handleApiResponseWithError<SchoolTeacher>(response, `SuperAdminService.updateTeacher(${teacherId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to update teacher ${teacherId}`, error);
      throw error;
    }
  }

  async deleteTeacher(teacherId: number): Promise<void> {
    try {
      await apiClient.delete(`/teachers/${teacherId}`);
      logger.info(`Successfully deleted teacher ${teacherId}`, {
        component: 'SuperAdminService',
        action: 'deleteTeacher'
      });
    } catch (error) {
      logger.error(`Failed to delete teacher ${teacherId}`, error);
      throw error;
    }
  }

  async assignTeacherToClasses(teacherId: number, classIds: number[]): Promise<SchoolTeacher> {
    try {
      logger.debug('SuperAdmin assigning teacher to classes', {
        component: 'SuperAdminService',
        action: 'assignTeacherToClasses',
        data: { teacherId, classIds }
      });
      
      const response = await apiClient.post<SchoolTeacher>(`/teachers/${teacherId}/assign-classes`, { class_ids: classIds });
      return handleApiResponseWithError<SchoolTeacher>(response, `SuperAdminService.assignTeacherToClasses(${teacherId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to assign teacher ${teacherId} to classes`, error);
      throw error;
    }
  }

  async getTeacherPerformance(teacherId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching teacher performance', {
        component: 'SuperAdminService',
        action: 'getTeacherPerformance',
        data: { teacherId }
      });
      
      const response = await apiClient.get(`/teachers/${teacherId}/performance`);
      return handleApiResponse(response, `SuperAdminService.getTeacherPerformance(${teacherId})`);
    } catch (error) {
      logger.error(`Failed to fetch teacher ${teacherId} performance`, error);
      throw error;
    }
  }

  async bulkCreateTeachers(teachers: any[]): Promise<any> {
    try {
      logger.debug('SuperAdmin bulk creating teachers', {
        component: 'SuperAdminService',
        action: 'bulkCreateTeachers',
        data: { count: teachers.length }
      });
      
      const response = await apiClient.post('/teachers/bulk-create', { teachers });
      return handleApiResponse(response, 'SuperAdminService.bulkCreateTeachers');
    } catch (error) {
      logger.error('Failed to bulk create teachers', error);
      throw error;
    }
  }

  async getTeachersAnalytics(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching teachers analytics', {
        component: 'SuperAdminService',
        action: 'getTeachersAnalytics'
      });
      
      const response = await apiClient.get('/teachers/analytics/overview');
      return handleApiResponse(response, 'SuperAdminService.getTeachersAnalytics');
    } catch (error) {
      logger.error('Failed to fetch teachers analytics', error);
      throw error;
    }
  }



  // ===================
  // ATTENDANCE MANAGEMENT
  // ===================
  async getAttendanceForClass(classId: number, date: string): Promise<AttendanceRecord[]> {
    try {
      logger.debug('SuperAdmin fetching attendance for class', {
        component: 'SuperAdminService',
        action: 'getAttendanceForClass',
        data: { classId, date }
      });
      
      const response = await apiClient.get<AttendanceRecord[]>(`/attendance`, {
        class_id: classId,
        date
      });
      return handleArrayResponse<AttendanceRecord>(response, `SuperAdminService.getAttendanceForClass(${classId})`);
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
        component: 'SuperAdminService',
        action: 'recordBulkAttendance',
        data: { class_id: data.class_id, date: data.date, recordCount: data.attendance_records.length }
      });
      
      const response = await apiClient.post<AttendanceRecord[]>('/attendance/bulk-update', data);
      return handleArrayResponse<AttendanceRecord>(response, 'SuperAdminService.recordBulkAttendance');
    } catch (error) {
      logger.error('Failed to record bulk attendance', error);
      throw error;
    }
  }

  // ===================
  // ASSESSMENT MANAGEMENT
  // ===================
  async getAssessments(classId?: number, params?: PaginationParams): Promise<Assessment[]> {
    try {
      logger.debug('SuperAdmin fetching assessments', {
        component: 'SuperAdminService',
        action: 'getAssessments',
        data: { classId, params }
      });
      
      const response = await apiClient.get<Assessment[]>('/assessments', {
        ...params,
        class_id: classId
      });
      return handleArrayResponse<Assessment>(response, 'SuperAdminService.getAssessments');
    } catch (error) {
      logger.error('Failed to fetch assessments', error);
      throw error;
    }
  }

  async createAssessment(data: Partial<Assessment>): Promise<Assessment> {
    try {
      logger.debug('SuperAdmin creating assessment', {
        component: 'SuperAdminService',
        action: 'createAssessment',
        data: { title: data.title }
      });
      
      const response = await apiClient.post<Assessment>('/assessments', data);
      return handleApiResponseWithError<Assessment>(response, 'SuperAdminService.createAssessment', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to create assessment', error);
      throw error;
    }
  }

  async getAssessment(assessmentId: number): Promise<Assessment> {
    try {
      logger.debug('SuperAdmin fetching assessment', {
        component: 'SuperAdminService',
        action: 'getAssessment',
        data: { assessmentId }
      });
      
      const response = await apiClient.get<Assessment>(`/assessments/${assessmentId}`);
      return handleApiResponseWithError<Assessment>(response, `SuperAdminService.getAssessment(${assessmentId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to fetch assessment ${assessmentId}`, error);
      throw error;
    }
  }

  async updateAssessment(assessmentId: number, data: Partial<Assessment>): Promise<Assessment> {
    try {
      logger.debug('SuperAdmin updating assessment', {
        component: 'SuperAdminService',
        action: 'updateAssessment',
        data: { assessmentId }
      });
      
      const response = await apiClient.put<Assessment>(`/assessments/${assessmentId}`, data);
      return handleApiResponseWithError<Assessment>(response, `SuperAdminService.updateAssessment(${assessmentId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to update assessment ${assessmentId}`, error);
      throw error;
    }
  }

  async deleteAssessment(assessmentId: number): Promise<void> {
    try {
      await apiClient.delete(`/assessments/${assessmentId}`);
      logger.info(`Successfully deleted assessment ${assessmentId}`, {
        component: 'SuperAdminService',
        action: 'deleteAssessment'
      });
    } catch (error) {
      logger.error(`Failed to delete assessment ${assessmentId}`, error);
      throw error;
    }
  }

  // ===================
  // INSTITUTION MANAGEMENT
  // ===================
  async getInstitutions(params?: PaginationParams): Promise<any[]> {
    try {
      logger.debug('SuperAdmin fetching institutions', {
        component: 'SuperAdminService',
        action: 'getInstitutions',
        data: { params }
      });
      
      const response = await apiClient.get('/institutions', params);
      return handleArrayResponse(response, 'SuperAdminService.getInstitutions');
    } catch (error) {
      logger.error('Failed to fetch institutions', error);
      throw error;
    }
  }

  async getInstitution(institutionId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching institution', {
        component: 'SuperAdminService',
        action: 'getInstitution',
        data: { institutionId }
      });
      
      const response = await apiClient.get(`/institutions/${institutionId}`);
      return handleApiResponseWithError(response, `SuperAdminService.getInstitution(${institutionId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to fetch institution ${institutionId}`, error);
      throw error;
    }
  }

  async createInstitution(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin creating institution', {
        component: 'SuperAdminService',
        action: 'createInstitution',
        data: { name: data.name }
      });
      
      const response = await apiClient.post('/institutions', data);
      return handleApiResponseWithError(response, 'SuperAdminService.createInstitution', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to create institution', error);
      throw error;
    }
  }

  async updateInstitution(institutionId: number, data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating institution', {
        component: 'SuperAdminService',
        action: 'updateInstitution',
        data: { institutionId }
      });
      
      const response = await apiClient.put(`/institutions/${institutionId}`, data);
      return handleApiResponseWithError(response, `SuperAdminService.updateInstitution(${institutionId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to update institution ${institutionId}`, error);
      throw error;
    }
  }

  async deleteInstitution(institutionId: number): Promise<void> {
    try {
      await apiClient.delete(`/institutions/${institutionId}`);
      logger.info(`Successfully deleted institution ${institutionId}`, {
        component: 'SuperAdminService',
        action: 'deleteInstitution'
      });
    } catch (error) {
      logger.error(`Failed to delete institution ${institutionId}`, error);
      throw error;
    }
  }

  // ===================
  // USER MANAGEMENT
  // ===================
  async getUsers(params?: PaginationParams): Promise<any[]> {
    try {
      logger.debug('SuperAdmin fetching users', {
        component: 'SuperAdminService',
        action: 'getUsers',
        data: { params }
      });
      
      const response = await apiClient.get('/users', params);
      return handleArrayResponse(response, 'SuperAdminService.getUsers');
    } catch (error) {
      logger.error('Failed to fetch users', error);
      throw error;
    }
  }

  async getUser(userId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching user', {
        component: 'SuperAdminService',
        action: 'getUser',
        data: { userId }
      });
      
      const response = await apiClient.get(`/users/${userId}`);
      return handleApiResponseWithError(response, `SuperAdminService.getUser(${userId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to fetch user ${userId}`, error);
      throw error;
    }
  }

  async createUser(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin creating user', {
        component: 'SuperAdminService',
        action: 'createUser',
        data: { email: data.email, name: data.name }
      });
      
      const response = await apiClient.post('/users', data);
      return handleApiResponseWithError(response, 'SuperAdminService.createUser', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to create user', error);
      throw error;
    }
  }

  async updateUser(userId: number, data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating user', {
        component: 'SuperAdminService',
        action: 'updateUser',
        data: { userId }
      });
      
      const response = await apiClient.put(`/users/${userId}`, data);
      return handleApiResponseWithError(response, `SuperAdminService.updateUser(${userId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to update user ${userId}`, error);
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      await apiClient.delete(`/users/${userId}`);
      logger.info(`Successfully deleted user ${userId}`, {
        component: 'SuperAdminService',
        action: 'deleteUser'
      });
    } catch (error) {
      logger.error(`Failed to delete user ${userId}`, error);
      throw error;
    }
  }

  // ===================
  // SURVEY MANAGEMENT
  // ===================
  async getSurveys(params?: PaginationParams): Promise<any[]> {
    try {
      logger.debug('SuperAdmin fetching surveys', {
        component: 'SuperAdminService',
        action: 'getSurveys',
        data: { params }
      });
      
      const response = await apiClient.get('/surveys', params);
      return handleArrayResponse(response, 'SuperAdminService.getSurveys');
    } catch (error) {
      logger.error('Failed to fetch surveys', error);
      throw error;
    }
  }

  async getSurvey(surveyId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching survey', {
        component: 'SuperAdminService',
        action: 'getSurvey',
        data: { surveyId }
      });
      
      const response = await apiClient.get(`/surveys/${surveyId}`);
      return handleApiResponseWithError(response, `SuperAdminService.getSurvey(${surveyId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to fetch survey ${surveyId}`, error);
      throw error;
    }
  }

  async createSurvey(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin creating survey', {
        component: 'SuperAdminService',
        action: 'createSurvey',
        data: { title: data.title }
      });
      
      const response = await apiClient.post('/surveys', data);
      return handleApiResponseWithError(response, 'SuperAdminService.createSurvey', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to create survey', error);
      throw error;
    }
  }

  async updateSurvey(surveyId: number, data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating survey', {
        component: 'SuperAdminService',
        action: 'updateSurvey',
        data: { surveyId }
      });
      
      const response = await apiClient.put(`/surveys/${surveyId}`, data);
      return handleApiResponseWithError(response, `SuperAdminService.updateSurvey(${surveyId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to update survey ${surveyId}`, error);
      throw error;
    }
  }

  async deleteSurvey(surveyId: number): Promise<void> {
    try {
      await apiClient.delete(`/surveys/${surveyId}`);
      logger.info(`Successfully deleted survey ${surveyId}`, {
        component: 'SuperAdminService',
        action: 'deleteSurvey'
      });
    } catch (error) {
      logger.error(`Failed to delete survey ${surveyId}`, error);
      throw error;
    }
  }

  // ===================
  // TASK MANAGEMENT
  // ===================
  async getTasks(params?: PaginationParams): Promise<any[]> {
    try {
      logger.debug('SuperAdmin fetching tasks', {
        component: 'SuperAdminService',
        action: 'getTasks',
        data: { params }
      });
      
      const response = await apiClient.get('/tasks', params);
      return handleArrayResponse(response, 'SuperAdminService.getTasks');
    } catch (error) {
      logger.error('Failed to fetch tasks', error);
      throw error;
    }
  }

  async getTask(taskId: number): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching task', {
        component: 'SuperAdminService',
        action: 'getTask',
        data: { taskId }
      });
      
      const response = await apiClient.get(`/tasks/${taskId}`);
      return handleApiResponseWithError(response, `SuperAdminService.getTask(${taskId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to fetch task ${taskId}`, error);
      throw error;
    }
  }

  async createTask(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin creating task', {
        component: 'SuperAdminService',
        action: 'createTask',
        data: { title: data.title }
      });
      
      const response = await apiClient.post('/tasks', data);
      return handleApiResponseWithError(response, 'SuperAdminService.createTask', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to create task', error);
      throw error;
    }
  }

  async updateTask(taskId: number, data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating task', {
        component: 'SuperAdminService',
        action: 'updateTask',
        data: { taskId }
      });
      
      const response = await apiClient.put(`/tasks/${taskId}`, data);
      return handleApiResponseWithError(response, `SuperAdminService.updateTask(${taskId})`, 'SuperAdminService');
    } catch (error) {
      logger.error(`Failed to update task ${taskId}`, error);
      throw error;
    }
  }

  async deleteTask(taskId: number): Promise<void> {
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      logger.info(`Successfully deleted task ${taskId}`, {
        component: 'SuperAdminService',
        action: 'deleteTask'
      });
    } catch (error) {
      logger.error(`Failed to delete task ${taskId}`, error);
      throw error;
    }
  }

  // ===================
  // REPORT MANAGEMENT
  // ===================
  async getReports(params?: any): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching reports', {
        component: 'SuperAdminService',
        action: 'getReports',
        data: { params }
      });
      
      const response = await apiClient.get('/reports', params);
      return handleApiResponse(response, 'SuperAdminService.getReports');
    } catch (error) {
      logger.error('Failed to fetch reports', error);
      throw error;
    }
  }

  async getOverviewStats(filters?: any): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching overview stats', {
        component: 'SuperAdminService',
        action: 'getOverviewStats',
        data: { filters }
      });
      
      const response = await apiClient.get('/reports/overview', filters);
      return handleApiResponse(response, 'SuperAdminService.getOverviewStats');
    } catch (error) {
      logger.error('Failed to fetch overview stats', error);
      throw error;
    }
  }

  async getInstitutionalPerformance(filters?: any): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching institutional performance', {
        component: 'SuperAdminService',
        action: 'getInstitutionalPerformance',
        data: { filters }
      });
      
      const response = await apiClient.get('/reports/institutional', filters);
      return handleApiResponse(response, 'SuperAdminService.getInstitutionalPerformance');
    } catch (error) {
      logger.error('Failed to fetch institutional performance', error);
      throw error;
    }
  }

  async getUserActivityReport(filters?: any): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching user activity report', {
        component: 'SuperAdminService',
        action: 'getUserActivityReport',
        data: { filters }
      });
      
      const response = await apiClient.get('/reports/user-activity', filters);
      return handleApiResponse(response, 'SuperAdminService.getUserActivityReport');
    } catch (error) {
      logger.error('Failed to fetch user activity report', error);
      throw error;
    }
  }

  // ===================
  // HIERARCHY MANAGEMENT
  // ===================
  async getHierarchy(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching hierarchy', {
        component: 'SuperAdminService',
        action: 'getHierarchy'
      });
      
      const response = await apiClient.get('/hierarchy');
      return handleApiResponse(response, 'SuperAdminService.getHierarchy');
    } catch (error) {
      logger.error('Failed to fetch hierarchy', error);
      throw error;
    }
  }

  async getInstitutionsHierarchy(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching institutions hierarchy', {
        component: 'SuperAdminService',
        action: 'getInstitutionsHierarchy'
      });
      
      const response = await apiClient.get('/institutions-hierarchy');
      return handleApiResponse(response, 'SuperAdminService.getInstitutionsHierarchy');
    } catch (error) {
      logger.error('Failed to fetch institutions hierarchy', error);
      throw error;
    }
  }

  // ===================
  // DASHBOARD STATS
  // ===================
  async getDashboardStats(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching dashboard stats', {
        component: 'SuperAdminService',
        action: 'getDashboardStats'
      });
      
      // SuperAdmin can access all dashboard endpoints
      const response = await apiClient.get('/dashboard/stats');
      return handleApiResponse(response, 'SuperAdminService.getDashboardStats');
    } catch (error) {
      logger.error('Failed to fetch dashboard stats', error);
      throw error;
    }
  }

  async getDashboardOverview(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching dashboard overview', {
        component: 'SuperAdminService',
        action: 'getDashboardOverview'
      });
      
      const response = await apiClient.get('/dashboard/overview');
      return handleApiResponse(response, 'SuperAdminService.getDashboardOverview');
    } catch (error) {
      logger.error('Failed to fetch dashboard overview', error);
      throw error;
    }
  }

  // ===================
  // SYSTEM CONFIGURATION
  // ===================
  async getSystemConfig(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching system config', {
        component: 'SuperAdminService',
        action: 'getSystemConfig'
      });
      
      const response = await apiClient.get('/system/config');
      return handleApiResponse(response, 'SuperAdminService.getSystemConfig');
    } catch (error) {
      logger.error('Failed to fetch system config', error);
      throw error;
    }
  }

  async updateSystemConfig(config: any): Promise<any> {
    try {
      logger.debug('SuperAdmin updating system config', {
        component: 'SuperAdminService',
        action: 'updateSystemConfig'
      });
      
      const response = await apiClient.put('/system/config', config);
      return handleApiResponseWithError(response, 'SuperAdminService.updateSystemConfig', 'SuperAdminService');
    } catch (error) {
      logger.error('Failed to update system config', error);
      throw error;
    }
  }

  async getSystemInfo(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching system info', {
        component: 'SuperAdminService',
        action: 'getSystemInfo'
      });
      
      const response = await apiClient.get('/system/info');
      return handleApiResponse(response, 'SuperAdminService.getSystemInfo');
    } catch (error) {
      logger.error('Failed to fetch system info', error);
      throw error;
    }
  }

  async checkSystemHealth(): Promise<any> {
    try {
      logger.debug('SuperAdmin checking system health', {
        component: 'SuperAdminService',
        action: 'checkSystemHealth'
      });
      
      const response = await apiClient.get('/system/health');
      return handleApiResponse(response, 'SuperAdminService.checkSystemHealth');
    } catch (error) {
      logger.error('Failed to check system health', error);
      throw error;
    }
  }

  // ===================
  // UTILITY METHODS
  // ===================
  async exportData(endpoint: string, params?: any): Promise<Blob> {
    try {
      logger.debug('SuperAdmin exporting data', {
        component: 'SuperAdminService',
        action: 'exportData',
        data: { endpoint, params }
      });
      
      const response = await fetch(`${(apiClient as any).baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          ...(apiClient as any).getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorMessage = `Export failed: ${response.status} ${response.statusText}`;
        logger.error(errorMessage, { endpoint, params });
        throw new Error(errorMessage);
      }

      logger.info(`Successfully exported data from ${endpoint}`);
      return response.blob();
    } catch (error) {
      logger.error(`Failed to export data from ${endpoint}`, error);
      throw error;
    }
  }
}

export const superAdminService = new SuperAdminService();

// Query keys for React Query
export const superAdminKeys = {
  all: ['superAdmin'] as const,
  classes: () => [...superAdminKeys.all, 'classes'] as const,
  class: (id: number) => [...superAdminKeys.classes(), id] as const,
  students: () => [...superAdminKeys.all, 'students'] as const,
  student: (id: number) => [...superAdminKeys.students(), id] as const,
  teachers: () => [...superAdminKeys.all, 'teachers'] as const,
  teacher: (id: number) => [...superAdminKeys.teachers(), id] as const,
  institutions: () => [...superAdminKeys.all, 'institutions'] as const,
  institution: (id: number) => [...superAdminKeys.institutions(), id] as const,
  users: () => [...superAdminKeys.all, 'users'] as const,
  user: (id: number) => [...superAdminKeys.users(), id] as const,
  surveys: () => [...superAdminKeys.all, 'surveys'] as const,
  survey: (id: number) => [...superAdminKeys.surveys(), id] as const,
  tasks: () => [...superAdminKeys.all, 'tasks'] as const,
  task: (id: number) => [...superAdminKeys.tasks(), id] as const,
  reports: () => [...superAdminKeys.all, 'reports'] as const,
  dashboard: () => [...superAdminKeys.all, 'dashboard'] as const,
  hierarchy: () => [...superAdminKeys.all, 'hierarchy'] as const,
  systemConfig: () => [...superAdminKeys.all, 'systemConfig'] as const,
};