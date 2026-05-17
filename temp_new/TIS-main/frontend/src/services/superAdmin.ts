/**
 * SuperAdmin Service - Legacy Export
 *
 * Sprint 9 Refactoring: This file maintains backward compatibility
 * by re-exporting from the new domain-based service structure.
 *
 * The actual implementation has been split into 13 domain services
 * located in ./superadmin/ directory for better maintainability.
 *
 * @deprecated Import from '@/services/superadmin' for better tree-shaking
 */

// Re-export everything from the new structure
export * from './superadmin';

// Re-export default for convenience
export { default } from './superadmin';
