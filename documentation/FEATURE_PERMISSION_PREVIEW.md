# Feature: Permission Preview / Dry-run (FEATURE_PERMISSION_PREVIEW)

This document describes the small feature-flag that controls the permission preview (dry-run) UI and server-side behavior introduced for safe permission assignments.

## Overview

- Flag name: `FEATURE_PERMISSION_PREVIEW`
- Default: `true` (preview enabled)
- Placement: read by backend config `config/feature_flags.php` and returned in the `GET /api/regionadmin/users/permissions/meta` response under `features.permission_preview`.

## Why

The preview/dry-run flow shows admins a list of permissions that would be added/removed and reports issues (missing dependencies, required permissions, not-allowed items, admin missing grants) before persisting changes. During rollout we keep the ability to disable the preview and let clients skip the dry-run. This flag enables staged rollout and emergency rollback.

## How to toggle

1. Edit backend `.env` (in the `backend/` folder or global `.env`) and add or set:

```env
FEATURE_PERMISSION_PREVIEW=false
```

2. Rebuild / restart the backend container so Laravel picks up the new env value. From the repo root:

```bash
# restart backend container (docker-compose)
docker-compose restart backend

# or, if using the helper script in repo
./stop.sh && ./start.sh
```

3. (Optional) Clear config cache inside the container:

```bash
docker-compose exec backend php artisan config:clear
docker-compose exec backend php artisan config:cache
```

## What the flag changes

- When `true` (default):
  - Backend returns `features.permission_preview=true` in the metadata endpoint.
  - Frontend will call `POST /api/regionadmin/users/permissions/validate` before saving, show the preview overlay, and block saving until admin confirms.
- When `false`:
  - Backend returns `features.permission_preview=false`.
  - Frontend will show a non-modal information banner in the User modal warning the preview is disabled and will skip the dry-run; saves proceed directly.

## Manual test (quick checklist)

Prerequisites:

- Docker containers running (`docker-compose up -d`) and you are logged-in as a RegionAdmin in the UI.

Test A — Preview enabled (default):

1. Ensure `FEATURE_PERMISSION_PREVIEW` is `true` or not set (default true).
2. In the app, go to Region Admin → Users page.
3. Click "New User" to open the modal.
4. Select a role (e.g., `sektoradmin`) and toggle a permission that has a dependency (e.g., `users.delete`).
5. Click the modal's primary button to save. The preview overlay should appear showing `added`, `removed` and `missing_dependencies` (e.g., `users.read`). Confirming the preview should then persist the change.

Test B — Preview disabled (quick rollback):

1. Set `FEATURE_PERMISSION_PREVIEW=false` in backend `.env` and restart backend container.
2. Refresh the frontend and open New User modal again.
3. You should see an alert/banner inside the modal saying preview is disabled.
4. Make permission changes and click save — the client will skip the dry-run and immediately call the backend save endpoint.

## API smoke test (curl)

You can call the validate API directly if you have a valid bearer token for a RegionAdmin user. Example shape:

```bash
curl -X POST "http://localhost:8000/api/regionadmin/users/permissions/validate" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": null, "role_name": "sektoradmin", "assignable_permissions": ["users.delete"]}'
```

Expected response (when preview enabled):

```json
{
  "success": true,
  "data": {
    "added": ["users.delete"],
    "removed": [],
    "missing_dependencies": { "users.delete": ["users.read"] },
    "missing_required": [],
    "not_allowed": [],
    "admin_missing_permissions": []
  }
}
```

If you receive `403`, ensure the bearer token belongs to a region admin user and that the user has `institution_id` (regional access) set correctly.

## Developer notes

- Backend: `config/feature_flags.php` holds the default and env override. The controller `RegionAdminUserController::getPermissionMetadata` attaches `features` to the metadata response.
- Frontend: `RegionAdminService.getPermissionMetadata()` now returns `features` under the metadata object. `UserModalTabs` reads `metadata.features.permission_preview` and gates the dry-run/preview flow. When disabled, the UI shows a banner (using existing `Alert` component) and proceeds to save immediately.

## Rollback plan

- To quickly disable previews in production set `FEATURE_PERMISSION_PREVIEW=false` and restart backend. This will make the frontend skip the dry-run flow (clients need refresh).

## Questions / follow-ups

- If you want the preview toggle to be toggleable without container restart, we can implement a DB-backed feature flag and an API to update it live.
