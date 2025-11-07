/**
 * SuperAdmin Services - Barrel Export & Legacy Compatibility
 *
 * Sprint 9 Refactoring: Domain-Based Service Split
 *
 * This file provides both:
 * 1. Individual domain service exports (NEW, recommended)
 * 2. Legacy combined superAdminService for backward compatibility
 *
 * Migration Guide:
 * - Old: import { superAdminService } from '@/services/superAdmin';
 * - New: import { classManagementService } from '@/services/superadmin';
 */

// ============================================
// DOMAIN SERVICE EXPORTS (NEW WAY)
// ============================================

export * from './ClassManagementService';
export * from './StudentManagementService';
export * from './TeacherManagementService';
export * from './AttendanceService';
export * from './AssessmentService';
export * from './InstitutionService';
export * from './UserManagementService';
export * from './SurveyManagementService';
export * from './TaskManagementService';
export * from './ReportService';
export * from './HierarchyService';
export * from './DashboardService';
export * from './SystemConfigService';

// Import individual service instances for legacy service
import { classManagementService } from './ClassManagementService';
import { studentManagementService } from './StudentManagementService';
import { teacherManagementService } from './TeacherManagementService';
import { attendanceService } from './AttendanceService';
import { assessmentService } from './AssessmentService';
import { institutionService } from './InstitutionService';
import { userManagementService } from './UserManagementService';
import { surveyManagementService } from './SurveyManagementService';
import { taskManagementService } from './TaskManagementService';
import { reportService } from './ReportService';
import { hierarchyService } from './HierarchyService';
import { dashboardService } from './DashboardService';
import { systemConfigService } from './SystemConfigService';
import { apiClient } from '../api';
import { logger } from '@/utils/logger';

// ============================================
// LEGACY COMBINED SERVICE (BACKWARD COMPATIBILITY)
// ============================================

/**
 * Legacy Combined SuperAdmin Service
 *
 * @deprecated Use individual domain services for better tree-shaking and modularity
 *
 * @example
 * // Old way (still works):
 * import { superAdminService } from '@/services/superAdmin';
 * superAdminService.getClasses();
 *
 * // New way (recommended):
 * import { classManagementService } from '@/services/superadmin';
 * classManagementService.getClasses();
 */
export const superAdminService = {
  // ========== Class Management ==========
  getClasses: classManagementService.getClasses.bind(classManagementService),
  getClass: classManagementService.getClass.bind(classManagementService),
  createClass: classManagementService.createClass.bind(classManagementService),
  updateClass: classManagementService.updateClass.bind(classManagementService),
  deleteClass: classManagementService.deleteClass.bind(classManagementService),
  getClassStudents: classManagementService.getClassStudents.bind(classManagementService),
  getClassTeachers: classManagementService.getClassTeachers.bind(classManagementService),

  // ========== Student Management ==========
  getStudents: studentManagementService.getStudents.bind(studentManagementService),
  getStudent: studentManagementService.getStudent.bind(studentManagementService),
  createStudent: studentManagementService.createStudent.bind(studentManagementService),
  updateStudent: studentManagementService.updateStudent.bind(studentManagementService),
  deleteStudent: studentManagementService.deleteStudent.bind(studentManagementService),

  // ========== Teacher Management ==========
  getTeachers: teacherManagementService.getTeachers.bind(teacherManagementService),
  getTeacher: teacherManagementService.getTeacher.bind(teacherManagementService),
  createTeacher: teacherManagementService.createTeacher.bind(teacherManagementService),
  updateTeacher: teacherManagementService.updateTeacher.bind(teacherManagementService),
  deleteTeacher: teacherManagementService.deleteTeacher.bind(teacherManagementService),
  assignTeacherToClasses: teacherManagementService.assignTeacherToClasses.bind(teacherManagementService),
  getTeacherPerformance: teacherManagementService.getTeacherPerformance.bind(teacherManagementService),
  bulkCreateTeachers: teacherManagementService.bulkCreateTeachers.bind(teacherManagementService),
  getTeachersAnalytics: teacherManagementService.getTeachersAnalytics.bind(teacherManagementService),

  // ========== Attendance ==========
  getAttendanceForClass: attendanceService.getAttendanceForClass.bind(attendanceService),
  recordBulkAttendance: attendanceService.recordBulkAttendance.bind(attendanceService),

  // ========== Assessment ==========
  getAssessments: assessmentService.getAssessments.bind(assessmentService),
  createAssessment: assessmentService.createAssessment.bind(assessmentService),
  getAssessment: assessmentService.getAssessment.bind(assessmentService),
  updateAssessment: assessmentService.updateAssessment.bind(assessmentService),
  deleteAssessment: assessmentService.deleteAssessment.bind(assessmentService),

  // ========== Institution Management ==========
  getInstitutions: institutionService.getInstitutions.bind(institutionService),
  getInstitution: institutionService.getInstitution.bind(institutionService),
  createInstitution: institutionService.createInstitution.bind(institutionService),
  updateInstitution: institutionService.updateInstitution.bind(institutionService),
  deleteInstitution: institutionService.deleteInstitution.bind(institutionService),

  // ========== User Management ==========
  getUsers: userManagementService.getUsers.bind(userManagementService),
  getUser: userManagementService.getUser.bind(userManagementService),
  createUser: userManagementService.createUser.bind(userManagementService),
  updateUser: userManagementService.updateUser.bind(userManagementService),
  deleteUser: userManagementService.deleteUser.bind(userManagementService),

  // ========== Survey Management ==========
  getSurveys: surveyManagementService.getSurveys.bind(surveyManagementService),
  getSurvey: surveyManagementService.getSurvey.bind(surveyManagementService),
  createSurvey: surveyManagementService.createSurvey.bind(surveyManagementService),
  updateSurvey: surveyManagementService.updateSurvey.bind(surveyManagementService),
  deleteSurvey: surveyManagementService.deleteSurvey.bind(surveyManagementService),

  // ========== Task Management ==========
  getTasks: taskManagementService.getTasks.bind(taskManagementService),
  getTask: taskManagementService.getTask.bind(taskManagementService),
  createTask: taskManagementService.createTask.bind(taskManagementService),
  updateTask: taskManagementService.updateTask.bind(taskManagementService),
  deleteTask: taskManagementService.deleteTask.bind(taskManagementService),

  // ========== Reports ==========
  getReports: reportService.getReports.bind(reportService),
  getOverviewStats: reportService.getOverviewStats.bind(reportService),
  getInstitutionalPerformance: reportService.getInstitutionalPerformance.bind(reportService),
  getUserActivityReport: reportService.getUserActivityReport.bind(reportService),

  // ========== Hierarchy ==========
  getHierarchy: hierarchyService.getHierarchy.bind(hierarchyService),
  getInstitutionsHierarchy: hierarchyService.getInstitutionsHierarchy.bind(hierarchyService),

  // ========== Dashboard ==========
  getDashboardStats: dashboardService.getDashboardStats.bind(dashboardService),
  getDashboardOverview: dashboardService.getDashboardOverview.bind(dashboardService),

  // ========== System Configuration ==========
  getSystemConfig: systemConfigService.getSystemConfig.bind(systemConfigService),
  updateSystemConfig: systemConfigService.updateSystemConfig.bind(systemConfigService),
  getSystemInfo: systemConfigService.getSystemInfo.bind(systemConfigService),
  checkSystemHealth: systemConfigService.checkSystemHealth.bind(systemConfigService),

  // ========== Utility Methods ==========
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
};

// ============================================
// REACT QUERY KEYS (ORGANIZED BY DOMAIN)
// ============================================

/**
 * React Query Keys - Organized by Domain
 * Provides type-safe query keys for React Query integration
 */
export const superAdminKeys = {
  all: ['superAdmin'] as const,

  // Class Management Keys
  classes: () => [...superAdminKeys.all, 'classes'] as const,
  class: (id: number) => [...superAdminKeys.classes(), id] as const,

  // Student Management Keys
  students: () => [...superAdminKeys.all, 'students'] as const,
  student: (id: number) => [...superAdminKeys.students(), id] as const,

  // Teacher Management Keys
  teachers: () => [...superAdminKeys.all, 'teachers'] as const,
  teacher: (id: number) => [...superAdminKeys.teachers(), id] as const,

  // Institution Management Keys
  institutions: () => [...superAdminKeys.all, 'institutions'] as const,
  institution: (id: number) => [...superAdminKeys.institutions(), id] as const,

  // User Management Keys
  users: () => [...superAdminKeys.all, 'users'] as const,
  user: (id: number) => [...superAdminKeys.users(), id] as const,

  // Survey Management Keys
  surveys: () => [...superAdminKeys.all, 'surveys'] as const,
  survey: (id: number) => [...superAdminKeys.surveys(), id] as const,

  // Task Management Keys
  tasks: () => [...superAdminKeys.all, 'tasks'] as const,
  task: (id: number) => [...superAdminKeys.tasks(), id] as const,

  // Report Keys
  reports: () => [...superAdminKeys.all, 'reports'] as const,

  // Dashboard Keys
  dashboard: () => [...superAdminKeys.all, 'dashboard'] as const,

  // Hierarchy Keys
  hierarchy: () => [...superAdminKeys.all, 'hierarchy'] as const,

  // System Config Keys
  systemConfig: () => [...superAdminKeys.all, 'systemConfig'] as const,
};

// Default export for convenience
export default superAdminService;
