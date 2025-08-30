<?php

namespace App\Http\Controllers\RegionAdmin;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class RegionAdminClassController extends Controller
{
    /**
     * Get all classes in the region
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $userRegionId = $user->institution_id;
            
            // Get all institutions in this region
            $region = Institution::find($userRegionId);
            if (!$region) {
                return response()->json(['message' => 'Region not found'], 404);
            }
            
            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $userRegionId; // Include region itself
            
            // Get all classes (grades) from schools in this region
            $classes = Grade::whereIn('institution_id', $allowedInstitutionIds)
                ->with(['institution:id,name,type', 'homeroomTeacher:id,username,first_name,last_name', 'room:id,name'])
                ->when($request->get('search'), function ($query, $search) {
                    $query->where('name', 'ILIKE', "%{$search}%");
                })
                ->when($request->get('institution_id'), function ($query, $institutionId) use ($allowedInstitutionIds) {
                    if (in_array($institutionId, $allowedInstitutionIds)) {
                        $query->where('institution_id', $institutionId);
                    }
                })
                ->when($request->get('is_active'), function ($query, $isActive) {
                    $query->where('is_active', $isActive);
                })
                ->orderBy('institution_id')
                ->orderBy('class_level')
                ->orderBy('name')
                ->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $classes,
                'region_name' => $region->name,
                'total_institutions' => count($allowedInstitutionIds),
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific class details
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $userRegionId = $user->institution_id;
            
            // Get allowed institutions
            $region = Institution::find($userRegionId);
            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $userRegionId;
            
            $class = Grade::whereIn('institution_id', $allowedInstitutionIds)
                ->with([
                    'institution:id,name,type,address',
                    'homeroomTeacher:id,username,first_name,last_name',
                    'homeroomTeacher.profile:user_id,first_name,last_name',
                    'room:id,name,capacity',
                    'academicYear:id,year,is_current'
                ])
                ->findOrFail($id);

            // Get class statistics
            $stats = [
                'total_students' => $class->student_count,
                'expected_students' => $class->room ? $class->room->capacity : null,
                'class_level' => $class->class_level,
                'specialty' => $class->specialty,
            ];

            return response()->json([
                'success' => true,
                'data' => $class,
                'statistics' => $stats,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch class details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get class summary statistics for the region
     */
    public function getStatistics(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $userRegionId = $user->institution_id;
            
            // Get allowed institutions
            $region = Institution::find($userRegionId);
            $allowedInstitutionIds = $region->getAllChildrenIds();
            $allowedInstitutionIds[] = $userRegionId;
            
            $stats = [
                'total_classes' => Grade::whereIn('institution_id', $allowedInstitutionIds)->count(),
                'active_classes' => Grade::whereIn('institution_id', $allowedInstitutionIds)->where('is_active', true)->count(),
                'total_students' => Grade::whereIn('institution_id', $allowedInstitutionIds)->sum('student_count'),
                'classes_by_level' => Grade::whereIn('institution_id', $allowedInstitutionIds)
                    ->selectRaw('class_level, COUNT(*) as count, SUM(student_count) as students')
                    ->groupBy('class_level')
                    ->orderBy('class_level')
                    ->get(),
                'classes_by_institution' => Grade::whereIn('institution_id', $allowedInstitutionIds)
                    ->join('institutions', 'grades.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.name, institutions.id, COUNT(grades.id) as class_count, SUM(grades.student_count) as student_count')
                    ->groupBy('institutions.id', 'institutions.name')
                    ->get(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'region_name' => $region->name,
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch class statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}