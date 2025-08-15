<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\User;
use App\Models\Department;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SurveyTargetingService
{
    /**
     * Get target selection options for survey creation
     */
    public function getTargetingOptions(User $user): array
    {
        $institutions = $this->getAccessibleInstitutions($user);
        $departments = $this->getAccessibleDepartments($user);
        $userTypes = $this->getAvailableUserTypes();

        return [
            'institutions' => $institutions,
            'departments' => $departments,
            'user_types' => $userTypes,
            'targeting_presets' => $this->getTargetingPresets($user)
        ];
    }

    /**
     * Get institutions accessible by user based on their role and hierarchy
     */
    public function getAccessibleInstitutions(User $user): Collection
    {
        $userRoles = $user->roles->pluck('name')->toArray();
        $userInstitution = $user->institution;

        // Superadmin can target all institutions
        if (in_array('superadmin', $userRoles)) {
            return Institution::active()
                ->select('id', 'name', 'level', 'type', 'parent_id', 'code')
                ->orderBy('level')
                ->orderBy('name')
                ->get();
        }

        // Regional admin can target their region and below
        if (in_array('regionadmin', $userRoles) && $userInstitution) {
            return Institution::active()
                ->where(function ($query) use ($userInstitution) {
                    $query->where('id', $userInstitution->id)
                          ->orWhere('parent_id', $userInstitution->id)
                          ->orWhereIn('parent_id', function ($subQuery) use ($userInstitution) {
                              $subQuery->select('id')
                                       ->from('institutions')
                                       ->where('parent_id', $userInstitution->id);
                          });
                })
                ->select('id', 'name', 'level', 'type', 'parent_id', 'code')
                ->orderBy('level')
                ->orderBy('name')
                ->get();
        }

        // School admin can only target their own institution
        if (in_array('schooladmin', $userRoles) && $userInstitution) {
            return Institution::active()
                ->where('id', $userInstitution->id)
                ->select('id', 'name', 'level', 'type', 'parent_id', 'code')
                ->get();
        }

        return collect();
    }

    /**
     * Get departments accessible by user
     */
    public function getAccessibleDepartments(User $user): Collection
    {
        $accessibleInstitutions = $this->getAccessibleInstitutions($user);
        $institutionIds = $accessibleInstitutions->pluck('id')->toArray();

        if (empty($institutionIds)) {
            return collect();
        }

        return Department::whereIn('institution_id', $institutionIds)
            ->where('is_active', true)
            ->select('id', 'name', 'code', 'institution_id', 'type')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get available user types/roles for targeting
     */
    public function getAvailableUserTypes(): array
    {
        return [
            'müəllim' => 'Müəllimlər',
            'müdir' => 'Müdirlər', 
            'müdir_müavini' => 'Müdir müavinləri',
            'şöbə_müdiri' => 'Şöbə müdirləri',
            'mütəxəssis' => 'Mütəxəssislər',
            'inzibati_işçi' => 'İnzibati işçilər',
            'texniki_işçi' => 'Texniki işçilər'
        ];
    }

    /**
     * Get predefined targeting presets
     */
    public function getTargetingPresets(User $user): array
    {
        $userRoles = $user->roles->pluck('name')->toArray();
        
        $presets = [];

        // Common presets for all users
        $presets['all_teachers'] = [
            'name' => 'Bütün Müəllimlər',
            'description' => 'Sistem daxilindəki bütün müəllimlər',
            'user_types' => ['müəllim'],
            'institutions' => 'accessible',
            'departments' => []
        ];

        $presets['all_admins'] = [
            'name' => 'Bütün Müdirlər',
            'description' => 'Bütün məktəb müdirləri və müavinləri',
            'user_types' => ['müdir', 'müdir_müavini'],
            'institutions' => 'accessible',
            'departments' => []
        ];

        // Regional specific presets
        if (in_array('regionadmin', $userRoles) || in_array('superadmin', $userRoles)) {
            $presets['regional_schools'] = [
                'name' => 'Regional Məktəblər',
                'description' => 'Regiondakı bütün məktəblər',
                'institution_levels' => [4], // Level 4 = Schools
                'user_types' => ['müdir', 'müdir_müavini', 'müəllim'],
                'institutions' => 'accessible',
                'departments' => []
            ];

            $presets['sector_heads'] = [
                'name' => 'Sektor Rəhbərləri',
                'description' => 'Sektor səviyyəsindəki rəhbərlər',
                'institution_levels' => [3], // Level 3 = Sectors
                'user_types' => ['müdir', 'şöbə_müdiri'],
                'institutions' => 'accessible',
                'departments' => []
            ];
        }

        // Superadmin specific presets
        if (in_array('superadmin', $userRoles)) {
            $presets['all_institutions'] = [
                'name' => 'Bütün Təşkilatlar',
                'description' => 'Sistem daxilindəki bütün təşkilatlar',
                'institutions' => 'all',
                'user_types' => [],
                'departments' => []
            ];

            $presets['ministry_level'] = [
                'name' => 'Nazirlik Səviyyəsi',
                'description' => 'Nazirlik və regional idarələr',
                'institution_levels' => [1, 2], // Ministry + Regional
                'user_types' => ['müdir', 'şöbə_müdiri', 'mütəxəssis'],
                'institutions' => 'all',
                'departments' => []
            ];
        }

        return $presets;
    }

    /**
     * Estimate recipients based on targeting criteria
     */
    public function estimateRecipients(array $criteria, User $user): array
    {
        $targetInstitutions = $criteria['target_institutions'] ?? [];
        $targetDepartments = $criteria['target_departments'] ?? [];
        $targetUserTypes = $criteria['target_user_types'] ?? [];
        $institutionLevels = $criteria['institution_levels'] ?? [];

        // Validate access
        $accessibleInstitutions = $this->getAccessibleInstitutions($user)->pluck('id')->toArray();
        $targetInstitutions = array_intersect($targetInstitutions, $accessibleInstitutions);

        // Build base query
        $query = User::where('is_active', true);

        // Filter by institutions
        if (!empty($targetInstitutions)) {
            $query->whereIn('institution_id', $targetInstitutions);
        } elseif (!empty($institutionLevels)) {
            $institutionsInLevels = Institution::whereIn('level', $institutionLevels)
                ->whereIn('id', $accessibleInstitutions)
                ->pluck('id')
                ->toArray();
            $query->whereIn('institution_id', $institutionsInLevels);
        } else {
            $query->whereIn('institution_id', $accessibleInstitutions);
        }

        // Filter by departments
        if (!empty($targetDepartments)) {
            $query->whereHas('departments', function ($q) use ($targetDepartments) {
                $q->whereIn('departments.id', $targetDepartments);
            });
        }

        // Filter by user types/roles
        if (!empty($targetUserTypes)) {
            $query->whereHas('roles', function ($q) use ($targetUserTypes) {
                $q->whereIn('name', $targetUserTypes);
            });
        }

        $totalUsers = $query->count();

        // Get breakdown by institution
        $institutionBreakdown = [];
        $finalInstitutions = $targetInstitutions ?: 
            Institution::whereIn('level', $institutionLevels ?: [1,2,3,4])
                      ->whereIn('id', $accessibleInstitutions)
                      ->pluck('id')
                      ->toArray();

        foreach ($finalInstitutions as $institutionId) {
            $institution = Institution::find($institutionId);
            if (!$institution) continue;

            $institutionQuery = User::where('institution_id', $institutionId)
                ->where('is_active', true);

            if (!empty($targetDepartments)) {
                $institutionQuery->whereHas('departments', function ($q) use ($targetDepartments) {
                    $q->whereIn('departments.id', $targetDepartments);
                });
            }

            if (!empty($targetUserTypes)) {
                $institutionQuery->whereHas('roles', function ($q) use ($targetUserTypes) {
                    $q->whereIn('name', $targetUserTypes);
                });
            }

            $userCount = $institutionQuery->count();
            
            if ($userCount > 0) {
                $institutionBreakdown[] = [
                    'institution_id' => $institutionId,
                    'institution_name' => $institution->name,
                    'institution_level' => $institution->level,
                    'institution_type' => $institution->type,
                    'estimated_users' => $userCount
                ];
            }
        }

        // Get breakdown by role
        $roleBreakdown = [];
        if (!empty($targetUserTypes)) {
            foreach ($targetUserTypes as $roleKey) {
                $roleUserQuery = User::where('is_active', true)
                    ->whereIn('institution_id', $accessibleInstitutions)
                    ->whereHas('roles', function ($q) use ($roleKey) {
                        $q->where('name', $roleKey);
                    });

                if (!empty($targetInstitutions)) {
                    $roleUserQuery->whereIn('institution_id', $targetInstitutions);
                }

                if (!empty($targetDepartments)) {
                    $roleUserQuery->whereHas('departments', function ($q) use ($targetDepartments) {
                        $q->whereIn('departments.id', $targetDepartments);
                    });
                }

                $count = $roleUserQuery->count();
                
                if ($count > 0) {
                    $userTypes = $this->getAvailableUserTypes();
                    $roleBreakdown[] = [
                        'role_key' => $roleKey,
                        'role_name' => $userTypes[$roleKey] ?? $roleKey,
                        'estimated_users' => $count
                    ];
                }
            }
        }

        return [
            'total_users' => $totalUsers,
            'breakdown' => [
                'by_institution' => $institutionBreakdown,
                'by_role' => $roleBreakdown,
                'summary' => [
                    'institutions' => count($institutionBreakdown),
                    'departments' => count($targetDepartments),
                    'user_types' => count($targetUserTypes)
                ]
            ],
            'criteria' => [
                'institutions' => count($targetInstitutions),
                'departments' => count($targetDepartments), 
                'user_types' => count($targetUserTypes),
                'institution_levels' => $institutionLevels
            ]
        ];
    }

    /**
     * Apply targeting preset
     */
    public function applyPreset(string $presetKey, User $user): array
    {
        $presets = $this->getTargetingPresets($user);
        
        if (!isset($presets[$presetKey])) {
            throw new \InvalidArgumentException("Preset '{$presetKey}' not found");
        }

        $preset = $presets[$presetKey];
        $accessibleInstitutions = $this->getAccessibleInstitutions($user);

        $result = [
            'target_institutions' => [],
            'target_departments' => $preset['departments'] ?? [],
            'target_user_types' => $preset['user_types'] ?? [],
            'institution_levels' => $preset['institution_levels'] ?? []
        ];

        // Handle institution selection
        if (isset($preset['institutions'])) {
            if ($preset['institutions'] === 'all') {
                $result['target_institutions'] = $accessibleInstitutions->pluck('id')->toArray();
            } elseif ($preset['institutions'] === 'accessible') {
                if (isset($preset['institution_levels'])) {
                    $result['target_institutions'] = $accessibleInstitutions
                        ->whereIn('level', $preset['institution_levels'])
                        ->pluck('id')
                        ->toArray();
                } else {
                    $result['target_institutions'] = $accessibleInstitutions->pluck('id')->toArray();
                }
            }
        }

        return $result;
    }

    /**
     * Validate targeting criteria
     */
    public function validateTargeting(array $criteria, User $user): array
    {
        $errors = [];
        $warnings = [];

        // Check institution access
        if (!empty($criteria['target_institutions'])) {
            $accessibleIds = $this->getAccessibleInstitutions($user)->pluck('id')->toArray();
            $inaccessibleInstitutions = array_diff($criteria['target_institutions'], $accessibleIds);
            
            if (!empty($inaccessibleInstitutions)) {
                $errors[] = 'You do not have access to some selected institutions';
            }
        }

        // Check department access
        if (!empty($criteria['target_departments'])) {
            $accessibleDeptIds = $this->getAccessibleDepartments($user)->pluck('id')->toArray();
            $inaccessibleDepartments = array_diff($criteria['target_departments'], $accessibleDeptIds);
            
            if (!empty($inaccessibleDepartments)) {
                $errors[] = 'You do not have access to some selected departments';
            }
        }

        // Estimate recipients
        $estimation = $this->estimateRecipients($criteria, $user);
        
        if ($estimation['total_users'] === 0) {
            $warnings[] = 'No users match the selected targeting criteria';
        } elseif ($estimation['total_users'] > 1000) {
            $warnings[] = "Large recipient count ({$estimation['total_users']} users). Consider more specific targeting.";
        }

        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
            'estimation' => $estimation
        ];
    }

    /**
     * Get hierarchy tree for institution selection UI
     */
    public function getInstitutionHierarchy(User $user): array
    {
        $institutions = $this->getAccessibleInstitutions($user);
        
        // Build hierarchy tree
        $tree = [];
        $institutionMap = [];

        // First pass: create map
        foreach ($institutions as $institution) {
            $institutionMap[$institution->id] = [
                'id' => $institution->id,
                'name' => $institution->name,
                'code' => $institution->code,
                'type' => $institution->type,
                'level' => $institution->level,
                'parent_id' => $institution->parent_id,
                'children' => []
            ];
        }

        // Second pass: build tree
        foreach ($institutionMap as $id => $institution) {
            if ($institution['parent_id'] && isset($institutionMap[$institution['parent_id']])) {
                $institutionMap[$institution['parent_id']]['children'][] = &$institutionMap[$id];
            } else {
                $tree[] = &$institutionMap[$id];
            }
        }

        return $tree;
    }
}