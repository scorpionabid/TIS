import { useAuth } from '@/contexts/AuthContext';
import { schoolAdminService } from '@/services/schoolAdmin';
import { superAdminService } from '@/services/superAdmin';

/**
 * Hook to get the appropriate service based on user role
 * SuperAdmin gets direct API access, other roles get role-specific services
 */
export const useRoleBasedService = () => {
  const { currentUser } = useAuth();
  
  // SuperAdmin gets full system access through direct API endpoints
  if (currentUser?.role === 'superadmin') {
    return {
      // Classes
      getClasses: superAdminService.getClasses,
      getClass: superAdminService.getClass,
      createClass: superAdminService.createClass,
      updateClass: superAdminService.updateClass,
      deleteClass: superAdminService.deleteClass,
      getClassStudents: superAdminService.getClassStudents,
      getClassTeachers: superAdminService.getClassTeachers,
      
      // Students
      getStudents: superAdminService.getStudents,
      getStudent: superAdminService.getStudent,
      createStudent: superAdminService.createStudent,
      updateStudent: superAdminService.updateStudent,
      deleteStudent: superAdminService.deleteStudent,
      
      // Teachers
      getTeachers: superAdminService.getTeachers,
      getTeacher: superAdminService.getTeacher,
      createTeacher: superAdminService.createTeacher,
      updateTeacher: superAdminService.updateTeacher,
      deleteTeacher: superAdminService.deleteTeacher,
      
      // Attendance
      getAttendanceForClass: superAdminService.getAttendanceForClass,
      recordBulkAttendance: superAdminService.recordBulkAttendance,
      
      // Assessments
      getAssessments: superAdminService.getAssessments,
      createAssessment: superAdminService.createAssessment,
      getAssessment: superAdminService.getAssessment,
      updateAssessment: superAdminService.updateAssessment,
      deleteAssessment: superAdminService.deleteAssessment,
      
      // Institutions
      getInstitutions: superAdminService.getInstitutions,
      getInstitution: superAdminService.getInstitution,
      createInstitution: superAdminService.createInstitution,
      updateInstitution: superAdminService.updateInstitution,
      deleteInstitution: superAdminService.deleteInstitution,
      
      // Users
      getUsers: superAdminService.getUsers,
      getUser: superAdminService.getUser,
      createUser: superAdminService.createUser,
      updateUser: superAdminService.updateUser,
      deleteUser: superAdminService.deleteUser,
      
      // System-wide access
      getSurveys: superAdminService.getSurveys,
      getTasks: superAdminService.getTasks,
      getReports: superAdminService.getReports,
      getHierarchy: superAdminService.getHierarchy,
      getDashboardStats: superAdminService.getDashboardStats,
      getSystemConfig: superAdminService.getSystemConfig,
      
      // Service instances
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