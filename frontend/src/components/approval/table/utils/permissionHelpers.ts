import { SurveyResponseForApproval } from '../../../../services/surveyResponseApproval';
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

  // Can only approve submitted responses with pending approval
  const canApproveStatus = response?.status === 'submitted' &&
                          response?.approvalRequest?.current_status === 'pending';

  if (!canApproveStatus) return false;

  // Institution hierarchy check
  return checkInstitutionHierarchyAccess(response, user);
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

  // Can only reject submitted responses with pending approval
  const canRejectStatus = response?.status === 'submitted' &&
                         response?.approvalRequest?.current_status === 'pending';

  if (!canRejectStatus) return false;

  // Institution hierarchy check
  return checkInstitutionHierarchyAccess(response, user);
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
    const hasValidApprovalStatus = r?.approvalRequest?.current_status === 'pending';

    return hasSubmittedStatus && hasApprovalRequest && hasValidApprovalStatus;
  });

  const invalidResponses = selectedResponses.filter(r => {
    const hasSubmittedStatus = r?.status === 'submitted';
    const hasApprovalRequest = !!r?.approvalRequest;
    const hasValidApprovalStatus = r?.approvalRequest?.current_status === 'pending';

    return !(hasSubmittedStatus && hasApprovalRequest && hasValidApprovalStatus);
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