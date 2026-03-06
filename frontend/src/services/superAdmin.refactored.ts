/**
 * SuperAdmin Service - Refactored Delegator Pattern
 *
 * This service acts as a unified interface for SuperAdmin operations,
 * delegating to specialized domain services instead of duplicating code.
 *
 * Benefits:
 * - Eliminates code duplication (was 1035 lines)
 * - Maintains single source of truth for each domain
 * - Easier to maintain and test
 * - Follows DRY principles
 */

import { PaginationParams } from './BaseService';
import { logger } from '@/utils/logger';

// Import specialized domain services
import gradesService from './grades';
import studentsService from './students';
import teachersService from './teachers';
import attendanceService from './attendance';
import assessmentsService from './assessments';
import institutionsService from './institutions';
import usersService from './users';
import surveysService from './surveys';
import tasksService from './tasks';
import reportsService from './reports';
import hierarchyService from './hierarchy';
import dashboardService from './dashboard';

/**
 * SuperAdmin Service - Delegator Pattern
 *
 * SuperAdmin has direct access to all API endpoints without role-specific prefixes.
 * This service delegates to specialized services for actual implementation.
 */
class SuperAdminService {
  // ===================
  // CLASS MANAGEMENT
  // ===================
  // Delegate to gradesService (grades = classes in our system)
  getClasses = gradesService.getGrades.bind(gradesService);
  getClass = gradesService.getGrade.bind(gradesService);
  createClass = gradesService.createGrade.bind(gradesService);
  updateClass = gradesService.updateGrade.bind(gradesService);
  deleteClass = gradesService.deleteGrade.bind(gradesService);
  getClassStudents = gradesService.getGradeStudents.bind(gradesService);
  getClassTeachers = gradesService.getGradeTeachers.bind(gradesService);
  getClassSchedule = gradesService.getGradeSchedule?.bind(gradesService);
  getClassAttendance = gradesService.getGradeAttendance?.bind(gradesService);

  // ===================
  // STUDENT MANAGEMENT
  // ===================
  // Delegate to studentsService
  getStudents = studentsService.getStudents.bind(studentsService);
  getStudent = studentsService.getStudent.bind(studentsService);
  createStudent = studentsService.createStudent.bind(studentsService);
  updateStudent = studentsService.updateStudent.bind(studentsService);
  deleteStudent = studentsService.deleteStudent.bind(studentsService);
  getStudentAttendance = studentsService.getStudentAttendance?.bind(studentsService);
  getStudentAssessments = studentsService.getStudentAssessments?.bind(studentsService);
  assignStudentToClass = studentsService.assignStudentToClass?.bind(studentsService);

  // ===================
  // TEACHER MANAGEMENT
  // ===================
  // Delegate to teachersService
  getTeachers = teachersService.getTeachers.bind(teachersService);
  getTeacher = teachersService.getTeacher.bind(teachersService);
  createTeacher = teachersService.createTeacher?.bind(teachersService);
  updateTeacher = teachersService.updateTeacher.bind(teachersService);
  deleteTeacher = teachersService.deleteTeacher?.bind(teachersService);
  getTeacherSchedule = teachersService.getTeacherSchedule?.bind(teachersService);
  assignTeacherToClass = teachersService.assignTeacherToClass?.bind(teachersService);

  // ===================
  // ATTENDANCE MANAGEMENT
  // ===================
  // Delegate to attendanceService
  getAttendanceRecords = attendanceService.getAttendanceRecords?.bind(attendanceService);
  getAttendanceRecord = attendanceService.getAttendanceRecord?.bind(attendanceService);
  createAttendanceRecord = attendanceService.createAttendanceRecord?.bind(attendanceService);
  updateAttendanceRecord = attendanceService.updateAttendanceRecord?.bind(attendanceService);
  deleteAttendanceRecord = attendanceService.deleteAttendanceRecord?.bind(attendanceService);
  getAttendanceStats = attendanceService.getAttendanceStats?.bind(attendanceService);

  // ===================
  // ASSESSMENT MANAGEMENT
  // ===================
  // Delegate to assessmentsService
  getAssessments = assessmentsService.getAssessments?.bind(assessmentsService);
  getAssessment = assessmentsService.getAssessment?.bind(assessmentsService);
  createAssessment = assessmentsService.createAssessment?.bind(assessmentsService);
  updateAssessment = assessmentsService.updateAssessment?.bind(assessmentsService);
  deleteAssessment = assessmentsService.deleteAssessment?.bind(assessmentsService);
  getAssessmentResults = assessmentsService.getAssessmentResults?.bind(assessmentsService);

  // ===================
  // INSTITUTION MANAGEMENT
  // ===================
  // Delegate to institutionsService
  getInstitutions = institutionsService.getInstitutions.bind(institutionsService);
  getInstitution = institutionsService.getInstitution.bind(institutionsService);
  createInstitution = institutionsService.createInstitution.bind(institutionsService);
  updateInstitution = institutionsService.updateInstitution.bind(institutionsService);
  deleteInstitution = institutionsService.deleteInstitution.bind(institutionsService);
  getInstitutionStats = institutionsService.getInstitutionStats?.bind(institutionsService);
  getInstitutionHierarchy = institutionsService.getHierarchy?.bind(institutionsService);

  // ===================
  // USER MANAGEMENT
  // ===================
  // Delegate to usersService
  getUsers = usersService.getUsers.bind(usersService);
  getUser = usersService.getUser.bind(usersService);
  createUser = usersService.createUser.bind(usersService);
  updateUser = usersService.updateUser.bind(usersService);
  deleteUser = usersService.deleteUser.bind(usersService);
  getUserRoles = usersService.getUserRoles?.bind(usersService);
  assignUserRole = usersService.assignUserRole?.bind(usersService);
  updateUserPassword = usersService.updateUserPassword?.bind(usersService);

  // ===================
  // SURVEY MANAGEMENT
  // ===================
  // Delegate to surveysService
  getSurveys = surveysService.getSurveys.bind(surveysService);
  getSurvey = surveysService.getSurvey.bind(surveysService);
  createSurvey = surveysService.createSurvey.bind(surveysService);
  updateSurvey = surveysService.updateSurvey.bind(surveysService);
  deleteSurvey = surveysService.deleteSurvey.bind(surveysService);
  getSurveyResponses = surveysService.getSurveyResponses?.bind(surveysService);
  getSurveyAnalytics = surveysService.getSurveyAnalytics?.bind(surveysService);

  // ===================
  // TASK MANAGEMENT
  // ===================
  // Delegate to tasksService
  getTasks = tasksService.getTasks.bind(tasksService);
  getTask = tasksService.getTask.bind(tasksService);
  createTask = tasksService.createTask.bind(tasksService);
  updateTask = tasksService.updateTask.bind(tasksService);
  deleteTask = tasksService.deleteTask.bind(tasksService);
  getTaskProgress = tasksService.getTaskProgress?.bind(tasksService);
  bulkAssignTasks = tasksService.bulkAssignTasks?.bind(tasksService);

  // ===================
  // REPORT MANAGEMENT
  // ===================
  // Delegate to reportsService
  getReports = reportsService.getReports?.bind(reportsService);
  getReport = reportsService.getReport?.bind(reportsService);
  generateReport = reportsService.generateReport?.bind(reportsService);
  exportReport = reportsService.exportReport?.bind(reportsService);
  getReportStats = reportsService.getReportStats?.bind(reportsService);

  // ===================
  // HIERARCHY MANAGEMENT
  // ===================
  // Delegate to hierarchyService
  getHierarchy = hierarchyService.getHierarchy?.bind(hierarchyService);
  getInstitutionChildren = hierarchyService.getInstitutionChildren?.bind(hierarchyService);
  getInstitutionParent = hierarchyService.getInstitutionParent?.bind(hierarchyService);
  updateHierarchy = hierarchyService.updateHierarchy?.bind(hierarchyService);

  // ===================
  // DASHBOARD STATS
  // ===================
  // Delegate to dashboardService
  getDashboardStats = dashboardService.getStats?.bind(dashboardService);
  getSystemOverview = dashboardService.getSystemOverview?.bind(dashboardService);
  getActivityLog = dashboardService.getActivityLog?.bind(dashboardService);

  // ===================
  // SYSTEM CONFIGURATION
  // ===================

  /**
   * System-wide configuration methods
   * These are truly SuperAdmin-specific and don't belong to other services
   */
  async getSystemConfig(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching system config', {
        component: 'SuperAdminService',
        action: 'getSystemConfig'
      });

      const { apiClient } = await import('./api');
      const { handleApiResponse } = await import('@/utils/apiResponseHandler');
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

      const { apiClient } = await import('./api');
      const { handleApiResponseWithError } = await import('@/utils/apiResponseHandler');
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

      const { apiClient } = await import('./api');
      const { handleApiResponse } = await import('@/utils/apiResponseHandler');
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

      const { apiClient } = await import('./api');
      const { handleApiResponse } = await import('@/utils/apiResponseHandler');
      const response = await apiClient.get('/system/health');
      return handleApiResponse(response, 'SuperAdminService.checkSystemHealth');
    } catch (error) {
      logger.error('Failed to check system health', error);
      throw error;
    }
  }

  async getOverviewStats(): Promise<any> {
    try {
      logger.debug('SuperAdmin fetching overview stats', {
        component: 'SuperAdminService',
        action: 'getOverviewStats'
      });

      const { apiClient } = await import('./api');
      const { handleApiResponse } = await import('@/utils/apiResponseHandler');
      const response = await apiClient.get('/dashboard/overview');
      return handleApiResponse(response, 'SuperAdminService.getOverviewStats');
    } catch (error) {
      logger.error('Failed to fetch overview stats', error);
      throw error;
    }
  }

  async getDashboardOverview(): Promise<any> {
    return this.getOverviewStats(); // Alias for backward compatibility
  }

  // ===================
  // UTILITY METHODS
  // ===================

  /**
   * Bulk operations that span multiple services
   */
  async bulkImport(data: any): Promise<any> {
    try {
      logger.debug('SuperAdmin bulk import', {
        component: 'SuperAdminService',
        action: 'bulkImport'
      });

      // TODO: Implement bulk import orchestration
      throw new Error('Not implemented yet');
    } catch (error) {
      logger.error('Failed to bulk import', error);
      throw error;
    }
  }

  async bulkExport(options: any): Promise<any> {
    try {
      logger.debug('SuperAdmin bulk export', {
        component: 'SuperAdminService',
        action: 'bulkExport'
      });

      // TODO: Implement bulk export orchestration
      throw new Error('Not implemented yet');
    } catch (error) {
      logger.error('Failed to bulk export', error);
      throw error;
    }
  }
}

// Export singleton instance
const superAdminService = new SuperAdminService();
export default superAdminService;

// Also export the class for testing purposes
export { SuperAdminService };
