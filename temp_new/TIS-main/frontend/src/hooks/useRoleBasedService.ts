import { useAuth } from '@/contexts/AuthContext';
import { schoolAdminService } from '@/services/schoolAdmin';

// Import new modular SuperAdmin services
import * as SuperAdminGrades from '@/services/superAdmin/superAdminGrades';
import * as SuperAdminStudents from '@/services/superAdmin/superAdminStudents';
import * as SuperAdminTeachers from '@/services/superAdmin/superAdminTeachers';
import * as SuperAdminAttendance from '@/services/superAdmin/superAdminAttendance';
import * as SuperAdminAssessments from '@/services/superAdmin/superAdminAssessments';
import * as SuperAdminInstitutions from '@/services/superAdmin/superAdminInstitutions';
import * as SuperAdminUsers from '@/services/superAdmin/superAdminUsers';
import * as SuperAdminSurveys from '@/services/superAdmin/superAdminSurveys';
import * as SuperAdminTasks from '@/services/superAdmin/superAdminTasks';
import * as SuperAdminReports from '@/services/superAdmin/superAdminReports';
import * as SuperAdminHierarchy from '@/services/superAdmin/superAdminHierarchy';
import * as SuperAdminDashboard from '@/services/superAdmin/superAdminDashboard';
import * as SuperAdminSystem from '@/services/superAdmin/superAdminSystem';

// Keep legacy service for backward compatibility (if needed)
import { superAdminService } from '@/services/superAdmin';

/**
 * Hook to get the appropriate service based on user role
 * SuperAdmin gets direct API access, other roles get role-specific services
 *
 * REFACTORED: Now using modular SuperAdmin services (Sprint 1 Day 4)
 */
export const useRoleBasedService = () => {
  const { currentUser } = useAuth();

  // SuperAdmin gets full system access through modular service architecture
  if (currentUser?.role === 'superadmin') {
    return {
      // Classes (from superAdminGrades)
      getClasses: SuperAdminGrades.getClasses,
      getClass: SuperAdminGrades.getClass,
      createClass: SuperAdminGrades.createClass,
      updateClass: SuperAdminGrades.updateClass,
      deleteClass: SuperAdminGrades.deleteClass,
      getClassStudents: SuperAdminGrades.getClassStudents,
      getClassTeachers: SuperAdminGrades.getClassTeachers,

      // Students (from superAdminStudents)
      getStudents: SuperAdminStudents.getStudents,
      getStudent: SuperAdminStudents.getStudent,
      createStudent: SuperAdminStudents.createStudent,
      updateStudent: SuperAdminStudents.updateStudent,
      deleteStudent: SuperAdminStudents.deleteStudent,

      // Teachers (from superAdminTeachers)
      getTeachers: SuperAdminTeachers.getTeachers,
      getTeacher: SuperAdminTeachers.getTeacher,
      createTeacher: SuperAdminTeachers.createTeacher,
      updateTeacher: SuperAdminTeachers.updateTeacher,
      deleteTeacher: SuperAdminTeachers.deleteTeacher,

      // Attendance (from superAdminAttendance)
      getAttendanceForClass: SuperAdminAttendance.getAttendanceForClass,
      recordBulkAttendance: SuperAdminAttendance.recordBulkAttendance,

      // Assessments (from superAdminAssessments)
      getAssessments: SuperAdminAssessments.getAssessments,
      createAssessment: SuperAdminAssessments.createAssessment,
      getAssessment: SuperAdminAssessments.getAssessment,
      updateAssessment: SuperAdminAssessments.updateAssessment,
      deleteAssessment: SuperAdminAssessments.deleteAssessment,

      // Institutions (from superAdminInstitutions)
      getInstitutions: SuperAdminInstitutions.getInstitutions,
      getInstitution: SuperAdminInstitutions.getInstitution,
      createInstitution: SuperAdminInstitutions.createInstitution,
      updateInstitution: SuperAdminInstitutions.updateInstitution,
      deleteInstitution: SuperAdminInstitutions.deleteInstitution,

      // Users (from superAdminUsers)
      getUsers: SuperAdminUsers.getUsers,
      getUser: SuperAdminUsers.getUser,
      createUser: SuperAdminUsers.createUser,
      updateUser: SuperAdminUsers.updateUser,
      deleteUser: SuperAdminUsers.deleteUser,

      // System-wide access (from various services)
      getSurveys: SuperAdminSurveys.getSurveys,
      getTasks: SuperAdminTasks.getTasks,
      getReports: SuperAdminReports.getReports,
      getHierarchy: SuperAdminHierarchy.getHierarchy,
      getDashboardStats: SuperAdminDashboard.getDashboardStats,
      getSystemConfig: SuperAdminSystem.getSystemConfig,

      // Legacy service instance (for backward compatibility)
      service: superAdminService,
      isSuper: true,
    };
  }
  
  // Other roles get role-specific services with appropriate prefixes
  return {
    // Classes
    getClasses: schoolAdminService.getClasses,
    getClass: schoolAdminService.getClass,
    createClass: schoolAdminService.createClass,
    updateClass: schoolAdminService.updateClass,
    deleteClass: schoolAdminService.deleteClass,
    
    // Students  
    getStudents: schoolAdminService.getSchoolStudents,
    getStudent: (id: number) => schoolAdminService.getSchoolStudents({ page: 1, per_page: 1 }).then(students => students.find(s => s.id === id)),
    createStudent: schoolAdminService.createStudent,
    updateStudent: schoolAdminService.updateStudent,
    deleteStudent: schoolAdminService.deleteStudent,
    
    // Teachers
    getTeachers: schoolAdminService.getTeachers,
    getTeacher: schoolAdminService.getTeacher,
    createTeacher: schoolAdminService.createTeacher,
    updateTeacher: schoolAdminService.updateTeacher,
    deleteTeacher: schoolAdminService.deleteTeacher,
    
    // Attendance
    getAttendanceForClass: schoolAdminService.getAttendanceForClass,
    recordBulkAttendance: schoolAdminService.recordBulkAttendance,
    
    // Assessments
    getAssessments: schoolAdminService.getAssessments,
    createAssessment: schoolAdminService.createAssessment,
    
    // Limited access for non-SuperAdmin roles
    getDashboardStats: schoolAdminService.getDashboardStats,
    
    // Service instance
    service: schoolAdminService,
    isSuper: false,
  };
};

export default useRoleBasedService;