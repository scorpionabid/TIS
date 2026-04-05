/**
 * Teachers Service Module
 * Unified entry point for all teacher-related services (RegionAdmin and SchoolAdmin).
 */

import { regionTeacherService } from './regionTeacherService';
import { teacherImportService } from './importService';
import { schoolTeacherService } from './schoolTeacherService';

// Export Types
export * from './types';

// Export Named Singletons
export { regionTeacherService, teacherImportService, schoolTeacherService };

// Backward Compatibility: Export schoolTeacherService as the default 'teacherService'
// for most parts of the app (Gradebook, Workload, etc.)
export { schoolTeacherService as teacherService };

// Backward Compatibility Alias for RegionAdmin
export { regionTeacherService as regionAdminTeacherService };
export { teacherImportService as regionAdminTeacherImportService };

// Unified default export (Safe for ESM/Vite)
const teachersModule = {
  regionTeacherService,
  teacherImportService,
  schoolTeacherService,
  teacherService: schoolTeacherService,
};

export default teachersModule;
