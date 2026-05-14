<?php

namespace App\Services;

use App\Models\InstitutionImportHistory;
use App\Models\InstitutionType;
use App\Models\User;

class InstitutionImportPermissionService
{
    /**
     * Role-based import limits and restrictions
     */
    private const IMPORT_LIMITS = [
        'superadmin' => [
            'max_file_size_mb' => 50,
            'max_rows_per_import' => 10000,
            'max_daily_imports' => 100,
            'allowed_institution_types' => 'all',
            'can_skip_duplicate_detection' => true,
            'can_auto_resolve_duplicates' => true,
            'can_bulk_import' => true,
        ],
        'regionadmin' => [
            'max_file_size_mb' => 20,
            'max_rows_per_import' => 5000,
            'max_daily_imports' => 50,
            'allowed_institution_types' => ['secondary_school', 'primary_school', 'lyceum', 'gymnasium', 'kindergarten'],
            'can_skip_duplicate_detection' => false,
            'can_auto_resolve_duplicates' => true,
            'can_bulk_import' => true,
            'regional_restrictions' => true, // Can only import within their region
        ],
        'sektoradmin' => [
            'max_file_size_mb' => 10,
            'max_rows_per_import' => 1000,
            'max_daily_imports' => 20,
            'allowed_institution_types' => ['secondary_school', 'primary_school'],
            'can_skip_duplicate_detection' => false,
            'can_auto_resolve_duplicates' => false,
            'can_bulk_import' => true,
            'sector_restrictions' => true, // Can only import within their sector
        ],
        'schooladmin' => [
            'max_file_size_mb' => 5,
            'max_rows_per_import' => 100,
            'max_daily_imports' => 5,
            'allowed_institution_types' => [], // No import permissions
            'can_skip_duplicate_detection' => false,
            'can_auto_resolve_duplicates' => false,
            'can_bulk_import' => false,
        ],
        'teacher' => [
            'max_file_size_mb' => 0,
            'max_rows_per_import' => 0,
            'max_daily_imports' => 0,
            'allowed_institution_types' => [],
            'can_skip_duplicate_detection' => false,
            'can_auto_resolve_duplicates' => false,
            'can_bulk_import' => false,
        ],
    ];

    /**
     * Check if user can perform import
     */
    public function canImport(User $user): array
    {
        $role = $user->roles()->first()?->name ?? 'teacher';
        $limits = self::IMPORT_LIMITS[$role] ?? self::IMPORT_LIMITS['teacher'];

        if ($limits['max_rows_per_import'] === 0) {
            return [
                'allowed' => false,
                'reason' => 'Bu rola idxal icazəsi verilməyib',
            ];
        }

        // Check daily import limits
        $todayImports = InstitutionImportHistory::byUser($user->id)
            ->whereDate('created_at', today())
            ->count();

        if ($todayImports >= $limits['max_daily_imports']) {
            return [
                'allowed' => false,
                'reason' => "Günlük idxal limitiniz bitmişdir ({$limits['max_daily_imports']} idxal)",
            ];
        }

        return [
            'allowed' => true,
            'limits' => $limits,
            'daily_usage' => $todayImports,
        ];
    }

    /**
     * Check if user can import specific institution type
     */
    public function canImportInstitutionType(User $user, InstitutionType $institutionType): array
    {
        $role = $user->roles()->first()?->name ?? 'teacher';
        $limits = self::IMPORT_LIMITS[$role] ?? self::IMPORT_LIMITS['teacher'];

        // Check if institution type is allowed
        if ($limits['allowed_institution_types'] !== 'all' &&
            ! in_array($institutionType->key, $limits['allowed_institution_types'])) {
            return [
                'allowed' => false,
                'reason' => "Bu müəssisə növü üçün idxal icazəniz yoxdur: {$institutionType->label_az}",
            ];
        }

        // Check regional restrictions
        if (isset($limits['regional_restrictions']) && $limits['regional_restrictions']) {
            if (! $this->isInUserRegion($user, $institutionType)) {
                return [
                    'allowed' => false,
                    'reason' => 'Yalnız öz regionunuzda müəssisələr idxal edə bilərsiniz',
                ];
            }
        }

        // Check sector restrictions
        if (isset($limits['sector_restrictions']) && $limits['sector_restrictions']) {
            if (! $this->isInUserSector($user, $institutionType)) {
                return [
                    'allowed' => false,
                    'reason' => 'Yalnız öz sektorunuzda müəssisələr idxal edə bilərsiniz',
                ];
            }
        }

        return ['allowed' => true];
    }

    /**
     * Check file size restrictions
     */
    public function validateFileSize(User $user, int $fileSizeBytes): array
    {
        $role = $user->roles()->first()?->name ?? 'teacher';
        $limits = self::IMPORT_LIMITS[$role] ?? self::IMPORT_LIMITS['teacher'];

        $maxSizeBytes = $limits['max_file_size_mb'] * 1024 * 1024;

        if ($fileSizeBytes > $maxSizeBytes) {
            return [
                'valid' => false,
                'reason' => "Fayl ölçüsü çox böyükdür. Maksimum: {$limits['max_file_size_mb']}MB",
            ];
        }

        return ['valid' => true];
    }

    /**
     * Check row count restrictions
     */
    public function validateRowCount(User $user, int $rowCount): array
    {
        $role = $user->roles()->first()?->name ?? 'teacher';
        $limits = self::IMPORT_LIMITS[$role] ?? self::IMPORT_LIMITS['teacher'];

        if ($rowCount > $limits['max_rows_per_import']) {
            return [
                'valid' => false,
                'reason' => "Çox sayda sətir var. Maksimum: {$limits['max_rows_per_import']} sətir",
            ];
        }

        return ['valid' => true];
    }

    /**
     * Get user import permissions summary
     */
    public function getUserPermissions(User $user): array
    {
        $role = $user->roles()->first()?->name ?? 'teacher';
        $limits = self::IMPORT_LIMITS[$role] ?? self::IMPORT_LIMITS['teacher'];

        // Get daily usage
        $todayImports = InstitutionImportHistory::byUser($user->id)
            ->whereDate('created_at', today())
            ->count();

        $thisMonthImports = InstitutionImportHistory::byUser($user->id)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        return [
            'role' => $role,
            'limits' => $limits,
            'usage' => [
                'today' => $todayImports,
                'this_month' => $thisMonthImports,
                'remaining_today' => max(0, $limits['max_daily_imports'] - $todayImports),
            ],
            'permissions' => [
                'can_import' => $limits['max_rows_per_import'] > 0,
                'can_skip_duplicate_detection' => $limits['can_skip_duplicate_detection'] ?? false,
                'can_auto_resolve_duplicates' => $limits['can_auto_resolve_duplicates'] ?? false,
                'can_bulk_import' => $limits['can_bulk_import'] ?? false,
            ],
        ];
    }

    /**
     * Check if institution type is in user's region
     */
    private function isInUserRegion(User $user, InstitutionType $institutionType): bool
    {
        // For RegionAdmin, check if they can manage institutions of this type in their region
        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return false;
        }

        // RegionAdmin should be at level 2, and can manage levels 3 and 4
        if ($userInstitution->level === 2) {
            return in_array($institutionType->default_level, [3, 4]);
        }

        return false;
    }

    /**
     * Check if institution type is in user's sector
     */
    private function isInUserSector(User $user, InstitutionType $institutionType): bool
    {
        // For SektorAdmin, check if they can manage institutions of this type in their sector
        $userInstitution = $user->institution;
        if (! $userInstitution) {
            return false;
        }

        // SektorAdmin should be at level 3, and can manage level 4
        if ($userInstitution->level === 3) {
            return $institutionType->default_level === 4;
        }

        return false;
    }

    /**
     * Generate import options based on user permissions
     */
    public function generateImportOptions(User $user): array
    {
        $role = $user->roles()->first()?->name ?? 'teacher';
        $limits = self::IMPORT_LIMITS[$role] ?? self::IMPORT_LIMITS['teacher'];

        return [
            'skip_duplicate_detection' => false, // Always detect duplicates unless superadmin explicitly skips
            'duplicate_handling' => [
                'high_severity' => $limits['can_auto_resolve_duplicates'] ? 'auto_resolve' : 'skip',
                'medium_severity' => 'warn',
                'name_conflict' => $limits['can_auto_resolve_duplicates'] ? 'auto_rename' : 'skip',
                'code_conflict' => $limits['can_auto_resolve_duplicates'] ? 'auto_generate' : 'skip',
            ],
            'validation_level' => $role === 'superadmin' ? 'lenient' : 'strict',
            'max_errors_before_abort' => $role === 'superadmin' ? 1000 : 100,
        ];
    }
}
