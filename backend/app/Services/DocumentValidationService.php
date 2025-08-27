<?php

namespace App\Services;

use App\Models\Document;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DocumentValidationService extends BaseService
{
    /**
     * Validate document store request
     */
    public function validateDocumentStore(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'file' => 'required|file|max:10240',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'category' => 'nullable|in:' . implode(',', array_keys(Document::CATEGORIES)),
            'access_level' => 'nullable|in:' . implode(',', array_keys(Document::ACCESS_LEVELS)),
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'allowed_users' => 'nullable|array',
            'allowed_users.*' => 'integer|exists:users,id',
            'allowed_roles' => 'nullable|array',
            'allowed_institutions' => 'nullable|array',
            'allowed_institutions.*' => 'integer|exists:institutions,id',
            'accessible_institutions' => 'nullable|array',
            'accessible_institutions.*' => 'integer|exists:institutions,id',
            'accessible_departments' => 'nullable|array',
            'accessible_departments.*' => 'integer|exists:departments,id',
            'is_public' => 'boolean',
            'is_downloadable' => 'boolean',
            'is_viewable_online' => 'boolean',
            'expires_at' => 'nullable|date|after:now',
        ], $this->getCustomMessages());
    }

    /**
     * Validate document update request
     */
    public function validateDocumentUpdate(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'category' => 'sometimes|required|in:' . implode(',', array_keys(Document::CATEGORIES)),
            'access_level' => 'sometimes|required|in:' . implode(',', array_keys(Document::ACCESS_LEVELS)),
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'allowed_users' => 'nullable|array',
            'allowed_users.*' => 'integer|exists:users,id',
            'allowed_roles' => 'nullable|array',
            'allowed_institutions' => 'nullable|array',
            'allowed_institutions.*' => 'integer|exists:institutions,id',
            'accessible_institutions' => 'nullable|array',
            'accessible_institutions.*' => 'integer|exists:institutions,id',
            'accessible_departments' => 'nullable|array',
            'accessible_departments.*' => 'integer|exists:departments,id',
            'is_public' => 'boolean',
            'is_downloadable' => 'boolean',
            'is_viewable_online' => 'boolean',
            'expires_at' => 'nullable|date|after:now',
        ], $this->getCustomMessages());
    }

    /**
     * Validate document sharing request
     */
    public function validateDocumentShare(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'integer|exists:users,id',
            'role_names' => 'nullable|array',
            'institution_ids' => 'nullable|array',
            'institution_ids.*' => 'integer|exists:institutions,id',
            'share_type' => 'required|in:view,edit',
            'message' => 'nullable|string|max:500',
            'expires_at' => 'nullable|date|after:now',
            'allow_download' => 'boolean',
            'allow_reshare' => 'boolean',
        ], $this->getShareCustomMessages());
    }

    /**
     * Validate public link creation request
     */
    public function validatePublicLink(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'expires_at' => 'nullable|date|after:now',
            'allow_download' => 'boolean',
            'max_downloads' => 'nullable|integer|min:1',
            'password' => 'nullable|string|min:4|max:20',
        ], [
            'expires_at.after' => 'Son tariх hazırkı vaxtdan sonra olmalıdır.',
            'max_downloads.min' => 'Maksimum yükləmə sayı ən azı 1 olmalıdır.',
            'password.min' => 'Şifrə ən azı 4 simvol olmalıdır.',
            'password.max' => 'Şifrə ən çox 20 simvol ola bilər.'
        ]);
    }

    /**
     * Validate bulk download request
     */
    public function validateBulkDownload(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'document_ids' => 'required|array|min:1|max:50',
            'document_ids.*' => 'integer|exists:documents,id'
        ], [
            'document_ids.required' => 'Sənəd ID-ləri tələb olunur.',
            'document_ids.array' => 'Sənəd ID-ləri massiv formatında olmalıdır.',
            'document_ids.min' => 'Ən azı 1 sənəd seçilməlidir.',
            'document_ids.max' => 'Maksimum 50 sənəd seçilə bilər.',
            'document_ids.*.exists' => 'Seçilən sənəd mövcud deyil.'
        ]);
    }

    /**
     * Validate file upload with role-based restrictions
     */
    public function validateFileUpload($file, $userRole): array
    {
        $errors = [];

        if (!$file) {
            $errors[] = 'Fayl tələb olunur.';
            return $errors;
        }

        // Get role-based limits
        $maxSize = $this->getMaxFileSizeForRole($userRole);
        $allowedTypes = $this->getAllowedFileTypesForRole($userRole);
        $allowedMimeTypes = $this->getAllowedMimeTypesForRole($userRole);

        // Check file size
        if ($file->getSize() > $maxSize) {
            $maxSizeMB = round($maxSize / (1024 * 1024), 2);
            $errors[] = "Fayl ölçüsü {$maxSizeMB}MB-dan böyük ola bilməz.";
        }

        // Check file extension
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, $allowedTypes)) {
            $errors[] = 'Fayl növü dəstəklənmir. İcazə verilən növlər: ' . implode(', ', $allowedTypes);
        }

        // Check MIME type
        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, $allowedMimeTypes)) {
            $errors[] = 'Fayl MIME tipi dəstəklənmir.';
        }

        // Check filename
        $filename = $file->getClientOriginalName();
        if (strlen($filename) > 255) {
            $errors[] = 'Fayl adı 255 simvoldan çox ola bilməz.';
        }

        // Check for malicious filenames
        if ($this->isMaliciousFilename($filename)) {
            $errors[] = 'Fayl adı təhlükəli simvollar ehtiva edir.';
        }

        return $errors;
    }

    /**
     * Validate document search filters
     */
    public function validateSearchFilters(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'search' => 'nullable|string|max:100',
            'category' => 'nullable|in:' . implode(',', array_keys(Document::CATEGORIES)),
            'access_level' => 'nullable|in:' . implode(',', array_keys(Document::ACCESS_LEVELS)),
            'uploader_id' => 'nullable|integer|exists:users,id',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'is_public' => 'nullable|boolean',
            'is_downloadable' => 'nullable|boolean',
            'sort_by' => 'nullable|in:title,created_at,updated_at,file_size,download_count',
            'sort_direction' => 'nullable|in:asc,desc',
            'per_page' => 'nullable|integer|min:5|max:100'
        ], [
            'search.max' => 'Axtarış sorğusu 100 simvoldan çox ola bilməz.',
            'date_to.after_or_equal' => 'Bitiş tarixi başlanğıc tarixindən əvvəl ola bilməz.',
            'per_page.min' => 'Səhifə başına minimum 5 element olmalıdır.',
            'per_page.max' => 'Səhifə başına maksimum 100 element ola bilər.'
        ]);
    }

    /**
     * Validate activity tracking filters
     */
    public function validateActivityFilters(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'action' => 'nullable|in:upload,view,download,share,delete',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'institution_id' => 'nullable|integer|exists:institutions,id',
            'user_id' => 'nullable|integer|exists:users,id',
            'document_id' => 'nullable|integer|exists:documents,id',
            'per_page' => 'nullable|integer|min:5|max:100'
        ], [
            'date_to.after_or_equal' => 'Bitiş tarixi başlanğıc tarixindən əvvəl ola bilməz.',
            'per_page.min' => 'Səhifə başına minimum 5 element olmalıdır.',
            'per_page.max' => 'Səhifə başına maksimum 100 element ola bilər.'
        ]);
    }

    /**
     * Get custom validation messages for documents
     */
    private function getCustomMessages(): array
    {
        return [
            'file.required' => 'Fayl tələb olunur.',
            'file.file' => 'Yüklənən element fayl olmalıdır.',
            'file.max' => 'Fayl ölçüsü maksimum 10MB ola bilər.',
            'title.required' => 'Başlıq tələb olunur.',
            'title.max' => 'Başlıq 255 simvoldan çox ola bilməz.',
            'description.max' => 'Təsvir 1000 simvoldan çox ola bilməz.',
            'tags.array' => 'Teqlər massiv formatında olmalıdır.',
            'tags.*.max' => 'Hər teq 50 simvoldan çox ola bilməz.',
            'allowed_users.array' => 'İcazə verilən istifadəçilər massiv formatında olmalıdır.',
            'allowed_users.*.exists' => 'Seçilən istifadəçi mövcud deyil.',
            'allowed_institutions.array' => 'İcazə verilən təşkilatlar massiv formatında olmalıdır.',
            'allowed_institutions.*.exists' => 'Seçilən təşkilat mövcud deyil.',
            'expires_at.after' => 'Son tarix hazırkı vaxtdan sonra olmalıdır.'
        ];
    }

    /**
     * Get custom validation messages for sharing
     */
    private function getShareCustomMessages(): array
    {
        return [
            'share_type.required' => 'Paylaşım tipi tələb olunur.',
            'share_type.in' => 'Paylaşım tipi yalnız "view" və ya "edit" ola bilər.',
            'user_ids.array' => 'İstifadəçi ID-ləri massiv formatında olmalıdır.',
            'user_ids.*.exists' => 'Seçilən istifadəçi mövcud deyil.',
            'institution_ids.array' => 'Təşkilat ID-ləri massiv formatında olmalıdır.',
            'institution_ids.*.exists' => 'Seçilən təşkilat mövcud deyil.',
            'message.max' => 'Mesaj 500 simvoldan çox ola bilməz.',
            'expires_at.after' => 'Son tarix hazırkı vaxtdan sonra olmalıdır.'
        ];
    }

    /**
     * Get maximum file size for user role
     */
    private function getMaxFileSizeForRole(string $role): int
    {
        $sizeLimits = [
            'superadmin' => 500 * 1024 * 1024, // 500MB
            'regionadmin' => 200 * 1024 * 1024, // 200MB
            'sektoradmin' => 150 * 1024 * 1024, // 150MB
            'schooladmin' => 100 * 1024 * 1024, // 100MB
            'teacher' => 50 * 1024 * 1024,      // 50MB
            'müəllim' => 50 * 1024 * 1024,      // 50MB
        ];

        return $sizeLimits[$role] ?? (50 * 1024 * 1024); // Default 50MB
    }

    /**
     * Get allowed file types for user role
     */
    private function getAllowedFileTypesForRole(string $role): array
    {
        $basicTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
        $imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
        $archiveTypes = ['zip', 'rar', '7z'];
        $videoTypes = ['mp4', 'avi', 'mov', 'wmv'];

        switch ($role) {
            case 'superadmin':
                return array_merge($basicTypes, $imageTypes, $archiveTypes, $videoTypes);
                
            case 'regionadmin':
            case 'sektoradmin':
                return array_merge($basicTypes, $imageTypes, $archiveTypes);
                
            case 'schooladmin':
            case 'məktəbadmin':
                return array_merge($basicTypes, $imageTypes);
                
            default:
                return $basicTypes;
        }
    }

    /**
     * Get allowed MIME types for user role
     */
    private function getAllowedMimeTypesForRole(string $role): array
    {
        $basicMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
        ];

        $imageMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/bmp'
        ];

        $archiveMimes = [
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed'
        ];

        $videoMimes = [
            'video/mp4',
            'video/avi',
            'video/quicktime',
            'video/x-ms-wmv'
        ];

        switch ($role) {
            case 'superadmin':
                return array_merge($basicMimes, $imageMimes, $archiveMimes, $videoMimes);
                
            case 'regionadmin':
            case 'sektoradmin':
                return array_merge($basicMimes, $imageMimes, $archiveMimes);
                
            case 'schooladmin':
            case 'məktəbadmin':
                return array_merge($basicMimes, $imageMimes);
                
            default:
                return $basicMimes;
        }
    }

    /**
     * Check if filename contains malicious patterns
     */
    private function isMaliciousFilename(string $filename): bool
    {
        // Check for dangerous patterns
        $dangerousPatterns = [
            '/\.\./i',          // Directory traversal
            '/[<>:"|?*]/i',     // Windows forbidden characters
            '/\x00/',           // Null bytes
            '/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i', // Windows reserved names
        ];

        foreach ($dangerousPatterns as $pattern) {
            if (preg_match($pattern, $filename)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validate and sanitize document metadata
     */
    public function sanitizeDocumentData(array $data): array
    {
        $sanitized = [];

        // Sanitize title
        if (isset($data['title'])) {
            $sanitized['title'] = strip_tags(trim($data['title']));
        }

        // Sanitize description
        if (isset($data['description'])) {
            $sanitized['description'] = strip_tags(trim($data['description']));
        }

        // Sanitize tags
        if (isset($data['tags']) && is_array($data['tags'])) {
            $sanitized['tags'] = array_map(function($tag) {
                return strip_tags(trim($tag));
            }, $data['tags']);
            $sanitized['tags'] = array_filter($sanitized['tags']); // Remove empty tags
        }

        // Copy other safe fields
        $safeFields = [
            'category', 'access_level', 'is_public', 'is_downloadable', 
            'is_viewable_online', 'expires_at', 'allowed_users', 
            'allowed_institutions', 'accessible_institutions',
            'accessible_departments'
        ];

        foreach ($safeFields as $field) {
            if (isset($data[$field])) {
                $sanitized[$field] = $data[$field];
            }
        }

        return $sanitized;
    }
}