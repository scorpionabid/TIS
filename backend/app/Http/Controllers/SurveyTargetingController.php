<?php

namespace App\Http\Controllers;

use App\Services\SurveyTargetingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SurveyTargetingController extends Controller
{
    protected SurveyTargetingService $targetingService;

    public function __construct(SurveyTargetingService $targetingService)
    {
        $this->targetingService = $targetingService;
    }

    /**
     * Get targeting options for survey creation
     */
    public function getTargetingOptions(Request $request): JsonResponse
    {
        try {
            $options = $this->targetingService->getTargetingOptions($request->user());

            return response()->json([
                'targeting_options' => $options
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching targeting options',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get institution hierarchy for tree selection
     */
    public function getInstitutionHierarchy(Request $request): JsonResponse
    {
        try {
            $hierarchy = $this->targetingService->getInstitutionHierarchy($request->user());

            return response()->json([
                'hierarchy' => $hierarchy
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching institution hierarchy',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estimate recipients for given criteria
     */
    public function estimateRecipients(Request $request): JsonResponse
    {
        $request->validate([
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'integer|exists:institutions,id',
            'target_departments' => 'nullable|array',
            'target_departments.*' => 'integer|exists:departments,id',
            'target_user_types' => 'nullable|array',
            'target_user_types.*' => 'string',
            'institution_levels' => 'nullable|array',
            'institution_levels.*' => 'integer|between:1,5'
        ]);

        try {
            $criteria = $request->only([
                'target_institutions',
                'target_departments', 
                'target_user_types',
                'institution_levels'
            ]);

            $estimation = $this->targetingService->estimateRecipients($criteria, $request->user());

            return response()->json([
                'estimation' => $estimation
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error estimating recipients',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Apply targeting preset
     */
    public function applyPreset(Request $request): JsonResponse
    {
        $request->validate([
            'preset_key' => 'required|string'
        ]);

        try {
            $targeting = $this->targetingService->applyPreset(
                $request->preset_key,
                $request->user()
            );

            return response()->json([
                'targeting' => $targeting
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error applying preset',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate targeting criteria
     */
    public function validateTargeting(Request $request): JsonResponse
    {
        $request->validate([
            'target_institutions' => 'nullable|array',
            'target_institutions.*' => 'integer',
            'target_departments' => 'nullable|array',
            'target_departments.*' => 'integer',
            'target_user_types' => 'nullable|array',
            'target_user_types.*' => 'string',
            'institution_levels' => 'nullable|array',
            'institution_levels.*' => 'integer|between:1,5'
        ]);

        try {
            $criteria = $request->only([
                'target_institutions',
                'target_departments',
                'target_user_types', 
                'institution_levels'
            ]);

            $validation = $this->targetingService->validateTargeting($criteria, $request->user());

            return response()->json([
                'validation' => $validation
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error validating targeting',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get accessible institutions for current user
     */
    public function getAccessibleInstitutions(Request $request): JsonResponse
    {
        try {
            $institutions = $this->targetingService->getAccessibleInstitutions($request->user());

            return response()->json([
                'institutions' => $institutions->map(function ($institution) {
                    return [
                        'id' => $institution->id,
                        'name' => $institution->name,
                        'code' => $institution->code,
                        'type' => $institution->type,
                        'level' => $institution->level,
                        'parent_id' => $institution->parent_id
                    ];
                })
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching accessible institutions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get accessible departments for current user
     */
    public function getAccessibleDepartments(Request $request): JsonResponse
    {
        $request->validate([
            'institution_ids' => 'nullable|array',
            'institution_ids.*' => 'integer|exists:institutions,id'
        ]);

        try {
            $departments = $this->targetingService->getAccessibleDepartments($request->user());

            // Filter by institution_ids if provided
            if ($request->has('institution_ids')) {
                $departments = $departments->whereIn('institution_id', $request->institution_ids);
            }

            return response()->json([
                'departments' => $departments->map(function ($department) {
                    return [
                        'id' => $department->id,
                        'name' => $department->name,
                        'code' => $department->code,
                        'type' => $department->type,
                        'institution_id' => $department->institution_id
                    ];
                })
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching accessible departments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get bulk selection options by level/type
     */
    public function getBulkSelectionOptions(Request $request): JsonResponse
    {
        $request->validate([
            'selection_type' => 'required|string|in:by_level,by_type,by_region'
        ]);

        try {
            $user = $request->user();
            $accessibleInstitutions = $this->targetingService->getAccessibleInstitutions($user);
            
            $options = [];

            switch ($request->selection_type) {
                case 'by_level':
                    $levelCounts = $accessibleInstitutions
                        ->groupBy('level')
                        ->map(function ($institutions, $level) {
                            return [
                                'level' => $level,
                                'count' => $institutions->count(),
                                'institutions' => $institutions->pluck('id')->toArray()
                            ];
                        });
                    
                    $options = $levelCounts->sortBy('level')->values()->toArray();
                    break;

                case 'by_type':
                    $typeCounts = $accessibleInstitutions
                        ->groupBy('type')
                        ->map(function ($institutions, $type) {
                            return [
                                'type' => $type,
                                'count' => $institutions->count(),
                                'institutions' => $institutions->pluck('id')->toArray()
                            ];
                        });
                    
                    $options = $typeCounts->values()->toArray();
                    break;

                case 'by_region':
                    // Get regional grouping (institutions with parent_id = regional institution)
                    $regionalInstitutions = $accessibleInstitutions->where('level', 2);
                    
                    foreach ($regionalInstitutions as $region) {
                        $childInstitutions = $accessibleInstitutions
                            ->where('parent_id', $region->id);
                        
                        $options[] = [
                            'region_id' => $region->id,
                            'region_name' => $region->name,
                            'count' => $childInstitutions->count(),
                            'institutions' => $childInstitutions->pluck('id')->toArray()
                        ];
                    }
                    break;
            }

            return response()->json([
                'selection_type' => $request->selection_type,
                'options' => $options
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching bulk selection options',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}