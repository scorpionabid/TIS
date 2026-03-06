# User Permission Assignment Improvement Plan

## Scope
- Target area: `Users` page modal (`frontend/src/pages/Users/UserManagement.tsx:509-551`) that mounts `UserModalTabs` for create/edit flows.
- Focus: the privilege assignment experience inside the **New user** and **Edit user** modals, including how selections are stored and validated through the backend (`backend/app/Http/Controllers/RegionAdmin/RegionAdminUserController.php`).
- Out of scope: global RBAC refactors, role creation/removal flows, and non-RegionAdmin entry points (e.g. sector admin dashboard) beyond ensuring APIs stay backward compatible.

## Current Implementation Summary

### Frontend
- `UserModalTabs` orchestrates tabbed forms per role and feeds the permission picker (`frontend/src/components/modals/UserModal/components/UserModalTabs.tsx:219-357`).
- The reusable `PermissionAssignmentPanel` renders metadata-driven modules, templates and selection badges but only uses `roleInfo` to show counts instead of enforcing defaults/requirements (`frontend/src/components/modals/UserModal/components/PermissionAssignmentPanel.tsx:223-375`).
- The panel is passed detailed `userPermissions` only when editing RegionOperator users (`frontend/src/components/modals/UserModal/components/RegionOperatorTab.tsx:274-282`). Other tabs omit this prop even though the backend returns per-user breakdowns.
- When the parent page mounts the modal it does **not** pass permission metadata, forcing `UserModalTabs` to fetch `/regionadmin/users/permissions/meta` inside its own effect every time the modal opens (`frontend/src/components/modals/UserModal/components/UserModalTabs.tsx:187-211` vs `frontend/src/pages/Users/UserManagement.tsx:538-550`).
- `transformBackendDataToForm` hydrates the modal with `assignable_permissions` copied straight from the API and does not distinguish direct vs inherited items (`frontend/src/components/modals/UserModal/utils/fieldTransformers.ts:296-347`).

### Backend
- The RegionAdmin controller validates requested permissions, falls back to defaults, and syncs direct permissions for non-RegionOperator roles (`backend/app/Http/Controllers/RegionAdmin/RegionAdminUserController.php:195-277`).
- The `show` endpoint enriches the response with `permissions.direct`, `permissions.via_roles`, and `permissions.all`, but for non-RegionOperators it sets `assignable_permissions` equal to `permissions['all']`, effectively mixing inherited values into the editable array (`backend/app/Http/Controllers/RegionAdmin/RegionAdminUserController.php:319-338`).
- Permission metadata is derived from `config/assignable_permissions.php`, exposing modules, templates, and a role permission matrix with required/default sets (`backend/app/Services/RegionAdmin/RegionAdminPermissionService.php:63-155,300-342`).

## Pain Points Identified
1. **Metadata is fetched repeatedly with no caching.** Every modal open triggers the metadata request because the parent never provides it, adding latency and unnecessary API load (`frontend/src/pages/Users/UserManagement.tsx:538-550` + `frontend/src/components/modals/UserModal/components/UserModalTabs.tsx:187-211`).
2. **Editable list mixes inherited + direct permissions when editing non-RegionOperators.** The controller returns `permissions['all']` into `assignable_permissions` (`backend/app/Http/Controllers/RegionAdmin/RegionAdminUserController.php:336-338`), the form copies it directly (`frontend/src/components/modals/UserModal/utils/fieldTransformers.ts:296-347`), and the submit handler syncs the full list as direct permissions (`frontend/src/components/modals/UserModal/components/UserModalTabs.tsx:284-319`). This inflates direct permissions and makes downgrades risky.
3. **Detailed permission breakdown is unused for most roles.** `PermissionAssignmentPanel` can show `PermissionSource` information (`frontend/src/components/modals/UserModal/components/PermissionAssignmentPanel.tsx:34-58`), but `UserModalTabs` never passes `user?.permissions` except inside the RegionOperator tab (`frontend/src/components/modals/UserModal/components/UserModalTabs.tsx:448-550` vs `frontend/src/components/modals/UserModal/components/RegionOperatorTab.tsx:274-282`), so edit modals do not highlight which items are inherited vs direct.
4. **Required/default rules are not enforced visually.** The role matrix exposes counts, yet the UI merely displays “Default/Required” numbers (`frontend/src/components/modals/UserModal/components/PermissionAssignmentPanel.tsx:234-339`) instead of auto-selecting defaults or locking required permissions. Validation errors therefore surface only after submission (`backend/app/Services/RegionAdmin/RegionAdminPermissionService.php:132-155`).
5. **No impact preview for edits.** When editing, administrators cannot see how their changes differ from the existing assignment or how many permissions will be added/removed before saving; the submission payload also lacks an audit trail for these diffs.

## Proposed Improvement Plan

### Phase 1 – Data Flow Hardening & Instrumentation
1. **Introduce a `usePermissionMetadata` hook (React Query).** Preload metadata when the `Users` page mounts and pass it to `UserModalTabs` so the inner effect becomes a simple fallback. Cache per role for 10–15 minutes to cover repeated modal usage.
2. **Update `RegionAdminUserController@show` to return `assignable_permissions = permissions['direct']`.** Keep `permissions.via_roles` in the payload so the UI can still render inherited entries but only the editable array will be sent back on save.
3. **Hydrate `PermissionAssignmentPanel` with full breakdowns for every tab.** Pipe `user?.permissions` through `UserModalTabs` into each panel invocation (lines `frontend/src/components/modals/UserModal/components/UserModalTabs.tsx:448-550`), reusing the `PermissionSource` logic already implemented in the panel.
4. **Add logging around permission submits.** Capture modal role, selected keys, and diff size in the frontend before calling `onSave`, and persist an audit log entry in the backend service when `syncDirectPermissions` runs. This provides observability while further features are rolled out.

### Phase 2 – UX Enhancements for Creation Flow
1. **Auto-apply role defaults & lock required permissions.** On tab change, prime `permissionSelection` with `roleInfo.defaults` and mark `roleInfo.required` as disabled/always-on chips within `PermissionAssignmentPanel`. Show inline “Required” badges instead of the current count-only summary.
2. **Expose template coverage vs modules.** Extend metadata to include template coverage metrics (how many modules a template satisfies) so the panel can warn when a template still misses required scopes.
3. **Add dependency hints inline.** Surface dependency data from `assignable_permissions` config (already accessible in `RegionAdminPermissionService`) inside the panel: selecting `tasks.approve` visibly auto-selects `tasks.read/update`, and the UI clarifies why toggles became enabled.

### Phase 3 – Edit Flow & Impact Analysis
1. **Diff view between existing and pending assignments.** Compute added/removed direct permissions by comparing `user.permissions.direct` with the pending selection and render a summary panel before enabling the submit button. Include inherited items in a read-only section with “Inherited from role” badges.
2. **Bulk revoke protection.** Warn administrators when they are about to remove permissions that are marked as required/default for the role (using `role_matrix.required/defaults`). Allow overrides only after an explicit confirmation (UX copy + double-confirm dialog).
3. **Add API support for dry-run validation.** Provide a `POST /regionadmin/users/{id}/permissions/validate` endpoint that returns dependency/required warnings before the actual update. The modal can call this when the user clicks “Continue” to show a reliable preview without persisting changes.
4. **Hook detailed diffs into audit events.** Extend `RegionAdminPermissionService::syncDirectPermissions` to accept diff context and dispatch to the audit log channel so future investigations can trace who granted/revoked which permission set.

### Phase 4 – Testing & Rollout
1. **Unit tests:** extend `PermissionAssignmentPanel` tests to cover default locking, dependency auto-selection, and diff summary logic. Backend feature tests should exercise creation/update with new payloads (e.g., verify that direct permissions stay minimal) inside `backend/tests/Feature/RegionAdminUserControllerTest.php`.
2. **Smoke tests:** add Cypress (or Playwright) flows for “Create SchoolAdmin with template” and “Edit user removing inherited permission” to ensure UI guards behave as expected.
3. **Migration strategy:** deploy backend changes (Phase 1) first to avoid breaking existing clients, then release frontend updates once metadata caching and diff UI are ready. Feature-flag the dry-run endpoint usage so it can be toggled off if issues arise.

## Risks & Mitigations
- **Backward compatibility:** Changing `assignable_permissions` to only contain direct permissions requires the frontend to treat inherited data separately. Mitigation: deploy backend update with a temporary `assignable_permissions_all` field and update the modal before removing it.
- **Metadata drift:** Cached permission metadata could become stale after SuperAdmin adjusts config. Mitigation: keep cache TTL small (≤15 minutes) and invalidate on `role_matrix` version field; fallback to existing per-open fetch logic as safety.
- **Complex UX:** Showing diffs and dependency hints can overwhelm the modal. Use progressive disclosure (collapsed “Advanced view” panels) to keep the default experience simple while power users can expand for details.

## Next Steps
1. Implement Phase 1 backend adjustments and React Query hook.
2. Wire `userPermissions` into every panel and release a small UX update that labels direct vs inherited items.
3. Schedule design review for Phase 2 templates/dependency UI.
