<?php

namespace App\Services\Analytics;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

/**
 * Service for hierarchical institution analytics
 * Handles region -> sector -> school hierarchy analysis
 */
class HierarchicalAnalyticsService
{
    /**
     * Get enhanced hierarchical institution analytics based on user role
     */
    public function getHierarchicalInstitutionAnalyticsEnhanced(Survey $survey): array
    {
        $user = Auth::user();
        $userRole = $user->getRoleNames()->first();
        $allowedInstitutionIds = \App\Helpers\DataIsolationHelper::getAllowedInstitutionIds($user);

        // Get all responses for this survey within allowed institutions
        $responses = $survey->responses()
            ->whereIn('institution_id', $allowedInstitutionIds)
            ->with(['respondent.institution'])
            ->get();

        $nodes = [];

        if ($userRole === 'superadmin') {
            // SuperAdmin sees all regions
            $nodes = $this->buildSuperAdminHierarchyEnhanced($survey, $responses);
        } elseif ($userRole === 'regionadmin') {
            // RegionAdmin sees sectors -> schools
            $nodes = $this->buildRegionHierarchyEnhanced($survey, $responses, $user);
        } elseif ($userRole === 'sektoradmin') {
            // SektorAdmin sees schools only
            $nodes = $this->buildSectorHierarchyEnhanced($survey, $responses, $user);
        } else {
            // SchoolAdmin or other roles - no hierarchy, just their institution
            $nodes = $this->buildFlatHierarchyEnhanced($survey, $responses, $user);
        }

        return [
            'survey_id' => $survey->id,
            'user_role' => $userRole,
            'hierarchy_type' => $this->getHierarchyType($userRole),
            'nodes' => $nodes,
        ];
    }

    /**
     * Build hierarchy for SuperAdmin (regions -> sectors -> schools)
     */
    protected function buildSuperAdminHierarchyEnhanced(Survey $survey, Collection $responses): array
    {
        $regions = Institution::where('level', 2)
            ->with(['children' => function ($q) {
                $q->where('level', 3)->with(['children' => function ($q2) {
                    $q2->where('level', 4);
                }]);
            }])
            ->get();

        return $regions->map(function ($region) use ($survey, $responses) {
            $sectorIds = $region->children->pluck('id');
            $allSchoolIds = $region->children->flatMap(fn ($s) => $s->children->pluck('id'));
            $regionResponses = $responses->whereIn('institution_id', $allSchoolIds);

            $children = $region->children->map(function ($sector) use ($survey, $responses) {
                return $this->buildSectorNodeEnhanced($sector, $survey, $responses);
            })->values()->toArray();

            return [
                'id' => $region->id,
                'name' => $region->name,
                'type' => $region->type ?? 'region',
                'level' => $region->level,
                'total_responses' => $regionResponses->count(),
                'completed_responses' => $regionResponses->where('status', 'completed')->count(),
                'completion_rate' => $regionResponses->count() > 0
                    ? round(($regionResponses->where('status', 'completed')->count() / $regionResponses->count()) * 100, 1)
                    : 0,
                'targeted_users' => $this->estimateTargetedForInstitution($survey, $allSchoolIds),
                'response_rate' => $this->calculateResponseRateForInstitutions($survey, $regionResponses, $allSchoolIds),
                'children' => $children,
            ];
        })->values()->toArray();
    }

    /**
     * Build hierarchy for RegionAdmin (sectors -> schools)
     */
    protected function buildRegionHierarchyEnhanced(Survey $survey, Collection $responses, User $user): array
    {
        $userRegion = $user->institution;

        if (! $userRegion || $userRegion->level !== 2) {
            return [];
        }

        $sectors = Institution::where('parent_id', $userRegion->id)
            ->where('level', 3)
            ->with(['children' => function ($q) {
                $q->where('level', 4);
            }])
            ->get();

        return $sectors->map(function ($sector) use ($survey, $responses) {
            return $this->buildSectorNodeEnhanced($sector, $survey, $responses);
        })->values()->toArray();
    }

    /**
     * Build hierarchy for SektorAdmin (schools only)
     */
    protected function buildSectorHierarchyEnhanced(Survey $survey, Collection $responses, User $user): array
    {
        $userSector = $user->institution;

        if (! $userSector || $userSector->level !== 3) {
            return [];
        }

        $schools = $userSector->children()->where('level', 4)->get();

        return $schools->map(function ($school) use ($survey, $responses) {
            $schoolResponses = $responses->where('institution_id', $school->id);

            return [
                'id' => $school->id,
                'name' => $school->name,
                'type' => $school->type ?? 'school',
                'level' => $school->level,
                'total_responses' => $schoolResponses->count(),
                'completed_responses' => $schoolResponses->where('status', 'completed')->count(),
                'completion_rate' => $schoolResponses->count() > 0
                    ? round(($schoolResponses->where('status', 'completed')->count() / $schoolResponses->count()) * 100, 1)
                    : 0,
                'targeted_users' => $this->estimateTargetedForInstitution($survey, collect([$school->id])),
                'response_rate' => $this->calculateResponseRateForInstitutions($survey, $schoolResponses, collect([$school->id])),
            ];
        })->values()->toArray();
    }

    /**
     * Build sector node with schools
     */
    protected function buildSectorNodeEnhanced(Institution $sector, Survey $survey, Collection $responses): array
    {
        $schoolIds = $sector->children->pluck('id');
        $sectorResponses = $responses->whereIn('institution_id', $schoolIds);

        $schools = $sector->children->map(function ($school) use ($survey, $responses) {
            $schoolResponses = $responses->where('institution_id', $school->id);

            return [
                'id' => $school->id,
                'name' => $school->name,
                'type' => $school->type ?? 'school',
                'level' => $school->level,
                'total_responses' => $schoolResponses->count(),
                'completed_responses' => $schoolResponses->where('status', 'completed')->count(),
                'completion_rate' => $schoolResponses->count() > 0
                    ? round(($schoolResponses->where('status', 'completed')->count() / $schoolResponses->count()) * 100, 1)
                    : 0,
                'targeted_users' => $this->estimateTargetedForInstitution($survey, collect([$school->id])),
                'response_rate' => $this->calculateResponseRateForInstitutions($survey, $schoolResponses, collect([$school->id])),
            ];
        })->values()->toArray();

        return [
            'id' => $sector->id,
            'name' => $sector->name,
            'type' => $sector->type ?? 'sector',
            'level' => $sector->level,
            'total_responses' => $sectorResponses->count(),
            'completed_responses' => $sectorResponses->where('status', 'completed')->count(),
            'completion_rate' => $sectorResponses->count() > 0
                ? round(($sectorResponses->where('status', 'completed')->count() / $sectorResponses->count()) * 100, 1)
                : 0,
            'targeted_users' => $this->estimateTargetedForInstitution($survey, $schoolIds),
            'response_rate' => $this->calculateResponseRateForInstitutions($survey, $sectorResponses, $schoolIds),
            'total_schools' => $sector->children->count(),
            'responded_schools' => $sectorResponses->unique('institution_id')->count(),
            'children' => $schools,
        ];
    }

    /**
     * Build flat hierarchy for SchoolAdmin
     */
    protected function buildFlatHierarchyEnhanced(Survey $survey, Collection $responses, User $user): array
    {
        $institution = $user->institution;
        if (! $institution) {
            return [];
        }

        $institutionResponses = $responses->where('institution_id', $institution->id);

        return [[
            'id' => $institution->id,
            'name' => $institution->name,
            'type' => $institution->type ?? 'school',
            'level' => $institution->level,
            'total_responses' => $institutionResponses->count(),
            'completed_responses' => $institutionResponses->where('status', 'completed')->count(),
            'completion_rate' => $institutionResponses->count() > 0
                ? round(($institutionResponses->where('status', 'completed')->count() / $institutionResponses->count()) * 100, 1)
                : 0,
            'targeted_users' => $this->estimateTargetedForInstitution($survey, collect([$institution->id])),
            'response_rate' => $this->calculateResponseRateForInstitutions($survey, $institutionResponses, collect([$institution->id])),
        ]];
    }

    /**
     * Get hierarchy type based on role
     */
    protected function getHierarchyType(string $role): string
    {
        return match ($role) {
            'superadmin' => 'regions_sectors_schools',
            'regionadmin' => 'sectors_schools',
            'sektoradmin' => 'schools',
            default => 'single_institution',
        };
    }

    /**
     * Estimate targeted users for specific institutions
     */
    public function estimateTargetedForInstitution(Survey $survey, Collection $institutionIds): int
    {
        $query = User::where('is_active', true)
            ->whereIn('institution_id', $institutionIds);

        // If no targeting rules, count all active users in institutions
        if (! $survey->targeting_rules) {
            return $query->count();
        }

        $rules = is_string($survey->targeting_rules)
            ? json_decode($survey->targeting_rules, true)
            : $survey->targeting_rules;

        // If targeting rules exist and specify roles, filter by roles
        if (isset($rules['roles']) && is_array($rules['roles']) && ! empty($rules['roles'])) {
            $query->whereHas('roles', function ($q) use ($rules) {
                $q->whereIn('name', $rules['roles']);
            });
        }

        return $query->count();
    }

    /**
     * Calculate response rate for specific institutions
     */
    public function calculateResponseRateForInstitutions(Survey $survey, Collection $responses, Collection $institutionIds): float
    {
        $targeted = $this->estimateTargetedForInstitution($survey, $institutionIds);
        $responseCount = $responses->count();

        // If no responses, return 0
        if ($responseCount === 0) {
            return 0;
        }

        // If no targeted users found, but responses exist
        // This means either targeting rules are too restrictive or users responded outside targeting
        // In this case, show 100% since responses exist
        if ($targeted === 0) {
            return 100.0;
        }

        // Calculate percentage, but cap at 100% (in case more people responded than targeted)
        $rate = ($responseCount / $targeted) * 100;

        return round(min($rate, 100), 1);
    }

    /**
     * Get non-responding institutions for a survey
     * Shows institutions that have not participated or have low participation
     */
    public function getNonRespondingInstitutions(Survey $survey): array
    {
        $user = Auth::user();
        $userRole = $user->getRoleNames()->first();
        $allowedInstitutionIds = \App\Helpers\DataIsolationHelper::getAllowedInstitutionIds($user);

        // Get all responses for this survey
        $responses = $survey->responses()
            ->whereIn('institution_id', $allowedInstitutionIds)
            ->with(['respondent'])
            ->get();

        // Get all institutions based on role
        $institutions = $this->getAllInstitutionsForUser($user, $userRole);

        $nonRespondingList = [];
        $totalInstitutions = $institutions->count();
        $respondedInstitutions = 0;
        $nonRespondedInstitutions = 0;
        $partialResponseInstitutions = 0;

        foreach ($institutions as $institution) {
            $institutionResponses = $responses->where('institution_id', $institution->id);
            $targetedUsers = $this->estimateTargetedForInstitution($survey, collect([$institution->id]));
            $respondedUsers = $institutionResponses->count();

            // Determine response status
            $responseStatus = 'full_response';
            if ($respondedUsers === 0) {
                $responseStatus = 'no_response';
                $nonRespondedInstitutions++;
            } elseif ($targetedUsers > 0 && ($respondedUsers / $targetedUsers) < 0.5) {
                $responseStatus = 'partial_response';
                $partialResponseInstitutions++;
            } else {
                $respondedInstitutions++;

                continue; // Skip institutions with good response rate
            }

            // Get parent institution name
            $parentName = null;
            if ($institution->parent) {
                $parentName = $institution->parent->name;
            }

            // Get last activity
            $lastActivity = $institutionResponses->max('created_at');

            $nonRespondingList[] = [
                'id' => $institution->id,
                'name' => $institution->name,
                'type' => $institution->type ?? 'school',
                'level' => $institution->level,
                'parent_name' => $parentName,
                'targeted_users' => $targetedUsers,
                'responded_users' => $respondedUsers,
                'response_rate' => $targetedUsers > 0 ? round(($respondedUsers / $targetedUsers) * 100, 1) : 0,
                'response_status' => $responseStatus,
                'last_activity' => $lastActivity,
            ];
        }

        return [
            'survey_id' => $survey->id,
            'user_role' => $userRole,
            'total_institutions' => $totalInstitutions,
            'responded_institutions' => $respondedInstitutions,
            'non_responded_institutions' => $nonRespondedInstitutions,
            'partial_response_institutions' => $partialResponseInstitutions,
            'summary' => [
                'response_rate' => $totalInstitutions > 0
                    ? round(($respondedInstitutions / $totalInstitutions) * 100, 1)
                    : 0,
                'non_response_rate' => $totalInstitutions > 0
                    ? round((($nonRespondedInstitutions + $partialResponseInstitutions) / $totalInstitutions) * 100, 1)
                    : 0,
            ],
            'institutions' => $nonRespondingList,
        ];
    }

    /**
     * Get all institutions for user based on role
     */
    protected function getAllInstitutionsForUser(User $user, string $userRole): Collection
    {
        if ($userRole === 'superadmin') {
            // SuperAdmin sees all schools
            return Institution::where('level', 4)->with('parent')->get();
        } elseif ($userRole === 'regionadmin') {
            // RegionAdmin sees all schools in their region
            $userRegion = $user->institution;
            if (! $userRegion || $userRegion->level !== 2) {
                return collect([]);
            }

            $sectorIds = Institution::where('parent_id', $userRegion->id)
                ->where('level', 3)
                ->pluck('id');

            return Institution::whereIn('parent_id', $sectorIds)
                ->where('level', 4)
                ->with('parent')
                ->get();
        } elseif ($userRole === 'sektoradmin') {
            // SektorAdmin sees schools in their sector
            $userSector = $user->institution;
            if (! $userSector || $userSector->level !== 3) {
                return collect([]);
            }

            return Institution::where('parent_id', $userSector->id)
                ->where('level', 4)
                ->with('parent')
                ->get();
        }

        return collect([]);
    }
}
