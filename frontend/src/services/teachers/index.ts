/**
 * Teachers Service Module
 * Unified entry point for all teacher-related services (RegionAdmin and SchoolAdmin).
 */

// Export Types
export * from './types';

// Export Named Singletons
export { regionTeacherService } from './regionTeacherService';
export { teacherImportService } from './importService';
export { schoolTeacherService } from './schoolTeacherService';

// Backward Compatibility: Export schoolTeacherService as the default 'teacherService'
// for most parts of the app (Gradebook, Workload, etc.)
export { schoolTeacherService as teacherService } from './schoolTeacherService';

// Backward Compatibility Alias for RegionAdmin
export { regionTeacherService as regionAdminTeacherService } from './regionTeacherService';
export { teacherImportService as regionAdminTeacherImportService } from './importService';

// Unified default export
export default {
  regionTeacherService: require('./regionTeacherService').regionTeacherService,
  teacherImportService: require('./importService').teacherImportService,
  schoolTeacherService: require('./schoolTeacherService').schoolTeacherService,
  teacherService: require('./schoolTeacherService').schoolTeacherService,
};
