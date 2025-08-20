<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use App\Models\Department;
use App\Models\Survey;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class RegionAdminInstitutionController extends Controller
{
    /**
     * Get institution statistics for RegionAdmin
     */
    public function getInstitutionStats(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get sectors in region
        $sectors = Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->with(['children' => function($query) {
                $query->where('level', 4); // Schools
            }])
            ->get()
            ->map(function($sector) {
                $schools = $sector->children;
                $schoolIds = $schools->pluck('id');
                
                // Get users in sector schools
                $totalUsers = User::whereIn('institution_id', $schoolIds)->count();
                $activeUsers = User::whereIn('institution_id', $schoolIds)
                    ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                    ->count();
                
                // Get survey activity - simplified query
                $surveys = Survey::count(); // Simplified for now
                
                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'schools_count' => $schools->count(),
                    'total_users' => $totalUsers,
                    'active_users' => $activeUsers,
                    'surveys_count' => $surveys,
                    'activity_rate' => $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100, 1) : 0,
                    'schools' => $schools->map(function($school) {
                        $userCount = User::where('institution_id', $school->id)->count();
                        $activeCount = User::where('institution_id', $school->id)
                            ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                            ->count();
                        
                        return [
                            'id' => $school->id,
                            'name' => $school->name,
                            'user_count' => $userCount,
                            'active_users' => $activeCount,
                            'activity_rate' => $userCount > 0 ? round(($activeCount / $userCount) * 100, 1) : 0
                        ];
                    })
                ];
            });
        
        return response()->json([
            'sectors' => $sectors,
            'total_sectors' => $sectors->count(),
            'total_schools' => $sectors->sum('schools_count'),
            'total_users' => $sectors->sum('total_users'),
            'total_active_users' => $sectors->sum('active_users')
        ]);
    }

    /**
     * Get detailed institution hierarchy for the region
     */
    public function getInstitutionHierarchy(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        $region = Institution::with(['children.children']) // Region -> Sectors -> Schools
            ->find($userRegionId);
            
        if (!$region) {
            return response()->json(['error' => 'Region not found'], 404);
        }
        
        $hierarchyData = [
            'region' => [
                'id' => $region->id,
                'name' => $region->name,
                'level' => $region->level,
                'sectors' => $region->children->map(function($sector) {
                    return [
                        'id' => $sector->id,
                        'name' => $sector->name,
                        'level' => $sector->level,
                        'schools_count' => $sector->children->count(),
                        'schools' => $sector->children->map(function($school) {
                            $userCount = User::where('institution_id', $school->id)->count();
                            return [
                                'id' => $school->id,
                                'name' => $school->name,
                                'level' => $school->level,
                                'user_count' => $userCount
                            ];
                        })
                    ];
                })
            ]
        ];
        
        return response()->json($hierarchyData);
    }

    /**
     * Store a new institution (sector or school) for RegionAdmin
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:200',
            'short_name' => 'nullable|string|max:50',
            'type' => ['required', 'string', Rule::in(['sektor', 'school', 'vocational'])],
            'parent_id' => 'nullable|integer|exists:institutions,id',
            'institution_code' => 'nullable|string|max:20|unique:institutions,institution_code',
            'contact_info' => 'nullable|array',
            'location' => 'nullable|array',
            'metadata' => 'nullable|array',
            'established_date' => 'nullable|date'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $data = $validator->validated();
        
        // Determine level and parent_id based on type
        if ($data['type'] === 'sektor') {
            $data['level'] = 3;
            $data['parent_id'] = $userRegionId; // RegionAdmin can only create sectors under their region
        } elseif (in_array($data['type'], ['school', 'vocational'])) {
            $data['level'] = 4;
            // If parent_id not provided, default to a sector under region
            if (empty($data['parent_id'])) {
                $defaultSector = Institution::where('parent_id', $userRegionId)
                    ->where('level', 3)
                    ->first();
                if (!$defaultSector) {
                    return response()->json([
                        'message' => 'No sector found. Please create a sector first or specify parent_id.'
                    ], 400);
                }
                $data['parent_id'] = $defaultSector->id;
            } else {
                // Validate that parent is a sector under this region
                $parentSector = Institution::where('id', $data['parent_id'])
                    ->where('parent_id', $userRegionId)
                    ->where('level', 3)
                    ->first();
                if (!$parentSector) {
                    return response()->json([
                        'message' => 'Invalid parent sector. Must be a sector under your region.'
                    ], 400);
                }
            }
        }
        
        // Set region code based on parent region
        $parentRegion = Institution::find($userRegionId);
        $data['region_code'] = $parentRegion->region_code ?? 'REG';
        $data['is_active'] = true;
        
        try {
            $institution = Institution::create($data);
            
            return response()->json([
                'message' => 'Institution created successfully',
                'institution' => $institution->load('parent')
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create institution',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Show a specific institution within RegionAdmin's scope
     */
    public function show(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get all institution IDs under this region
        $region = Institution::find($userRegionId);
        $allowedIds = $region->getAllChildrenIds();
        
        if (!in_array($id, $allowedIds)) {
            return response()->json(['message' => 'Institution not found in your region'], 404);
        }
        
        $institution = Institution::with(['parent', 'children', 'departments'])
            ->find($id);
            
        if (!$institution) {
            return response()->json(['message' => 'Institution not found'], 404);
        }
        
        return response()->json([
            'institution' => $institution
        ]);
    }
    
    /**
     * Update an institution within RegionAdmin's scope
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Verify institution is under RegionAdmin's scope
        $region = Institution::find($userRegionId);
        $allowedIds = $region->getAllChildrenIds();
        
        if (!in_array($id, $allowedIds)) {
            return response()->json(['message' => 'Institution not found in your region'], 404);
        }
        
        $institution = Institution::find($id);
        if (!$institution) {
            return response()->json(['message' => 'Institution not found'], 404);
        }
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:200',
            'short_name' => 'nullable|string|max:50',
            'institution_code' => ['nullable', 'string', 'max:20', Rule::unique('institutions')->ignore($id)],
            'contact_info' => 'nullable|array',
            'location' => 'nullable|array',
            'metadata' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'established_date' => 'nullable|date'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        try {
            $institution->update($validator->validated());
            
            return response()->json([
                'message' => 'Institution updated successfully',
                'institution' => $institution->load('parent', 'children')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update institution',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Delete an institution within RegionAdmin's scope
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Verify institution is under RegionAdmin's scope
        $region = Institution::find($userRegionId);
        $allowedIds = $region->getAllChildrenIds();
        
        if (!in_array($id, $allowedIds)) {
            return response()->json(['message' => 'Institution not found in your region'], 404);
        }
        
        $institution = Institution::find($id);
        if (!$institution) {
            return response()->json(['message' => 'Institution not found'], 404);
        }
        
        // Check if institution has children
        if ($institution->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete institution with child institutions'
            ], 400);
        }
        
        // Check if institution has users
        if ($institution->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete institution with assigned users'
            ], 400);
        }
        
        try {
            $institution->delete();
            
            return response()->json([
                'message' => 'Institution deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete institution',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get all institutions under RegionAdmin's scope (for listing)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        $institutions = Institution::where('parent_id', $userRegionId)
            ->orWhere(function($query) use ($userRegionId) {
                // Get sectors and their children
                $sectorIds = Institution::where('parent_id', $userRegionId)
                    ->where('level', 3)
                    ->pluck('id');
                $query->whereIn('parent_id', $sectorIds);
            })
            ->with(['parent', 'children'])
            ->orderBy('level')
            ->orderBy('name')
            ->get();
            
        return response()->json([
            'institutions' => $institutions
        ]);
    }

    /**
     * Get performance insights for institutions
     */
    public function getPerformanceInsights(Request $request): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Get sectors and calculate performance metrics
        $sectors = Institution::where('parent_id', $userRegionId)
            ->where('level', 3)
            ->with('children')
            ->get();
            
        $performanceData = [];
        $allSectorData = [];
        
        foreach ($sectors as $sector) {
            $schoolIds = $sector->children->pluck('id');
            
            $totalUsers = User::whereIn('institution_id', $schoolIds)->count();
            $activeUsers = User::whereIn('institution_id', $schoolIds)
                ->where('last_login_at', '>=', Carbon::now()->subDays(30))
                ->count();
            $surveys = Survey::count(); // Simplified for now
            
            $activityRate = $totalUsers > 0 ? ($activeUsers / $totalUsers) * 100 : 0;
            
            $sectorData = [
                'id' => $sector->id,
                'name' => $sector->name,
                'schools_count' => $sector->children->count(),
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'activity_rate' => round($activityRate, 1),
                'surveys_count' => $surveys,
                'performance_score' => round(($activityRate + ($surveys > 0 ? 20 : 0)) / 2, 1)
            ];
            
            $allSectorData[] = $sectorData;
        }
        
        // Sort by performance score
        usort($allSectorData, function($a, $b) {
            return $b['performance_score'] <=> $a['performance_score'];
        });
        
        // Get top performer and attention needed
        $topPerformer = $allSectorData[0] ?? null;
        $attentionNeeded = array_filter($allSectorData, function($sector) {
            return $sector['activity_rate'] < 50;
        });
        
        return response()->json([
            'sectors_performance' => $allSectorData,
            'top_performer' => $topPerformer,
            'attention_needed' => array_values($attentionNeeded),
            'average_performance' => round(collect($allSectorData)->avg('performance_score'), 1),
            'total_institutions' => collect($allSectorData)->sum('schools_count') + count($allSectorData) // schools + sectors
        ]);
    }
    
    // DEPARTMENT MANAGEMENT METHODS
    
    /**
     * Get departments for a specific institution
     */
    public function getDepartments(Request $request, $institutionId): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Verify institution is under RegionAdmin's scope
        $region = Institution::find($userRegionId);
        $allowedIds = $region->getAllChildrenIds();
        
        if (!in_array($institutionId, $allowedIds)) {
            return response()->json(['message' => 'Institution not found in your region'], 404);
        }
        
        $institution = Institution::find($institutionId);
        if (!$institution) {
            return response()->json(['message' => 'Institution not found'], 404);
        }
        
        $departments = Department::where('institution_id', $institutionId)
            ->with(['parent', 'children'])
            ->orderBy('name')
            ->get();
            
        return response()->json([
            'institution' => $institution,
            'departments' => $departments,
            'allowed_types' => Department::getAllowedTypesForInstitution($institution->type)
        ]);
    }
    
    /**
     * Store a new department for an institution
     */
    public function storeDepartment(Request $request, $institutionId): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Verify institution is under RegionAdmin's scope
        $region = Institution::find($userRegionId);
        $allowedIds = $region->getAllChildrenIds();
        
        if (!in_array($institutionId, $allowedIds)) {
            return response()->json(['message' => 'Institution not found in your region'], 404);
        }
        
        $institution = Institution::find($institutionId);
        if (!$institution) {
            return response()->json(['message' => 'Institution not found'], 404);
        }
        
        $allowedTypes = Department::getAllowedTypesForInstitution($institution->type);
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'short_name' => 'nullable|string|max:20',
            'department_type' => ['required', 'string', Rule::in($allowedTypes)],
            'parent_department_id' => 'nullable|integer|exists:departments,id',
            'description' => 'nullable|string',
            'metadata' => 'nullable|array',
            'capacity' => 'nullable|integer|min:1',
            'budget_allocation' => 'nullable|numeric|min:0',
            'functional_scope' => 'nullable|string'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $data = $validator->validated();
        $data['institution_id'] = $institutionId;
        $data['is_active'] = true;
        
        // Validate parent department belongs to same institution
        if (!empty($data['parent_department_id'])) {
            $parentDept = Department::where('id', $data['parent_department_id'])
                ->where('institution_id', $institutionId)
                ->first();
            if (!$parentDept) {
                return response()->json([
                    'message' => 'Parent department must belong to the same institution'
                ], 400);
            }
        }
        
        try {
            $department = Department::create($data);
            
            return response()->json([
                'message' => 'Department created successfully',
                'department' => $department->load('parent', 'institution')
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Show a specific department
     */
    public function showDepartment(Request $request, $institutionId, $departmentId): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Verify institution is under RegionAdmin's scope
        $region = Institution::find($userRegionId);
        $allowedIds = $region->getAllChildrenIds();
        
        if (!in_array($institutionId, $allowedIds)) {
            return response()->json(['message' => 'Institution not found in your region'], 404);
        }
        
        $department = Department::where('id', $departmentId)
            ->where('institution_id', $institutionId)
            ->with(['parent', 'children', 'institution', 'users'])
            ->first();
            
        if (!$department) {
            return response()->json(['message' => 'Department not found'], 404);
        }
        
        return response()->json([
            'department' => $department
        ]);
    }
    
    /**
     * Update a department
     */
    public function updateDepartment(Request $request, $institutionId, $departmentId): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Verify institution is under RegionAdmin's scope
        $region = Institution::find($userRegionId);
        $allowedIds = $region->getAllChildrenIds();
        
        if (!in_array($institutionId, $allowedIds)) {
            return response()->json(['message' => 'Institution not found in your region'], 404);
        }
        
        $department = Department::where('id', $departmentId)
            ->where('institution_id', $institutionId)
            ->first();
            
        if (!$department) {
            return response()->json(['message' => 'Department not found'], 404);
        }
        
        $institution = Institution::find($institutionId);
        $allowedTypes = Department::getAllowedTypesForInstitution($institution->type);
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100',
            'short_name' => 'nullable|string|max:20',
            'department_type' => ['sometimes', 'required', 'string', Rule::in($allowedTypes)],
            'parent_department_id' => 'nullable|integer|exists:departments,id',
            'description' => 'nullable|string',
            'metadata' => 'nullable|array',
            'capacity' => 'nullable|integer|min:1',
            'budget_allocation' => 'nullable|numeric|min:0',
            'functional_scope' => 'nullable|string',
            'is_active' => 'sometimes|boolean'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $data = $validator->validated();
        
        // Validate parent department belongs to same institution
        if (isset($data['parent_department_id']) && !empty($data['parent_department_id'])) {
            $parentDept = Department::where('id', $data['parent_department_id'])
                ->where('institution_id', $institutionId)
                ->first();
            if (!$parentDept) {
                return response()->json([
                    'message' => 'Parent department must belong to the same institution'
                ], 400);
            }
        }
        
        try {
            $department->update($data);
            
            return response()->json([
                'message' => 'Department updated successfully',
                'department' => $department->load('parent', 'children', 'institution')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Delete a department
     */
    public function destroyDepartment(Request $request, $institutionId, $departmentId): JsonResponse
    {
        $user = $request->user();
        $userRegionId = $user->institution_id;
        
        // Verify institution is under RegionAdmin's scope
        $region = Institution::find($userRegionId);
        $allowedIds = $region->getAllChildrenIds();
        
        if (!in_array($institutionId, $allowedIds)) {
            return response()->json(['message' => 'Institution not found in your region'], 404);
        }
        
        $department = Department::where('id', $departmentId)
            ->where('institution_id', $institutionId)
            ->first();
            
        if (!$department) {
            return response()->json(['message' => 'Department not found'], 404);
        }
        
        // Check if department has children
        if ($department->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete department with sub-departments'
            ], 400);
        }
        
        // Check if department has users
        if ($department->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete department with assigned users'
            ], 400);
        }
        
        try {
            $department->delete();
            
            return response()->json([
                'message' => 'Department deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}