<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Role;
use Illuminate\Support\Collection;

class InstitutionAssignmentService
{
    /**
     * Get institutions available for assignment based on role
     */
    public function getAvailableInstitutions(string $roleName): Collection
    {
        $roleInstitutionMap = [
            'superadmin' => [1, 2, 3, 4], // All levels
            'regionadmin' => [2], // Regional departments only
            'sektoradmin' => [3], // Sector offices only
            'schooladmin' => [4], // Schools only
            'müəllim' => [4], // Teachers work at schools
            'şagird' => [4], // Students attend schools
        ];

        $allowedLevels = $roleInstitutionMap[$roleName] ?? [4];

        return Institution::whereIn('level', $allowedLevels)
            ->where('is_active', true)
            ->orderBy('level')
            ->orderBy('name')
            ->get(['id', 'name', 'short_name', 'type', 'level']);
    }

    /**
     * Get institution display format for templates
     */
    public function getInstitutionDisplayFormat(int $institutionId): string
    {
        $institution = Institution::find($institutionId);

        if (! $institution) {
            return (string) $institutionId;
        }

        return "{$institutionId} ({$institution->name})";
    }

    /**
     * Parse institution ID from template format
     * Supports both "32" and "32 (6 nömrəli tam orta məktəb)" formats
     */
    public function parseInstitutionId(string $institutionValue): ?int
    {
        // Clean the value and extract just the ID
        $trimmed = trim($institutionValue);

        // If it contains parentheses, extract the ID before the parentheses
        if (strpos($trimmed, '(') !== false) {
            $parts = explode('(', $trimmed);
            $idPart = trim($parts[0]);
        } else {
            $idPart = $trimmed;
        }

        // Return the numeric ID or null if invalid
        return is_numeric($idPart) ? (int) $idPart : null;
    }

    /**
     * Validate role-institution assignment
     */
    public function validateAssignment(string $roleName, int $institutionId): bool
    {
        $institution = Institution::find($institutionId);

        if (! $institution) {
            return false;
        }

        $roleInstitutionMap = [
            'superadmin' => [1, 2, 3, 4],
            'regionadmin' => [2],
            'sektoradmin' => [3],
            'schooladmin' => [4],
            'müəllim' => [4],
            'şagird' => [4],
        ];

        $allowedLevels = $roleInstitutionMap[$roleName] ?? [4];

        return in_array($institution->level, $allowedLevels);
    }

    /**
     * Get role-specific institution examples for templates
     */
    public function getRoleExamples(string $roleName): array
    {
        $examples = [
            'superadmin' => [
                ['id' => 23, 'format' => '23 (MÜTDA)'],
                ['id' => 24, 'format' => '24 (Şəki-Zaqatala Regional Təhsil İdarəsi)'],
            ],
            'regionadmin' => [
                ['id' => 24, 'format' => '24 (Şəki-Zaqatala Regional Təhsil İdarəsi)'],
                ['id' => 25, 'format' => '25 (Lənkəran-Astara Regional Təhsil idarəsi)'],
            ],
            'sektoradmin' => [
                ['id' => 26, 'format' => '26 (Balakən)'],
                ['id' => 27, 'format' => '27 (Zaqatala)'],
            ],
            'schooladmin' => [
                ['id' => 32, 'format' => '32 (6 nömrəli tam orta məktəb)'],
                ['id' => 33, 'format' => '33 (6 nömrəli tam orta məktəb)'],
            ],
            'müəllim' => [
                ['id' => 32, 'format' => '32 (6 nömrəli tam orta məktəb)'],
                ['id' => 34, 'format' => '34 (7 nömrəli tam orta məktəb)'],
            ],
            'şagird' => [
                ['id' => 32, 'format' => '32 (6 nömrəli tam orta məktəb)'],
                ['id' => 35, 'format' => '35 (8 nömrəli tam orta məktəb)'],
            ],
        ];

        return $examples[$roleName] ?? $examples['şagird'];
    }

    /**
     * Get institution hierarchy path
     */
    public function getInstitutionHierarchy(int $institutionId): string
    {
        $institution = Institution::with(['parent' => function ($query) {
            $query->with(['parent' => function ($query) {
                $query->with('parent');
            }]);
        }])->find($institutionId);

        if (! $institution) {
            return '';
        }

        $path = [];
        $current = $institution;

        while ($current) {
            $path[] = $current->name;
            $current = $current->parent;
        }

        return implode(' > ', array_reverse($path));
    }

    /**
     * Get available institutions for bulk import by role
     */
    public function getInstitutionsForBulkImport(string $roleName): array
    {
        $institutions = $this->getAvailableInstitutions($roleName);

        return $institutions->map(function ($institution) {
            return [
                'id' => $institution->id,
                'name' => $institution->name,
                'display_format' => $this->getInstitutionDisplayFormat($institution->id),
                'level' => $institution->level,
                'type' => $institution->type,
                'hierarchy' => $this->getInstitutionHierarchy($institution->id),
            ];
        })->toArray();
    }

    /**
     * Generate institution options list for frontend
     */
    public function getInstitutionOptions(string $roleName): array
    {
        $institutions = $this->getAvailableInstitutions($roleName);

        return $institutions->map(function ($institution) {
            return [
                'value' => $institution->id,
                'label' => $institution->name,
                'display_format' => $this->getInstitutionDisplayFormat($institution->id),
                'level' => $institution->level,
                'type' => $institution->type,
            ];
        })->toArray();
    }
}
