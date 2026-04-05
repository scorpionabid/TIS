/**
 * Backward compatibility proxy for RegionAdmin Teacher Service
 * Redirects all imports and exports to the new modular structure in @/services/teachers
 */

import teachers from './teachers';
export * from './teachers';

export const regionAdminTeacherService = teachers;
export const regionAdminTeacherImportService = teachers;

export default teachers;
