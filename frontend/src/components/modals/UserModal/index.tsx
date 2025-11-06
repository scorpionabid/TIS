/**
 * UserModal Module - New Barrel Export
 * REFACTORED: 2025-11-04
 *
 * This module now exports the new UserModalTabs component
 * for multi-role user creation and management.
 *
 * Old UserModal (Teacher/Student mode) moved to UserModal.DEPRECATED.tsx
 */

// Export new role-based tabs modal (PRIMARY)
export { UserModalTabs } from './components/UserModalTabs';

// Legacy export for backward compatibility (Teacher/Student modals)
// REMOVED: UserModal.DEPRECATED.tsx was deleted in Sprint 0 cleanup
// export { default as UserModal } from './UserModal.DEPRECATED';
