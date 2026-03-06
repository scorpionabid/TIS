# Regional Resources Refactor Plan

This document captures the pragmatic improvement plan for the RegionAdmin resources experience (documents + folders). The focus is on functional stability and manageable changes without introducing heavy tooling.

## Guiding Constraints
- No additional observability tooling (e.g. Telescope) is introduced; rely on existing Laravel logging (`storage/logs/laravel.log`).
- Server capacity (128GB RAM / 32 cores) allows room for moderately heavy queries, so performance work targets only clear hotspots.
- Effort emphasises readability, user feedback, and minimal-risk fixes over large architectural changes.

## Goals
1. Keep the `/documents` and `/document-collections` APIs reliable for RegionAdmin usage.
2. Make the codebase easier to follow by splitting the largest service methods into smaller private helpers.
3. Ensure upload and management actions return clear error/success signals to users.
4. Document manual test scenarios so QA can verify critical flows without automated suites.

## Workstreams

### 1. Backend Service Cleanup
- File: `backend/app/Services/DocumentCollectionService.php`
  - Extract the body of `createRegionalFolders`, `bulkDownloadFolder`, and `uploadDocumentToFolder` into private methods for readability (e.g. `createFolderFromTemplate`, `buildZipArchive`, `persistUploadedDocument`).
  - At the end of `bulkDownloadFolder`, delete the temporary ZIP via `@unlink($zipFilePath)` to prevent disk growth.
  - Add a simple size guard before ZIP creation (skip if folder empty or total size exceeds a configurable limit read from `config('documents.max_bulk_zip_mb', 512)`).
- File: `backend/app/Http/Controllers/DocumentCollectionController.php`
  - Ensure each action logs intent/errors with `\Log::info` / `\Log::warning` (already partially present); verify messages include folder id and user id.

### 2. Permission and Limits Touch-Up
- File: `backend/app/Services/DocumentCollectionService.php`
  - In `canManageFolder`, combine the existing owner checks with a fallback that allows folder creator to manage even if institution changed.
  - In `uploadDocumentToFolder`, add a quick check to block files larger than `Document::MAX_SIZE_MB` (define if missing) and return human-friendly error text.
- File: `frontend/src/utils/permissions.ts`
  - Expand `getFolderUploadPermission` response messages so UI can show why uploads fail (e.g. file too large, folder locked).

### 3. API Query Tightening
- File: `backend/app/Services/DocumentCollectionService.php`
  - Update `getFolderDocumentsPaginated` to push filters (`search`, `file_type`) into the initial query instead of after fetching all results. Use `->when()` conditions with `where` clauses.
  - Maintain existing grouping logic; only move the filter/sort logic closer to the query to reduce over-fetching.

### 4. Frontend Experience
- File: `frontend/src/components/documents/RegionalFolderManager.tsx`
  - Show skeleton cards while loading and a retry button when the query fails.
  - When folder creation/rename/delete fails, display the backend message (from the enhanced permission helper above).
- File: `frontend/src/components/documents/FolderDocumentsViewOptimizedV2.tsx`
  - For upload errors, surface the reason returned by `getFolderUploadPermission`; add a simple retry button next to the error message.
  - Keep the current pagination; no infinite scroll required.

### 5. Manual Testing Checklist
Add a new section to `MANUAL_TEST_GUIDE.md` covering:
1. RegionAdmin login → create folder → verify success toast + folder appears.
2. Upload document from RegionAdmin and from target school (include negative case when not allowed).
3. Bulk download a folder and confirm ZIP deleted after download (check `storage/app/temp` manually).
4. Attempt to upload an oversize file and verify the clarified error message.

## Rollout Steps
1. Implement backend changes, run `php artisan test --filter=DocumentCollection` (if available) and manual smoke tests.
2. Implement frontend feedback improvements, run `npm test -- DocumentCollection` (or the existing suite used by the team) and manual UI checks.
3. Update `MANUAL_TEST_GUIDE.md` with the checklist and inform QA.
4. Deploy during a low-traffic window; monitor `storage/logs/laravel.log` for upload/ZIP-related warnings.

This scope keeps the system functional, improves clarity, and avoids heavy infrastructure changes while still delivering tangible benefits for RegionAdmin workflows.
