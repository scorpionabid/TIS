import { SurveyResponseForApproval } from "../../../../services/surveyApproval";
import { User } from '../../../../types/user';

/**
 * Check if user can edit a survey response based on role and institution hierarchy
 */
export const canEditResponse = (response: SurveyResponseForApproval, user?: User | null): boolean => {
  if (!user) return false;

  // Only specific roles can edit responses
  const canEditRoles = ['sektoradmin', 'regionadmin', 'superadmin'];
  // Check both role field and permissions array (for Spatie Laravel Permission compatibility)
  const userRoles = user.permissions || [];
  const hasEditRole = (user.role && canEditRoles.includes(user.role)) ||
                     canEditRoles.some(role => userRoles.includes(role));

  if (!hasEditRole) return false;

  // Can only edit specific statuses
  const canEditStatuses = ['draft', 'submitted'];
  const isEditableStatus = response?.status && canEditStatuses.includes(response.status);

  // Can only edit if approval status allows it
  const canEditApprovalStatuses = ['pending', 'in_progress', undefined];
  const isEditableApprovalStatus = canEditApprovalStatuses.includes(response.approvalRequest?.current_status);

  if (!isEditableStatus || !isEditableApprovalStatus) return false;

  // Institution hierarchy check
  const hasInstitutionAccess = checkInstitutionHierarchyAccess(response, user);

  return hasInstitutionAccess;
};

/**
 * Check if user has access to a response based on institution hierarchy
 */
const checkInstitutionHierarchyAccess = (response: SurveyResponseForApproval, user: User): boolean => {
  // SuperAdmin has access to everything
  if (user.role === 'superadmin') {
    return true;
  }

  // If user doesn't have institution data, deny access
  if (!user.institution) {
    return false;
  }

  // If response doesn't have institution data, deny access
  if (!response.institution) {
    return false;
  }

  const userInstitution = user.institution;
  const responseInstitution = response.institution;

  // RegionAdmin can access institutions in their region and below
  if (user.role === 'regionadmin') {
    // RegionAdmin (level 2) can access level 3 (sector) and level 4 (school) institutions
    // They should have access if the response institution is under their regional authority

    // If they're from the same institution, allow
    if (userInstitution.id === responseInstitution.id) {
      return true;
    }

    // If user is at regional level (level 2) and response is from sector/school (level 3/4),
    // we need to check if they're in the same hierarchy
    // For now, allow if user's level is lower than response's level (indicating hierarchy)
    if (userInstitution.level && responseInstitution.level) {
      return userInstitution.level <= responseInstitution.level;
    }

    return false;
  }

  // SektorAdmin can access schools in their sector
  if (user.role === 'sektoradmin') {
    // SektorAdmin (level 3) can access level 4 (school) institutions

    // If they're from the same institution, allow
    if (userInstitution.id === responseInstitution.id) {
      return true;
    }

    // If user is at sector level (level 3) and response is from school (level 4)
    if (userInstitution.level === 3 && responseInstitution.level === 4) {
      // For now, allow access to schools (should be refined with proper parent-child relationship)
      return true;
    }

    return false;
  }

  // For other roles, only allow access to same institution
  return userInstitution.id === responseInstitution.id;
};

/**
 * Check if user can approve a survey response
 */
export const canApproveResponse = (response: SurveyResponseForApproval, user?: User | null): boolean => {
  if (!user) return false;

  // Only specific roles can approve
  const canApproveRoles = ['sektoradmin', 'regionadmin', 'superadmin'];
  // Check both role field and permissions array (for Spatie Laravel Permission compatibility)
  const userRoles = user.permissions || [];
  const hasApprovalRole = (user.role && canApproveRoles.includes(user.role)) ||
                         canApproveRoles.some(role => userRoles.includes(role));

  if (!hasApprovalRole) return false;

  // Must be submitted response
  if (response?.status !== 'submitted') return false;

  // Check approval request exists
  if (!response?.approvalRequest) return false;

  // SuperAdmin can approve any pending or in_progress approval
  if (user.role === 'superadmin') {
    return ['pending', 'in_progress'].includes(response.approvalRequest.current_status);
  }

  // For RegionAdmin and SektorAdmin, check if they can approve at current level
  const currentLevel = response.approvalRequest.current_approval_level;
  const currentStatus = response.approvalRequest.current_status;

  // Can approve if:
  // 1. Status is 'pending' (level 1 - awaiting first approval)
  // 2. Status is 'in_progress' and current level matches user's role level
  if (currentStatus === 'pending') return true;

  if (currentStatus === 'in_progress') {
    // SektorAdmin approves at level 2
    if (user.role === 'sektoradmin' && currentLevel === 2) return true;

    // RegionAdmin approves at level 3
    if (user.role === 'regionadmin' && currentLevel === 3) return true;
  }

  return false;
};

/**
 * Check if user can reject a survey response
 */
export const canRejectResponse = (response: SurveyResponseForApproval, user?: User | null): boolean => {
  if (!user) return false;

  // Only specific roles can reject
  const canRejectRoles = ['sektoradmin', 'regionadmin', 'superadmin'];
  // Check both role field and permissions array (for Spatie Laravel Permission compatibility)
  const userRoles = user.permissions || [];
  const hasRejectRole = (user.role && canRejectRoles.includes(user.role)) ||
                       canRejectRoles.some(role => userRoles.includes(role));

  if (!hasRejectRole) return false;

  // Must be submitted response
  if (response?.status !== 'submitted') return false;

  // Check approval request exists
  if (!response?.approvalRequest) return false;

  // SuperAdmin can reject any pending or in_progress approval
  if (user.role === 'superadmin') {
    return ['pending', 'in_progress'].includes(response.approvalRequest.current_status);
  }

  // For RegionAdmin and SektorAdmin, check if they can reject at current level
  const currentLevel = response.approvalRequest.current_approval_level;
  const currentStatus = response.approvalRequest.current_status;

  // Can reject if:
  // 1. Status is 'pending' (level 1 - awaiting first approval)
  // 2. Status is 'in_progress' and current level matches user's role level
  if (currentStatus === 'pending') return true;

  if (currentStatus === 'in_progress') {
    // SektorAdmin rejects at level 2
    if (user.role === 'sektoradmin' && currentLevel === 2) return true;

    // RegionAdmin rejects at level 3
    if (user.role === 'regionadmin' && currentLevel === 3) return true;
  }

  return false;
};

/**
 * Check if user can perform bulk operations on selected responses
 */
export const canPerformBulkAction = (
  responses: SurveyResponseForApproval[],
  selectedIds: number[],
  action: 'approve' | 'reject' | 'return',
  user?: User | null
): boolean => {
  if (!user || selectedIds.length === 0) return false;

  const selectedResponses = responses.filter(r => selectedIds.includes(r.id));

  switch (action) {
    case 'approve':
      return selectedResponses.every(r => canApproveResponse(r, user));
    case 'reject':
    case 'return':
      return selectedResponses.every(r => canRejectResponse(r, user));
    default:
      return false;
  }
};

/**
 * Get responses that are valid for bulk approval operations
 */
export const getValidResponsesForBulkAction = (
  responses: SurveyResponseForApproval[],
  selectedIds: number[],
  user?: User | null
): {
  validResponses: SurveyResponseForApproval[];
  invalidResponses: SurveyResponseForApproval[];
} => {
  const selectedResponses = selectedIds
    .map(id => responses.find(r => r.id === id))
    .filter(Boolean) as SurveyResponseForApproval[];

  const validResponses = selectedResponses.filter(r => {
    const hasSubmittedStatus = r?.status === 'submitted';
    const hasApprovalRequest = !!r?.approvalRequest;

    // Use the same logic as individual approval permission checks
    if (!hasSubmittedStatus || !hasApprovalRequest) return false;

    const currentStatus = r.approvalRequest.current_status;
    const currentLevel = r.approvalRequest.current_approval_level;

    // Valid if pending (level 1) or in_progress at user's level
    if (currentStatus === 'pending') return true;

    if (currentStatus === 'in_progress' && user) {
      if (user.role === 'sektoradmin' && currentLevel === 2) return true;
      if (user.role === 'regionadmin' && currentLevel === 3) return true;
      if (user.role === 'superadmin') return true;
    }

    return false;
  });

  const invalidResponses = selectedResponses.filter(r => {
    const hasSubmittedStatus = r?.status === 'submitted';
    const hasApprovalRequest = !!r?.approvalRequest;

    if (!hasSubmittedStatus || !hasApprovalRequest) return true;

    const currentStatus = r.approvalRequest.current_status;
    const currentLevel = r.approvalRequest.current_approval_level;

    // Invalid if not pending and not at user's level when in_progress
    if (currentStatus === 'pending') return false;

    if (currentStatus === 'in_progress' && user) {
      if (user.role === 'sektoradmin' && currentLevel === 2) return false;
      if (user.role === 'regionadmin' && currentLevel === 3) return false;
      if (user.role === 'superadmin') return false;
    }

    return true;
  });

  return { validResponses, invalidResponses };
};

/**
 * Check if user has permission to export responses
 */
export const canExportResponses = (user?: User | null): boolean => {
  if (!user) return false;

  // All authenticated users can export, but with different access levels
  return true;
};

/**
 * Check if user can view response details
 */
export const canViewResponseDetails = (response: SurveyResponseForApproval, user?: User | null): boolean => {
  if (!user) return false;

  // All authenticated users can view, but with different detail levels
  return true;
};

/**
 * Get user's access level for determining what data to show
 */
export const getUserAccessLevel = (user?: User | null): 'superadmin' | 'regionadmin' | 'sektoradmin' | 'basic' | 'none' => {
  if (!user) return 'none';

  // Check both role field and permissions array (for Spatie Laravel Permission compatibility)
  const userRoles = user.permissions || [];

  if (user.role === 'superadmin' || userRoles.includes('superadmin')) return 'superadmin';
  if (user.role === 'regionadmin' || userRoles.includes('regionadmin')) return 'regionadmin';
  if (user.role === 'sektoradmin' || userRoles.includes('sektoradmin')) return 'sektoradmin';

  return 'basic';
};