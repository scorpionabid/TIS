# ATİS Document Storage Architecture

## Overview
ATİS uses Laravel's filesystem abstraction with private storage for secure document management. All documents are stored with hierarchical access control and organized by upload date.

## Storage Structure

### Directory Layout
```
storage/
├── app/
│   ├── private/              # Private storage (NOT web-accessible)
│   │   └── documents/        # All institutional documents
│   │       └── YYYY/         # Year-based organization
│   │           └── MM/       # Month-based organization
│   │               └── files # Actual document files
│   └── public/               # Public storage (web-accessible via symlink)
│       └── avatars/          # User profile pictures, etc.
└── logs/                     # Application logs
```

### File Naming Convention
- **Pattern**: `YYYY-MM-DD_HH-MM-SS_XXXXXXXX.ext`
- **Example**: `2025-09-30_14-30-45_hSpYProS.pdf`
- **Components**:
  - Timestamp: Upload date/time for sorting
  - Random hash: 8 characters for uniqueness
  - Extension: Original file extension preserved

## Storage Disks Configuration

### Location: `config/filesystems.php`

```php
'disks' => [
    // Default private storage
    'local' => [
        'driver' => 'local',
        'root' => storage_path('app/private'),
        'visibility' => 'private',
    ],

    // Dedicated documents disk (aliases 'local' for clarity)
    'documents' => [
        'driver' => 'local',
        'root' => storage_path('app/private'),
        'visibility' => 'private',
    ],
],
```

**Note**: Both `local` and `documents` disks use the same root directory. The `documents` disk exists for semantic clarity and future scalability (e.g., moving to S3).

## File Upload Flow

### 1. Upload Request
```
Frontend → POST /api/documents
Body: {
  title: "Document Title",
  file: [File],
  accessible_institutions: [7, 5]  // Sector, Region
}
```

### 2. Backend Processing (`DocumentService::storeFile`)
```php
// Generate unique filename
$storedFilename = Document::generateStoredFilename($file->getClientOriginalName());
// Example: 2025-09-30_14-30-45_hSpYProS.pdf

// Store to: storage/app/private/documents/2025/09/
$filePath = 'documents/' . now()->format('Y/m') . '/' . $storedFilename;
$file->storeAs('documents/' . now()->format('Y/m'), $storedFilename, 'local');

// Verify storage
if (!Storage::exists($filePath)) {
    throw new \Exception('File storage verification failed');
}
```

### 3. Database Record
```php
Document::create([
    'title' => $validatedData['title'],
    'file_path' => 'documents/2025/09/2025-09-30_14-30-45_hSpYProS.pdf',
    'original_filename' => 'report.pdf',
    'stored_filename' => '2025-09-30_14-30-45_hSpYProS.pdf',
    'mime_type' => 'application/pdf',
    'file_size' => 1024000,
    'accessible_institutions' => [7, 5],  // JSON array
    'institution_id' => 11,  // Uploader's institution
    'uploaded_by' => 2,      // User ID
]);
```

## File Download Flow

### 1. Download Request
```
Frontend → GET /api/documents/{id}/download
Headers: {
  Authorization: Bearer {token}
}
```

### 2. Access Control Checks (`DocumentPermissionService`)

#### Permission Hierarchy:
1. **Document Owner**: User who uploaded → ✅ Always allowed
2. **Target Institutions**: Users from institutions in `accessible_institutions` array → ✅ Allowed
3. **Hierarchical Access**:
   - RegionAdmin can access documents from all schools/sectors in their region
   - SektorAdmin can access documents from all schools in their sector
   - SchoolAdmin can only access documents from their school
4. **Public Documents**: If `is_public = true` → ✅ All authenticated users

#### Code Flow:
```php
// 1. Check basic access (Document model)
if (!$document->canAccess($user)) {
    abort(403);
}

// 2. Check hierarchical permission (Service layer)
if (!$permissionService->canUserAccessDocument($user, $document)) {
    abort(403);
}

// 3. Check downloadable flag
if (!$document->is_downloadable) {
    abort(403);
}

// 4. Verify file exists
if (!Storage::exists($document->file_path)) {
    abort(404, 'File not found');
}
```

### 3. File Streaming
```php
return Storage::download(
    $document->file_path,
    $document->original_filename,
    ['Content-Type' => $document->mime_type]
);
```

## Security Features

### 1. Private Storage
- Files stored in `storage/app/private/` are **NOT** web-accessible
- No direct URL access possible (unlike `storage/app/public/`)
- All access must go through backend API with authentication

### 2. Access Control Layers
```
Request → Authentication → Permission Check → File Existence → Stream File
          (Sanctum)         (Hierarchical)      (Storage)       (Response)
```

### 3. Permission Check Implementation

#### Type Casting Bug Fix (Critical)
**Problem**: `accessible_institutions` stored as integers, but code used string comparison
```php
// ❌ BEFORE (BROKEN)
in_array((string)$user->institution_id, $document->accessible_institutions, true)
// Result: "5" === 5 → false (type mismatch)

// ✅ AFTER (FIXED)
in_array($user->institution_id, $document->accessible_institutions, false)
// Result: 5 == 5 → true (loose comparison)
```

**Fixed in 3 files**:
- `app/Models/Document.php:368`
- `app/Services/DocumentPermissionService.php:145,169`
- `app/Services/DocumentDownloadService.php:256`

### 4. Audit Logging
Every download is logged in `document_downloads` table:
```php
DocumentDownload::create([
    'document_id' => $document->id,
    'user_id' => $user->id,
    'downloaded_at' => now(),
    'ip_address' => request()->ip(),
]);
```

## Common Issues and Solutions

### Issue 1: "File not found" (404)
**Symptoms**: API returns 404 but database record exists

**Diagnosis**:
```bash
docker exec atis_backend php artisan tinker
$doc = Document::find(7);
Storage::exists($doc->file_path);  # Returns false
Storage::path($doc->file_path);    # Check full path
```

**Common Causes**:
1. File uploaded to wrong directory (test documents)
2. Storage disk misconfiguration
3. File was deleted but database record remains

**Solution**: Verify file exists in `storage/app/private/{file_path}`

### Issue 2: "Access denied" (403)
**Symptoms**: User cannot download document they should have access to

**Diagnosis**:
```bash
$user = User::find(354);
$doc = Document::find(7);
$permService = app(DocumentPermissionService::class);

# Check each permission layer
$doc->canAccess($user);                              # Document model check
$permService->canUserAccessDocument($user, $doc);    # Service layer check
$permService->canUserDownloadDocument($user, $doc);  # Download permission
```

**Common Causes**:
1. Type mismatch in `accessible_institutions` (string vs integer) - **FIXED**
2. User not in hierarchical path
3. Document has `is_downloadable = false`

**Solution**: Check `accessible_institutions` array and user's institution hierarchy

### Issue 3: Storage configuration not loaded
**Symptoms**: "Disk [documents] does not have a configured driver"

**Solution**:
```bash
docker exec atis_backend php artisan config:clear
docker exec atis_backend php artisan config:cache
```

## Testing Checklist

### Upload Test
```bash
# 1. Create test file
docker exec atis_backend sh -c "mkdir -p storage/app/private/documents/test && echo 'Test' > storage/app/private/documents/test/sample.txt"

# 2. Verify storage
Storage::exists('documents/test/sample.txt');  # Should return true

# 3. Test upload via API (use Postman/frontend)
```

### Download Test
```bash
# 1. Check document permissions
$user = User::where('email', 'regionadmin1@atis.az')->first();
$doc = Document::find(7);
$permService = app(DocumentPermissionService::class);

echo $permService->canUserDownloadDocument($user, $doc) ? 'CAN' : 'CANNOT';

# 2. Test download endpoint
curl -H "Authorization: Bearer {token}" \
     http://localhost:8000/api/documents/7/download
```

### Permission Matrix Test
| User Role      | Own Institution | Same Sector | Same Region | Different Region |
|----------------|----------------|-------------|-------------|------------------|
| SuperAdmin     | ✅             | ✅          | ✅          | ✅               |
| RegionAdmin    | ✅             | ✅          | ✅          | ❌               |
| SektorAdmin    | ✅             | ✅          | ❌          | ❌               |
| SchoolAdmin    | ✅             | ❌          | ❌          | ❌               |

## Migration Path (If Needed)

### Scenario: Moving to AWS S3

1. **Add S3 configuration** (already exists in `filesystems.php`)
2. **Update DocumentService**:
```php
// Change from 'local' to 's3'
$file->storeAs('documents/' . now()->format('Y/m'), $storedFilename, 's3');
```
3. **Migrate existing files**:
```bash
php artisan storage:migrate-to-s3
```
4. **Update download logic** (no changes needed - Storage facade handles it)

## Maintenance

### Storage Cleanup
```bash
# Find orphaned files (files without DB records)
php artisan documents:cleanup-orphaned

# Archive old documents
php artisan documents:archive --older-than=365
```

### Monitoring
```bash
# Check storage usage
docker exec atis_backend du -sh storage/app/private/documents/

# Find large files
docker exec atis_backend find storage/app/private/documents/ -size +10M -exec ls -lh {} \;
```

## Best Practices

1. ✅ **Always use `Storage::` facade** - Never direct file operations
2. ✅ **Verify after upload** - Always check `Storage::exists()` after storing
3. ✅ **Log all access** - Maintain audit trail for security
4. ✅ **Use proper MIME types** - Store and serve with correct Content-Type
5. ✅ **Hierarchical permissions** - Check both accessible_institutions AND user hierarchy
6. ✅ **Error logging** - Log file-not-found errors with full path for debugging
7. ✅ **Consistent disk usage** - Always use `'local'` or `'documents'` disk explicitly

## Related Files

### Backend
- `config/filesystems.php` - Storage configuration
- `app/Services/DocumentService.php` - Upload logic
- `app/Services/DocumentDownloadService.php` - Download logic
- `app/Services/DocumentPermissionService.php` - Access control
- `app/Models/Document.php` - Document model with permission methods
- `app/Http/Controllers/DocumentControllerRefactored.php` - API endpoints

### Database
- `documents` table - Document metadata
- `document_downloads` table - Download audit log
- `document_access_logs` table - Access tracking

### Frontend
- `frontend/src/services/documents.ts` - API client
- `frontend/src/services/resources.ts` - Resource management
- `frontend/src/components/resources/InstitutionalResourcesTable.tsx` - UI

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: ATİS Development Team
