# Next Development Plan

## Authentication & Session Hardening

- **Route & Controller Alignment**
  - Update `backend/routes/api/auth.php` so that session routes call the existing `SessionController` methods (`revoke`, `revokeCurrent`, `revokeAll`) and device routes target `DeviceController`’s `index/register/update/destroy`.
  - Add a POST route that maps to `AuthController::refresh()` (e.g. `/refresh-token`) and verify via `php artisan route:list`.

- **Authentication Logging & Rate Limiting**
  - Remove sensitive payload logging from `backend/app/Http/Requests/Auth/LoginRequest.php` and tone down verbose logs in `backend/app/Services/Auth/LoginService.php`.
  - Apply explicit decay values (900 s) to `RateLimiter::hit()` calls in `AuthController::login()` so the documented 15‑minute lockout actually applies to both IP and user keys.

- **Token Lifetime Hardening**
  - Configure Sanctum token expiration (`config/sanctum.php`) and/or supply an `expiresAt` value when calling `createToken()` in `LoginService`.
  - Regression test login/logout flows after changing expiration to ensure tokens are revoked as expected.

- **Device Tracking Enhancements**
  - Extend `authService.login()` (`frontend/src/services/auth.ts`) to send a stable `device_id` (e.g. `crypto.randomUUID()`) alongside `device_name`.
  - Confirm that `LoginService::updateUserDevice()` now captures device info and verify entries in `user_devices`.

- **Token Storage Strategy Review**
  - Evaluate migrating from `localStorage` token storage (`frontend/src/services/apiOptimized.ts`, `AuthContextOptimized.tsx`) to Sanctum’s HTTP-only cookies or another hardened mechanism.
  - Document CSP/XSS mitigations if localStorage must stay; align with security protocols in `CLAUDE.md`.

- **Validation & Regression**
  - Run `php artisan test` (auth-related suites) and frontend Vitest suites covering login after the above changes.
  - Use Postman collection (`backend/ATİS_API_Collection.postman.json`) to manually verify `/login`, `/me`, `/refresh-token`, `/sessions` (including `/current`, `/others`, `/all`), və cihaz endpointləri.

## Role-Based Routing Hardening

- **Guard Region Admin paths**: Wrap the `/regionadmin/*` route group in `frontend/src/App.tsx` with `RoleProtectedRoute` using `[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN]` so other roles cannot access those pages directly.
- **Fix role case usage in layout**: Update `frontend/src/components/layout/Layout.tsx` to compare roles against `USER_ROLES.REGIONADMIN` (lowercase) when setting dashboard titles/subtitles; current `case "RegionAdmin"` never matches.
- **Trim production console logs**: Gate the verbose `console.log` calls in `frontend/src/components/auth/RoleProtectedRoute.tsx` and `frontend/src/components/regionadmin/RegionAdminDashboard.tsx` behind a development check (or remove), to avoid leaking role/context info in production consoles.
- **Extend role mapping safety**: Review `ROLE_MAPPING` in `frontend/src/contexts/AuthContextOptimized.tsx`; add explicit entries for backend roles like `'teacher'` and emit a warning when the fallback (`müəllim`) mapping triggers, so unexpected roles are surfaced during QA.
- **Audit role-based dashboard switch**: Ensure `frontend/src/pages/IndexOptimized.tsx` handles every mapped role—once `ROLE_MAPPING` is aligned, verify the dashboard switch covers the new cases and removes the dead `'teacher'` branch.

## Migration Governance

- **Synchronize environments**: Capture `php artisan migrate:status` from staging/production and compare locally before authoring new migrations so teams share the same head and drift is documented early.
- **Adopt schema dumps**: Integrate `php artisan schema:dump --prune` into local/staging workflows (`documentation/04_database_design/migration-operations-playbook.md`) və `documentation/ops/schema-restore.md` üzrə production bərpa proseduru hazırlayın.
- **Plan online alterations**: `documentation/04_database_design/phased-migration-guidelines.md` üzrə heavyweight cədvəllər üçün phased migrations (nullable sütun → backfill → constraint).
- **Pre-flight validation**: CI-də `php artisan migrate --pretend` və `php artisan migrate:fresh --seed` mərhələlərini tələb edin, `backend/scripts/check-migration-risk.sh` ilə `dropColumn`/`change()` aşkar edin.
- **Rollback & backup readiness**: `backend/backup-database.sh` skriptini genişləndirib snapshotları `database-backups/README.md` və `documentation/ops/backup-register.md` ilə sənədləşdirin.
- **Config alignment checks**: `./scripts/check-config-drift.sh` nəticələrini release checklist-də (`documentation/ops/release-checklist.md`) yoxlayın; `config/permission.php`, `config/sanctum.php` kimi konfiqlər production ilə eyni olmalıdır.

## API Integration Hardening

- **Consistent client usage**: Replace direct `fetch('/api/...')` calls in components such as `frontend/src/pages/regionadmin/RegionAdminUsers.tsx`, `frontend/src/components/modals/TrashedUsersModal.tsx`, and `frontend/src/components/schedules/ScheduleBuilder.tsx` with `apiClient`/service methods so the correct token (`atis_auth_token`) and shared error handling are applied.
- **Fix hierarchy endpoint mismatch**: Update `frontend/src/services/institutions.ts#getHierarchy` (and related helpers) to call the actual backend routes (`/hierarchy`, `/institutions/{id}/hierarchy`) defined in `backend/routes/api/admin.php` instead of the non-existent `/institutions/hierarchy`.
- **Normalize RegionAdmin data access**: Introduce a dedicated RegionAdmin service that wraps `dashboards.php` endpoints (`/regionadmin/users`, `/regionadmin/region-institutions`, etc.) so response shapes (`users` vs `data`) are normalized in one place.
- **Handle permissions failures gracefully**: Augment `BaseService`/`apiClient` to intercept 401/403 responses (common with `permission:` middlewares) and surface user-friendly messages or refresher flows rather than silent failures.

## Page Architecture Review

- **Optimize Regions statistics flow**: Replace the sequential `institutionService.getChildren` loops in `frontend/src/pages/Regions.tsx` with a batched backend endpoint (or aggregated service call) to reduce N+1 requests when loading regional metrics.
- **Improve UserManagement scalability**: Update `frontend/src/pages/Users/UserManagement.tsx` to rely on true server-side pagination (instead of `per_page: 1000`) and align modal workflows with the consolidated `userService` API.
- **Document Suspense & fallback usage**: Audit lazy-loaded modals (`UserModal`, `DeleteConfirmationModal`, etc.) and define shared skeleton/fallback patterns so future page additions follow the same UX guidelines.
- **Remove verbose debug logs**: Wrap page-level diagnostics (`console.log` within Regions, RegionAdminUsers, BaseService) in `if (process.env.NODE_ENV === 'development')` blocks or remove them entirely to keep production consoles clean.

## Backend Architecture

- **RegionAdmin consolidation**: Refactor RegionAdmin controllers to rely on `App\Services\RegionAdmin\*` classes (e.g., `RegionAdminUserService`) and return consistent DTOs so frontend no longer reprocesses payloads.
- **Retire deprecated services**: Remove or migrate remaining references to deprecated classes like `UserService` and `InstitutionService`, consolidating logic into `*CrudService` counterparts to avoid confusion and duplication.
- **Close TODO placeholders**: Prioritize implementation of TODO sections in critical code paths (`DailyAttendanceSummary`, `ScheduleGenerationEngine`, `NotificationService`) to eliminate hard-coded defaults and blocked features.
- **Standardize logging**: Establish a consistent logging pattern (channels, context data) and scrub sensitive information; audit existing `Log::info/error` usage to align with production monitoring standards.
- **Centralize permission helpers**: Extract repeated hierarchy/role filtering routines from `UserPermissionService`, `SchedulePermissionService`, `DocumentPermissionService`, etc., into shared helpers or policies to reduce duplication and ease maintenance.
