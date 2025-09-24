# Deprecated Approval Components

This folder contains components that were deprecated during the Survey Response Approval API consolidation (Phase 3).

## Deprecated Components

### SurveyResponsesTab.tsx
- **Deprecated Date**: 2025-09-23
- **Reason**: Component functionality moved to dedicated SurveyResponseApprovalDashboard
- **Replacement**: Use `/components/approval/SurveyResponseApprovalDashboard.tsx`
- **Last Used**: ApprovalDashboard.tsx (import removed in Phase 2)

### InstitutionResponsesTable.tsx
- **Deprecated Date**: 2025-09-23
- **Reason**: Only used by deprecated SurveyResponsesTab
- **Replacement**: Use ResponseManagementTable in `/components/approval/table/`
- **Last Used**: SurveyResponsesTab.tsx (component deprecated)

## Migration Strategy

These components were part of the old distributed approval system where survey response approvals were mixed with general approvals. The new consolidated architecture separates:

- **General Approvals**: Handled by ApprovalDashboard + ApprovalActionModal + ApprovalDetailsModal
- **Survey Response Approvals**: Handled by SurveyResponseApprovalDashboard + surveyResponseApprovalService

## Safe Removal

These components can be safely deleted after:
1. ✅ Verification that no imports exist in active codebase
2. ✅ Confirmation that functionality is available in replacement components
3. ✅ Successful testing of consolidated system

## Related Documentation

See `/documentation/SURVEY_APPROVAL_API_MIGRATION.md` for complete migration details.