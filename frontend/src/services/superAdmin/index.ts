/**
 * SuperAdmin Services - Barrel Exports
 *
 * This file provides backward compatibility by re-exporting all methods
 * from domain-specific services. Components can continue using:
 *   import { getUsers, getInstitutions } from '@/services/superAdmin'
 *
 * Or import specific services:
 *   import * as UsersService from '@/services/superAdmin/superAdminUsers'
 */

// Re-export all types
export * from './types';

// Re-export all service methods for backward compatibility
export * from './superAdminGrades';
export * from './superAdminStudents';
export * from './superAdminTeachers';
export * from './superAdminInstitutions';
export * from './superAdminUsers';
export * from './superAdminSurveys';
export * from './superAdminTasks';
export * from './superAdminReports';
export * from './superAdminDashboard';
export * from './superAdminSystem';
export * from './superAdminHierarchy';
export * from './superAdminAttendance';
export * from './superAdminAssessments';

// Also export as namespaces for more explicit usage
import * as GradesService from './superAdminGrades';
import * as StudentsService from './superAdminStudents';
import * as TeachersService from './superAdminTeachers';
import * as InstitutionsService from './superAdminInstitutions';
import * as UsersService from './superAdminUsers';
import * as SurveysService from './superAdminSurveys';
import * as TasksService from './superAdminTasks';
import * as ReportsService from './superAdminReports';
import * as DashboardService from './superAdminDashboard';
import * as SystemService from './superAdminSystem';
import * as HierarchyService from './superAdminHierarchy';
import * as AttendanceService from './superAdminAttendance';
import * as AssessmentsService from './superAdminAssessments';

export {
  GradesService,
  StudentsService,
  TeachersService,
  InstitutionsService,
  UsersService,
  SurveysService,
  TasksService,
  ReportsService,
  DashboardService,
  SystemService,
  HierarchyService,
  AttendanceService,
  AssessmentsService,
};

/**
 * Legacy SuperAdminService class for backward compatibility
 * This mimics the old service structure where everything was in one class
 */
export class SuperAdminService {
  // Classes/Grades
  getClasses = GradesService.getClasses;
  getClass = GradesService.getClass;
  createClass = GradesService.createClass;
  updateClass = GradesService.updateClass;
  deleteClass = GradesService.deleteClass;
  getClassStudents = GradesService.getClassStudents;
  getClassTeachers = GradesService.getClassTeachers;

  // Students
  getStudents = StudentsService.getStudents;
  getStudent = StudentsService.getStudent;
  createStudent = StudentsService.createStudent;
  updateStudent = StudentsService.updateStudent;
  deleteStudent = StudentsService.deleteStudent;

  // Teachers
  getTeachers = TeachersService.getTeachers;
  getTeacher = TeachersService.getTeacher;
  createTeacher = TeachersService.createTeacher;
  updateTeacher = TeachersService.updateTeacher;
  deleteTeacher = TeachersService.deleteTeacher;
  assignTeacherToClasses = TeachersService.assignTeacherToClasses;
  getTeacherPerformance = TeachersService.getTeacherPerformance;
  bulkCreateTeachers = TeachersService.bulkCreateTeachers;
  getTeachersAnalytics = TeachersService.getTeachersAnalytics;

  // Attendance
  getAttendanceForClass = AttendanceService.getAttendanceForClass;
  recordBulkAttendance = AttendanceService.recordBulkAttendance;

  // Assessments
  getAssessments = AssessmentsService.getAssessments;
  createAssessment = AssessmentsService.createAssessment;
  getAssessment = AssessmentsService.getAssessment;
  updateAssessment = AssessmentsService.updateAssessment;
  deleteAssessment = AssessmentsService.deleteAssessment;

  // Institutions
  getInstitutions = InstitutionsService.getInstitutions;
  getInstitution = InstitutionsService.getInstitution;
  createInstitution = InstitutionsService.createInstitution;
  updateInstitution = InstitutionsService.updateInstitution;
  deleteInstitution = InstitutionsService.deleteInstitution;

  // Users
  getUsers = UsersService.getUsers;
  getUser = UsersService.getUser;
  createUser = UsersService.createUser;
  updateUser = UsersService.updateUser;
  deleteUser = UsersService.deleteUser;

  // Surveys
  getSurveys = SurveysService.getSurveys;
  getSurvey = SurveysService.getSurvey;
  createSurvey = SurveysService.createSurvey;
  updateSurvey = SurveysService.updateSurvey;
  deleteSurvey = SurveysService.deleteSurvey;

  // Tasks
  getTasks = TasksService.getTasks;
  getTask = TasksService.getTask;
  createTask = TasksService.createTask;
  updateTask = TasksService.updateTask;
  deleteTask = TasksService.deleteTask;

  // Reports
  getReports = ReportsService.getReports;
  getInstitutionalPerformance = ReportsService.getInstitutionalPerformance;
  getUserActivityReport = ReportsService.getUserActivityReport;

  // Dashboard
  getOverviewStats = DashboardService.getOverviewStats;
  getDashboardStats = DashboardService.getDashboardStats;
  getDashboardOverview = DashboardService.getDashboardOverview;

  // Hierarchy
  getHierarchy = HierarchyService.getHierarchy;
  getInstitutionsHierarchy = HierarchyService.getInstitutionsHierarchy;

  // System
  getSystemConfig = SystemService.getSystemConfig;
  updateSystemConfig = SystemService.updateSystemConfig;
  getSystemInfo = SystemService.getSystemInfo;
  checkSystemHealth = SystemService.checkSystemHealth;
  exportData = SystemService.exportData;
}

// Export a singleton instance for backward compatibility
export const superAdminService = new SuperAdminService();

// Default export for convenience
export default superAdminService;
