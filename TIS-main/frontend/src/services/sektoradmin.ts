import { apiClient } from './api';

// Types for SektorAdmin services
export interface SektorUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  role_display: string;
  institution: {
    id: number;
    name: string;
    type: string;
  };
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface SektorStudent {
  id: number;
  student_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  national_id: string;
  date_of_birth: string;
  gender: string;
  school: {
    id: number;
    name: string;
    type: string;
  };
  grade: {
    id: number;
    name: string;
    level: number;
  };
  enrollment_date: string;
  status: string;
  parent_contact: {
    father_name: string;
    mother_name: string;
    contact_phone: string;
    address: string;
  };
  academic_year: string;
  created_at: string;
}

export interface SektorClass {
  id: number;
  name: string;
  short_name: string;
  level: number;
  section: string;
  school: {
    id: number;
    name: string;
    type: string;
  };
  class_teacher: {
    id: number;
    name: string;
    email: string;
  } | null;
  student_count: number;
  max_capacity: number;
  academic_year: string;
  room_number: string;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceReport {
  school_id: number;
  school_name: string;
  school_type: string;
  total_students: number;
  total_classes: number;
  school_days: number;
  possible_attendance: number;
  actual_attendance: number;
  attendance_rate: number;
  by_grade: any[];
  status: string;
}

export interface AssessmentReport {
  school_id: number;
  school_name: string;
  school_type: string;
  total_students: number;
  total_grades: number;
  school_subjects: any[];
  grade_reports: any[];
  school_average: number;
  school_success_rate: number;
}

class SektorAdminService {
  // User Management
  async getSectorUsers(params?: {
    search?: string;
    role?: string;
    institution_id?: string;
    page?: number;
    per_page?: number;
  }) {
    const response = await apiClient.get('/sektoradmin/users', params);
    return response;
  }

  async getSectorTeachers(params?: {
    school_id?: string;
    subject?: string;
    search?: string;
    per_page?: number;
  }) {
    const response = await apiClient.get('/sektoradmin/teachers', params);
    return response;
  }

  async createSchoolUser(data: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: string;
    institution_id: number;
    phone?: string;
    subjects?: string[];
  }) {
    const response = await apiClient.post('/sektoradmin/users', data);
    return response;
  }

  async getAvailableSchools() {
    const response = await apiClient.get('/sektoradmin/available-schools');
    return response;
  }

  // Student Management
  async getSectorStudents(params?: {
    school_id?: string;
    grade_level?: number;
    class_id?: string;
    gender?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) {
    const response = await apiClient.get('/sektoradmin/students', params);
    return response;
  }

  async getStudentsBySchool(schoolId: number) {
    const response = await apiClient.get(`/sektoradmin/schools/${schoolId}/students`);
    return response;
  }

  async getStudentStatistics() {
    const response = await apiClient.get('/sektoradmin/students/statistics');
    return response;
  }

  async exportStudentData() {
    const response = await apiClient.get('/sektoradmin/students/export');
    return response;
  }

  // Class Management
  async getSectorClasses(params?: {
    school_id?: string;
    grade_level?: number;
    academic_year?: string;
    search?: string;
    per_page?: number;
  }) {
    const response = await apiClient.get('/sektoradmin/classes', params);
    return response;
  }

  async getClassesBySchool(schoolId: number) {
    const response = await apiClient.get(`/sektoradmin/schools/${schoolId}/classes`);
    return response;
  }

  async getClassStudents(classId: number) {
    const response = await apiClient.get(`/sektoradmin/classes/${classId}/students`);
    return response;
  }

  async getClassSchedules() {
    const response = await apiClient.get('/sektoradmin/classes/schedules');
    return response;
  }

  // Schedule Management
  async getSectorSchedules() {
    const response = await apiClient.get('/sektoradmin/schedules');
    return response;
  }

  async getTeacherSchedules() {
    const response = await apiClient.get('/sektoradmin/schedules/teachers');
    return response;
  }

  async getScheduleStatistics() {
    const response = await apiClient.get('/sektoradmin/schedules/statistics');
    return response;
  }

  // Attendance Management
  async getAttendanceReports(params?: {
    start_date?: string;
    end_date?: string;
  }) {
    const response = await apiClient.get('/sektoradmin/attendance/reports', params);
    return response;
  }

  async getDailyAttendanceSummary(params?: {
    date?: string;
  }) {
    const response = await apiClient.get('/sektoradmin/attendance/daily', params);
    return response;
  }

  async getAttendanceTrends() {
    const response = await apiClient.get('/sektoradmin/attendance/trends');
    return response;
  }

  async getAbsenteeismAnalysis() {
    const response = await apiClient.get('/sektoradmin/attendance/analysis');
    return response;
  }

  // Assessment Management
  async getAssessmentReports(params?: {
    academic_year?: string;
    subject?: string;
    grade_level?: number;
  }) {
    const response = await apiClient.get('/sektoradmin/assessments/reports', params);
    return response;
  }

  async getComparativeAnalysis() {
    const response = await apiClient.get('/sektoradmin/assessments/comparative');
    return response;
  }

  async getAssessmentTrends() {
    const response = await apiClient.get('/sektoradmin/assessments/trends');
    return response;
  }

  async exportAssessmentData(params?: {
    format?: string;
    academic_year?: string;
  }) {
    const response = await apiClient.get('/sektoradmin/assessments/export', params);
    return response;
  }
}

export const sektorAdminService = new SektorAdminService();