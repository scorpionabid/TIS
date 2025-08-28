import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient } from './api';
import { SchoolClass, SchoolTeacher, SchoolStudent, CreateStudentData, AttendanceRecord, Assessment } from './schoolAdmin';

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
  async getClasses(params?: PaginationParams): Promise<SchoolClass[]> {
    console.log('🔍 SuperAdminService.getClasses called with:', { params });
    const endpoint = '/classes';
    console.log('🔍 Final endpoint:', endpoint);
    const response = await apiClient.get<SchoolClass[]>(endpoint, params);
    return response.data || response as any;
  }

  async getClass(classId: number): Promise<SchoolClass> {
    const response = await apiClient.get<SchoolClass>(`/classes/${classId}`);
    return response.data || response as any;
  }

  async createClass(data: Partial<SchoolClass>): Promise<SchoolClass> {
    const response = await apiClient.post<SchoolClass>('/classes', data);
    return response.data || response as any;
  }

  async updateClass(classId: number, data: Partial<SchoolClass>): Promise<SchoolClass> {
    const response = await apiClient.put<SchoolClass>(`/classes/${classId}`, data);
    return response.data || response as any;
  }

  async deleteClass(classId: number): Promise<void> {
    await apiClient.delete(`/classes/${classId}`);
  }

  async getClassStudents(classId: number): Promise<SchoolStudent[]> {
    const response = await apiClient.get<SchoolStudent[]>(`/classes/${classId}/students`);
    return response.data || response as any;
  }

  async getClassTeachers(classId: number): Promise<SchoolTeacher[]> {
    const response = await apiClient.get<SchoolTeacher[]>(`/classes/${classId}/teachers`);
    return response.data || response as any;
  }

  // ===================
  // STUDENT MANAGEMENT
  // ===================
  async getStudents(params?: PaginationParams & { 
    class_id?: number; 
    status?: string;
    search?: string;
  }): Promise<SchoolStudent[]> {
    const response = await apiClient.get<{data: {students: SchoolStudent[]; pagination: any}; success: boolean}>('/students', params);
    
    // Handle unified API response format
    if (response.data?.data?.students) {
      return response.data.data.students.map(student => ({
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
    }
    
    return response.data as any || [];
  }

  async getStudent(studentId: number): Promise<SchoolStudent> {
    const response = await apiClient.get<SchoolStudent>(`/students/${studentId}`);
    return response.data || response as any;
  }

  async createStudent(data: CreateStudentData): Promise<SchoolStudent> {
    const response = await apiClient.post<SchoolStudent>('/students', data);
    return response.data || response as any;
  }

  async updateStudent(studentId: number, data: Partial<CreateStudentData>): Promise<SchoolStudent> {
    const response = await apiClient.put<SchoolStudent>(`/students/${studentId}`, data);
    return response.data || response as any;
  }

  async deleteStudent(studentId: number): Promise<void> {
    await apiClient.delete(`/students/${studentId}`);
  }

  // ===================
  // TEACHER MANAGEMENT (Using Users API for SuperAdmin)
  // ===================
  // ===================
  // TEACHERS MANAGEMENT 
  // ===================
  async getTeachers(params?: PaginationParams): Promise<SchoolTeacher[]> {
    console.log('🔍 SuperAdminService.getTeachers called with:', { params });
    const endpoint = '/teachers';
    console.log('🔍 Final endpoint:', endpoint);
    const response = await apiClient.get<SchoolTeacher[]>(endpoint, params);
    return response.data || response as any;
  }

  async getTeacher(teacherId: number): Promise<SchoolTeacher> {
    const response = await apiClient.get<SchoolTeacher>(`/teachers/${teacherId}`);
    return response.data || response as any;
  }

  async createTeacher(data: any): Promise<SchoolTeacher> {
    const response = await apiClient.post<SchoolTeacher>('/teachers', data);
    return response.data || response as any;
  }

  async updateTeacher(teacherId: number, data: any): Promise<SchoolTeacher> {
    const response = await apiClient.put<SchoolTeacher>(`/teachers/${teacherId}`, data);
    return response.data || response as any;
  }

  async deleteTeacher(teacherId: number): Promise<void> {
    await apiClient.delete(`/teachers/${teacherId}`);
  }

  async assignTeacherToClasses(teacherId: number, classIds: number[]): Promise<SchoolTeacher> {
    const response = await apiClient.post<SchoolTeacher>(`/teachers/${teacherId}/assign-classes`, { class_ids: classIds });
    return response.data || response as any;
  }

  async getTeacherPerformance(teacherId: number): Promise<any> {
    const response = await apiClient.get(`/teachers/${teacherId}/performance`);
    return response.data || response as any;
  }

  async bulkCreateTeachers(teachers: any[]): Promise<any> {
    const response = await apiClient.post('/teachers/bulk-create', { teachers });
    return response.data || response as any;
  }

  async getTeachersAnalytics(): Promise<any> {
    const response = await apiClient.get('/teachers/analytics/overview');
    return response.data || response as any;
  }



  // ===================
  // ATTENDANCE MANAGEMENT
  // ===================
  async getAttendanceForClass(classId: number, date: string): Promise<AttendanceRecord[]> {
    const response = await apiClient.get<AttendanceRecord[]>(`/attendance`, {
      class_id: classId,
      date
    });
    return response.data || response as any;
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
    const response = await apiClient.post<AttendanceRecord[]>('/attendance/bulk-update', data);
    return response.data || response as any;
  }

  // ===================
  // ASSESSMENT MANAGEMENT
  // ===================
  async getAssessments(classId?: number, params?: PaginationParams): Promise<Assessment[]> {
    const response = await apiClient.get<Assessment[]>('/assessments', {
      ...params,
      class_id: classId
    });
    return response.data || response as any;
  }

  async createAssessment(data: Partial<Assessment>): Promise<Assessment> {
    const response = await apiClient.post<Assessment>('/assessments', data);
    return response.data || response as any;
  }

  async getAssessment(assessmentId: number): Promise<Assessment> {
    const response = await apiClient.get<Assessment>(`/assessments/${assessmentId}`);
    return response.data || response as any;
  }

  async updateAssessment(assessmentId: number, data: Partial<Assessment>): Promise<Assessment> {
    const response = await apiClient.put<Assessment>(`/assessments/${assessmentId}`, data);
    return response.data || response as any;
  }

  async deleteAssessment(assessmentId: number): Promise<void> {
    await apiClient.delete(`/assessments/${assessmentId}`);
  }

  // ===================
  // INSTITUTION MANAGEMENT
  // ===================
  async getInstitutions(params?: PaginationParams): Promise<any[]> {
    const response = await apiClient.get('/institutions', params);
    return response.data || response as any;
  }

  async getInstitution(institutionId: number): Promise<any> {
    const response = await apiClient.get(`/institutions/${institutionId}`);
    return response.data || response as any;
  }

  async createInstitution(data: any): Promise<any> {
    const response = await apiClient.post('/institutions', data);
    return response.data || response as any;
  }

  async updateInstitution(institutionId: number, data: any): Promise<any> {
    const response = await apiClient.put(`/institutions/${institutionId}`, data);
    return response.data || response as any;
  }

  async deleteInstitution(institutionId: number): Promise<void> {
    await apiClient.delete(`/institutions/${institutionId}`);
  }

  // ===================
  // USER MANAGEMENT
  // ===================
  async getUsers(params?: PaginationParams): Promise<any[]> {
    const response = await apiClient.get('/users', params);
    return response.data || response as any;
  }

  async getUser(userId: number): Promise<any> {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data || response as any;
  }

  async createUser(data: any): Promise<any> {
    const response = await apiClient.post('/users', data);
    return response.data || response as any;
  }

  async updateUser(userId: number, data: any): Promise<any> {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data || response as any;
  }

  async deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  }

  // ===================
  // SURVEY MANAGEMENT
  // ===================
  async getSurveys(params?: PaginationParams): Promise<any[]> {
    const response = await apiClient.get('/surveys', params);
    return response.data || response as any;
  }

  async getSurvey(surveyId: number): Promise<any> {
    const response = await apiClient.get(`/surveys/${surveyId}`);
    return response.data || response as any;
  }

  async createSurvey(data: any): Promise<any> {
    const response = await apiClient.post('/surveys', data);
    return response.data || response as any;
  }

  async updateSurvey(surveyId: number, data: any): Promise<any> {
    const response = await apiClient.put(`/surveys/${surveyId}`, data);
    return response.data || response as any;
  }

  async deleteSurvey(surveyId: number): Promise<void> {
    await apiClient.delete(`/surveys/${surveyId}`);
  }

  // ===================
  // TASK MANAGEMENT
  // ===================
  async getTasks(params?: PaginationParams): Promise<any[]> {
    const response = await apiClient.get('/tasks', params);
    return response.data || response as any;
  }

  async getTask(taskId: number): Promise<any> {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data || response as any;
  }

  async createTask(data: any): Promise<any> {
    const response = await apiClient.post('/tasks', data);
    return response.data || response as any;
  }

  async updateTask(taskId: number, data: any): Promise<any> {
    const response = await apiClient.put(`/tasks/${taskId}`, data);
    return response.data || response as any;
  }

  async deleteTask(taskId: number): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}`);
  }

  // ===================
  // REPORT MANAGEMENT
  // ===================
  async getReports(params?: any): Promise<any> {
    const response = await apiClient.get('/reports', params);
    return response.data || response as any;
  }

  async getOverviewStats(filters?: any): Promise<any> {
    const response = await apiClient.get('/reports/overview', filters);
    return response.data || response as any;
  }

  async getInstitutionalPerformance(filters?: any): Promise<any> {
    const response = await apiClient.get('/reports/institutional', filters);
    return response.data || response as any;
  }

  async getUserActivityReport(filters?: any): Promise<any> {
    const response = await apiClient.get('/reports/user-activity', filters);
    return response.data || response as any;
  }

  // ===================
  // HIERARCHY MANAGEMENT
  // ===================
  async getHierarchy(): Promise<any> {
    const response = await apiClient.get('/hierarchy');
    return response.data || response as any;
  }

  async getInstitutionsHierarchy(): Promise<any> {
    const response = await apiClient.get('/institutions-hierarchy');
    return response.data || response as any;
  }

  // ===================
  // DASHBOARD STATS
  // ===================
  async getDashboardStats(): Promise<any> {
    // SuperAdmin can access all dashboard endpoints
    const response = await apiClient.get('/dashboard/stats');
    return response.data || response as any;
  }

  async getDashboardOverview(): Promise<any> {
    const response = await apiClient.get('/dashboard/overview');
    return response.data || response as any;
  }

  // ===================
  // SYSTEM CONFIGURATION
  // ===================
  async getSystemConfig(): Promise<any> {
    const response = await apiClient.get('/system/config');
    return response.data || response as any;
  }

  async updateSystemConfig(config: any): Promise<any> {
    const response = await apiClient.put('/system/config', config);
    return response.data || response as any;
  }

  async getSystemInfo(): Promise<any> {
    const response = await apiClient.get('/system/info');
    return response.data || response as any;
  }

  async checkSystemHealth(): Promise<any> {
    const response = await apiClient.get('/system/health');
    return response.data || response as any;
  }

  // ===================
  // UTILITY METHODS
  // ===================
  async exportData(endpoint: string, params?: any): Promise<Blob> {
    const response = await fetch(`${(apiClient as any).baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(apiClient as any).getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
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