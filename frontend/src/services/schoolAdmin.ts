import { BaseService, BaseEntity, PaginationParams } from './BaseService';
import { apiClient, ApiResponse } from './api';
import { Survey, SurveyResponse } from './surveys';
import { Task } from './tasks';
import { Student } from './students';

// SchoolAdmin Dashboard interfaces
export interface SchoolDashboardStats {
  pending_surveys: number;
  active_tasks: number;
  total_students: number;
  today_attendance_rate: number;
  pending_assessments: number;
  overdue_tasks: number;
  upcoming_deadlines: number;
  recent_activities_count: number;
}

export interface SchoolActivity {
  id: number;
  type: 'survey' | 'task' | 'attendance' | 'assessment' | 'document';
  title: string;
  description: string;
  created_at: string;
  user_name: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface SchoolDeadline {
  id: number;
  type: 'survey' | 'task' | 'assessment';
  title: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  days_remaining: number;
}

export interface SchoolNotification {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action_type: 'navigate' | 'modal' | 'external';
  action_url?: string;
  permission_required?: string[];
}

// School Student interfaces  
export interface SchoolStudent {
  id: number;
  student_id: string;
  utis_code?: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  grade_level?: number;
  class_name?: string;
  enrollment_status: 'active' | 'inactive' | 'transferred' | 'graduated';
  enrollment_date?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  address?: string;
  current_classes?: string[];
}

export interface CreateStudentData {
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  grade_id: number;
  student_number?: string;
  address?: string;
}

export interface ImportResult {
  message: string;
  success_count: number;
  errors: string[];
  total_processed: number;
}

export interface TemplateInfo {
  download_url: string;
  filename: string;
  headers: string[];
}

// School-specific survey interfaces
export interface SchoolSurvey extends Survey {
  response_status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  assigned_at?: string;
  due_date?: string;
  response_id?: number;
  completion_percentage?: number;
}

export interface SchoolSurveyFilters extends PaginationParams {
  status?: SchoolSurvey['response_status'];
  due_date_from?: string;
  due_date_to?: string;
  priority?: 'low' | 'medium' | 'high';
}

// School-specific task interfaces
export interface SchoolTask extends Task {
  assigned_by_name?: string;
  assigned_to_names?: string[];
  completion_rate?: number;
  subtasks_count?: number;
  completed_subtasks_count?: number;
}

export interface SchoolTaskFilters extends PaginationParams {
  status?: Task['status'];
  priority?: Task['priority'];
  assigned_to?: number;
  category?: string;
  due_date_from?: string;
  due_date_to?: string;
}

// Class management interfaces
export interface SchoolClass extends BaseEntity {
  name: string;
  grade_level: number;
  academic_year: string;
  class_teacher_id?: number;
  room_number?: string;
  capacity: number;
  current_enrollment: number;
  is_active: boolean;
  schedule?: ClassSchedule[];
  students?: Student[];
  class_teacher?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ClassSchedule {
  id: number;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  room_number?: string;
}

// Teacher management interfaces
export interface SchoolTeacher extends BaseEntity {
  user_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  hire_date: string;
  is_active: boolean;
  subjects?: string[];
  classes?: number[];
  workload_hours?: number;
  performance_rating?: number;
}

// Attendance interfaces
export interface AttendanceRecord {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recorded_by: number;
  recorded_at: string;
  student_name: string;
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

export interface AttendanceStats {
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
  weekly_trend: { date: string; rate: number }[];
}

// Assessment interfaces
export interface Assessment extends BaseEntity {
  title: string;
  subject: string;
  class_id: number;
  teacher_id: number;
  assessment_type: 'exam' | 'quiz' | 'assignment' | 'project';
  total_points: number;
  date: string;
  is_published: boolean;
  grades?: AssessmentGrade[];
}

export interface AssessmentGrade {
  id: number;
  assessment_id: number;
  student_id: number;
  points_earned: number;
  percentage: number;
  letter_grade: string;
  comments?: string;
  graded_by: number;
  graded_at: string;
  student_name: string;
}

class SchoolAdminService {
  private baseEndpoint: string;
  
  constructor() {
    this.baseEndpoint = '/schooladmin';
    
    // Bind all methods to preserve context - auto-bind all methods
    Object.getOwnPropertyNames(SchoolAdminService.prototype).forEach(methodName => {
      if (methodName !== 'constructor' && typeof this[methodName] === 'function') {
        this[methodName] = this[methodName].bind(this);
      }
    });
  }

  // Dashboard methods
  async getDashboardStats(): Promise<SchoolDashboardStats> {
    const endpoint = `${this.baseEndpoint}/dashboard/stats`;
    const response = await apiClient.get<SchoolDashboardStats>(endpoint);
    return response.data || response as SchoolDashboardStats;
  }

  async getDashboardOverview(): Promise<any> {
    const endpoint = `${this.baseEndpoint}/dashboard/overview`;
    const response = await apiClient.get<any>(endpoint);
    return response.data || response as any;
  }

  async getDashboardStatistics(): Promise<any> {
    const endpoint = `${this.baseEndpoint}/dashboard/statistics`;
    const response = await apiClient.get<any>(endpoint);
    return response.data || response as any;
  }

  async getDashboardAnalytics(): Promise<any> {
    const endpoint = `${this.baseEndpoint}/dashboard/analytics`;
    const response = await apiClient.get<any>(endpoint);
    return response.data || response as any;
  }

  async getRecentActivities(limit: number = 10): Promise<SchoolActivity[]> {
    const response = await apiClient.get<SchoolActivity[]>(`${this.baseEndpoint}/dashboard/recent-activity`, { limit });
    return response.data || response as SchoolActivity[];
  }

  async getUpcomingDeadlines(limit: number = 5): Promise<SchoolDeadline[]> {
    const response = await apiClient.get<SchoolDeadline[]>(`${this.baseEndpoint}/dashboard/deadlines`, { limit });
    return response.data || response as SchoolDeadline[];
  }

  async getNotifications(params?: PaginationParams): Promise<SchoolNotification[]> {
    const response = await apiClient.get<SchoolNotification[]>(`${this.baseEndpoint}/dashboard/notifications`, params);
    return response.data || response as SchoolNotification[];
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await apiClient.post(`${this.baseEndpoint}/notifications/${notificationId}/read`);
  }

  async getQuickActions(): Promise<QuickAction[]> {
    const response = await apiClient.get<QuickAction[]>(`${this.baseEndpoint}/dashboard/quick-actions`);
    return response.data || response as QuickAction[];
  }

  // Survey management methods
  async getSchoolSurveys(filters?: SchoolSurveyFilters): Promise<SchoolSurvey[]> {
    const response = await apiClient.get<SchoolSurvey[]>(`${this.baseEndpoint}/surveys`, filters);
    return response.data || response as SchoolSurvey[];
  }

  async getSurveyResponse(surveyId: number): Promise<SurveyResponse | null> {
    try {
      const response = await apiClient.get<SurveyResponse>(`${this.baseEndpoint}/surveys/${surveyId}/response`);
      return response.data || response as SurveyResponse;
    } catch (error) {
      return null;
    }
  }

  async startSurveyResponse(surveyId: number, departmentId?: number): Promise<SurveyResponse> {
    const response = await apiClient.post<SurveyResponse>(`${this.baseEndpoint}/surveys/${surveyId}/start`, {
      department_id: departmentId
    });
    return response.data || response as SurveyResponse;
  }

  async saveSurveyProgress(responseId: number, responses: Record<string, any>): Promise<SurveyResponse> {
    const response = await apiClient.put<SurveyResponse>(`${this.baseEndpoint}/survey-responses/${responseId}/save`, {
      responses
    });
    return response.data || response as any;
  }

  async submitSurveyResponse(responseId: number): Promise<SurveyResponse> {
    const response = await apiClient.post<SurveyResponse>(`${this.baseEndpoint}/survey-responses/${responseId}/submit`);
    return response.data || response as any;
  }

  // Task management methods
  async getSchoolTasks(filters?: SchoolTaskFilters): Promise<SchoolTask[]> {
    const response = await apiClient.get<{tasks: SchoolTask[], summary: any}>(`${this.baseEndpoint}/tasks`, filters);
    return response.data?.tasks || response.tasks || [] as any;
  }

  async updateTaskStatus(taskId: number, status: Task['status'], notes?: string, progress?: number): Promise<SchoolTask> {
    const response = await apiClient.put<SchoolTask>(`${this.baseEndpoint}/tasks/${taskId}/progress`, {
      status,
      notes,
      progress
    });
    return response.data || response as any;
  }

  async getTaskDetails(taskId: number): Promise<SchoolTask> {
    const response = await apiClient.get<SchoolTask>(`${this.baseEndpoint}/tasks/${taskId}/details`);
    return response.data || response as any;
  }

  async addTaskProgress(taskId: number, progress: number, notes?: string): Promise<void> {
    await apiClient.put(`${this.baseEndpoint}/tasks/${taskId}/progress`, {
      progress,
      notes
    });
  }

  async submitTaskForApproval(taskId: number, notes: string): Promise<SchoolTask> {
    const response = await apiClient.post<SchoolTask>(`${this.baseEndpoint}/tasks/${taskId}/submit`, {
      notes
    });
    return response.data || response as any;
  }

  async assignTask(data: {
    title: string;
    description: string;
    assigned_to: number[];
    due_date: string;
    priority: Task['priority'];
    category?: string;
  }): Promise<SchoolTask> {
    const response = await apiClient.post<SchoolTask>(`${this.baseEndpoint}/tasks`, data);
    return response.data || response as any;
  }

  // Class management methods
  async getClasses(params?: PaginationParams): Promise<SchoolClass[]> {
    const baseEndpoint = this.baseEndpoint || '/schooladmin';
    console.log('🔍 SchoolAdminService.getClasses called with:', { baseEndpoint, thisBaseEndpoint: this.baseEndpoint, params });
    const endpoint = `${baseEndpoint}/classes`;
    console.log('🔍 Final endpoint:', endpoint);
    const response = await apiClient.get<SchoolClass[]>(endpoint, params);
    return response.data || response as any;
  }

  async getClass(classId: number): Promise<SchoolClass> {
    const response = await apiClient.get<SchoolClass>(`${this.baseEndpoint}/classes/${classId}`);
    return response.data || response as any;
  }

  async createClass(data: Partial<SchoolClass>): Promise<SchoolClass> {
    const response = await apiClient.post<SchoolClass>(`${this.baseEndpoint}/classes`, data);
    return response.data || response as any;
  }

  async updateClass(classId: number, data: Partial<SchoolClass>): Promise<SchoolClass> {
    const response = await apiClient.put<SchoolClass>(`${this.baseEndpoint}/classes/${classId}`, data);
    return response.data || response as any;
  }

  async deleteClass(classId: number): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/classes/${classId}`);
  }

  // Teacher management methods  
  async getTeachers(params?: PaginationParams): Promise<SchoolTeacher[]> {
    const baseEndpoint = this.baseEndpoint || '/schooladmin';
    console.log('🔍 SchoolAdminService.getTeachers called with:', { baseEndpoint, thisBaseEndpoint: this.baseEndpoint, params });
    const endpoint = `${baseEndpoint}/teachers`;
    console.log('🔍 Final endpoint:', endpoint);
    const response = await apiClient.get<SchoolTeacher[]>(endpoint, params);
    return response.data || response as any;
  }

  async getTeacher(teacherId: number): Promise<SchoolTeacher> {
    const response = await apiClient.get<SchoolTeacher>(`${this.baseEndpoint}/teachers/${teacherId}`);
    return response.data || response as any;
  }

  async createTeacher(data: Partial<SchoolTeacher>): Promise<SchoolTeacher> {
    const response = await apiClient.post<SchoolTeacher>(`${this.baseEndpoint}/teachers`, data);
    return response.data || response as any;
  }

  async updateTeacher(teacherId: number, data: Partial<SchoolTeacher>): Promise<SchoolTeacher> {
    const response = await apiClient.put<SchoolTeacher>(`${this.baseEndpoint}/teachers/${teacherId}`, data);
    return response.data || response as any;
  }

  async deleteTeacher(teacherId: number): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/teachers/${teacherId}`);
  }

  async softDeleteTeacher(teacherId: number): Promise<void> {
    await apiClient.patch(`${this.baseEndpoint}/teachers/${teacherId}/soft-delete`);
  }

  async hardDeleteTeacher(teacherId: number): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/teachers/${teacherId}/hard-delete`);
  }

  // Attendance methods
  async getAttendanceForClass(classId: number, date: string): Promise<AttendanceRecord[]> {
    const response = await apiClient.get<AttendanceRecord[]>(`${this.baseEndpoint}/attendance/class/${classId}`, {
      date
    });
    return response.data || response as any;
  }

  async recordBulkAttendance(data: BulkAttendanceData): Promise<AttendanceRecord[]> {
    const response = await apiClient.post<AttendanceRecord[]>(`${this.baseEndpoint}/attendance/bulk`, data);
    return response.data || response as any;
  }

  async getAttendanceStats(classId?: number, dateFrom?: string, dateTo?: string): Promise<AttendanceStats> {
    const response = await apiClient.get<AttendanceStats>(`${this.baseEndpoint}/attendance/stats`, {
      class_id: classId,
      date_from: dateFrom,
      date_to: dateTo
    });
    return response.data || response as any;
  }

  // Assessment methods
  async getAssessments(classId?: number, params?: PaginationParams): Promise<Assessment[]> {
    const response = await apiClient.get<Assessment[]>(`${this.baseEndpoint}/assessments`, {
      ...params,
      class_id: classId
    });
    return response.data || response as any;
  }

  async createAssessment(data: Partial<Assessment>): Promise<Assessment> {
    const response = await apiClient.post<Assessment>(`${this.baseEndpoint}/assessments`, data);
    return response.data || response as any;
  }

  async getAssessmentGrades(assessmentId: number): Promise<AssessmentGrade[]> {
    const response = await apiClient.get<AssessmentGrade[]>(`${this.baseEndpoint}/assessments/${assessmentId}/grades`);
    return response.data || response as any;
  }

  async recordGrades(assessmentId: number, grades: Partial<AssessmentGrade>[]): Promise<AssessmentGrade[]> {
    const response = await apiClient.post<AssessmentGrade[]>(`${this.baseEndpoint}/assessments/${assessmentId}/grades`, {
      grades
    });
    return response.data || response as any;
  }

  async publishAssessment(assessmentId: number): Promise<Assessment> {
    const response = await apiClient.post<Assessment>(`${this.baseEndpoint}/assessments/${assessmentId}/publish`);
    return response.data || response as any;
  }

  // Students for school context
  async getSchoolStudents(params?: PaginationParams & { 
    grade_id?: number; 
    enrollment_status?: string;
    search?: string;
  }): Promise<SchoolStudent[]> {
    
    // Convert parameters to match the unified students API
    const studentsParams: any = {
      per_page: params?.per_page || 20,
      page: params?.page || 1,
    };
    
    if (params?.grade_id) studentsParams.class_id = params.grade_id;
    if (params?.enrollment_status) studentsParams.status = params.enrollment_status;
    if (params?.search) studentsParams.search = params.search;
    
    const response = await apiClient.get<{data: {students: SchoolStudent[]; pagination: any}; success: boolean}>('/students', studentsParams);
    
    // Transform the unified API response to match expected format
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
        is_active: student.status === 'active',
      }));
    }
    
    return response.data as any || [];
  }

  async createStudent(data: CreateStudentData): Promise<SchoolStudent> {
    const response = await apiClient.post<SchoolStudent>(`${this.baseEndpoint}/students`, data);
    return response.data || response as any;
  }

  async enrollStudent(studentId: number, gradeId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`${this.baseEndpoint}/students/enroll`, {
      student_id: studentId,
      grade_id: gradeId
    });
    return response.data || response as any;
  }

  async unenrollStudent(studentId: number, gradeId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`${this.baseEndpoint}/students/unenroll`, {
      student_id: studentId,
      grade_id: gradeId
    });
    return response.data || response as any;
  }

  // Import methods
  async importStudents(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ImportResult>(`${this.baseEndpoint}/import/students`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data || response as any;
  }

  async importTeachers(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ImportResult>(`${this.baseEndpoint}/import/teachers`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data || response as any;
  }

  async getStudentsByClass(classId: number): Promise<Student[]> {
    const response = await apiClient.get<Student[]>(`${this.baseEndpoint}/classes/${classId}/students`);
    return response.data || response as any;
  }

  async updateStudent(studentId: number, data: Partial<CreateStudentData>): Promise<SchoolStudent> {
    const response = await apiClient.put<SchoolStudent>(`${this.baseEndpoint}/students/${studentId}`, data);
    return response.data || response as any;
  }

  async deleteStudent(studentId: number): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/students/${studentId}`);
  }

  // Inventory management methods
  async getInventoryItems(filters?: {
    category?: string;
    condition?: string;
    location?: string;
  }) {
    const response = await apiClient.get(`${this.baseEndpoint}/inventory`, filters);
    return response.data || response as any;
  }

  async getInventoryItem(itemId: number) {
    const response = await apiClient.get(`${this.baseEndpoint}/inventory/${itemId}`);
    return response.data || response as any;
  }

  async getInventoryStatistics() {
    const response = await apiClient.get(`${this.baseEndpoint}/inventory/statistics/overview`);
    return response.data || response as any;
  }

  // Utility methods
  async exportData(type: 'attendance' | 'grades' | 'students', params?: any): Promise<Blob> {
    const response = await fetch(`${(apiClient as any).baseURL}/schooladmin/export/${type}`, {
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

export const schoolAdminService = new SchoolAdminService();

// Debug: Check if binding worked
console.log('🔍 Testing schoolAdminService binding:', {
  hasBaseEndpoint: !!(schoolAdminService as any)['baseEndpoint'],
  getTeachersType: typeof schoolAdminService.getTeachers,
  getClassesType: typeof schoolAdminService.getClasses
});

// Query keys for React Query
export const schoolAdminKeys = {
  all: ['schoolAdmin'] as const,
  dashboard: () => [...schoolAdminKeys.all, 'dashboard'] as const,
  dashboardStats: () => [...schoolAdminKeys.dashboard(), 'stats'] as const,
  activities: () => [...schoolAdminKeys.dashboard(), 'activities'] as const,
  deadlines: () => [...schoolAdminKeys.dashboard(), 'deadlines'] as const,
  notifications: () => [...schoolAdminKeys.all, 'notifications'] as const,
  surveys: () => [...schoolAdminKeys.all, 'surveys'] as const,
  survey: (id: number) => [...schoolAdminKeys.surveys(), id] as const,
  tasks: () => [...schoolAdminKeys.all, 'tasks'] as const,
  task: (id: number) => [...schoolAdminKeys.tasks(), id] as const,
  classes: () => [...schoolAdminKeys.all, 'classes'] as const,
  class: (id: number) => [...schoolAdminKeys.classes(), id] as const,
  teachers: () => [...schoolAdminKeys.all, 'teachers'] as const,
  teacher: (id: number) => [...schoolAdminKeys.teachers(), id] as const,
  students: () => [...schoolAdminKeys.all, 'students'] as const,
  student: (id: number) => [...schoolAdminKeys.students(), id] as const,
  attendance: (classId?: number, date?: string) => [...schoolAdminKeys.all, 'attendance', { classId, date }] as const,
  assessments: (classId?: number) => [...schoolAdminKeys.all, 'assessments', { classId }] as const,
  assessment: (id: number) => [...schoolAdminKeys.assessments(), id] as const,
  inventory: () => [...schoolAdminKeys.all, 'inventory'] as const,
  inventoryItem: (id: number) => [...schoolAdminKeys.inventory(), id] as const,
  inventoryStats: () => [...schoolAdminKeys.inventory(), 'statistics'] as const,
};