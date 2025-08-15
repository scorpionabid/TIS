<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AcademicYearController extends Controller
{
    /**
     * Display a listing of the academic years.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $sortBy = $request->get('sort_by', 'start_date');
            $sortDirection = $request->get('sort_direction', 'desc');

            $query = AcademicYear::query();

            // Add sorting
            $query->orderBy($sortBy, $sortDirection);

            // If per_page is high (e.g., 50+), return all without pagination for dropdowns
            if ($perPage >= 50) {
                $academicYears = $query->get();
                return response()->json([
                    'success' => true,
                    'data' => $academicYears,
                    'message' => 'Academic years retrieved successfully'
                ]);
            }

            $academicYears = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $academicYears->items(),
                'meta' => [
                    'current_page' => $academicYears->currentPage(),
                    'last_page' => $academicYears->lastPage(),
                    'per_page' => $academicYears->perPage(),
                    'total' => $academicYears->total(),
                ],
                'message' => 'Academic years retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve academic years',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the active academic year.
     */
    public function active(): JsonResponse
    {
        try {
            $activeYear = AcademicYear::where('is_active', true)->first();

            if (!$activeYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active academic year found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $activeYear,
                'message' => 'Active academic year retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve active academic year',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified academic year.
     */
    public function show(AcademicYear $academicYear): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $academicYear,
                'message' => 'Academic year retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve academic year',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}