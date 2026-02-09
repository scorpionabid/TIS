<?php

namespace App\Http\Controllers;

use App\Http\Controllers\BaseController;
use App\Models\AcademicYear;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcademicYearController extends BaseController
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
                    'message' => 'Academic years retrieved successfully',
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
                'message' => 'Academic years retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve academic years',
                'error' => $e->getMessage(),
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

            if (! $activeYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active academic year found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $activeYear,
                'message' => 'Active academic year retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve active academic year',
                'error' => $e->getMessage(),
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
                'message' => 'Academic year retrieved successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve academic year',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created academic year.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:100|unique:academic_years,name',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'is_active' => 'boolean',
                'metadata' => 'array',
            ]);

            DB::beginTransaction();

            // If this year is set to active, deactivate others
            if ($validated['is_active'] ?? false) {
                AcademicYear::where('is_active', true)->update(['is_active' => false]);
            }

            $academicYear = AcademicYear::create([
                'name' => $validated['name'],
                'start_date' => Carbon::parse($validated['start_date']),
                'end_date' => Carbon::parse($validated['end_date']),
                'is_active' => $validated['is_active'] ?? false,
                'metadata' => $validated['metadata'] ?? [],
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $academicYear->fresh(),
                'message' => 'Academic year created successfully',
            ], 201);
        } catch (ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to create academic year',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified academic year.
     */
    public function update(Request $request, AcademicYear $academicYear): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:100|unique:academic_years,name,' . $academicYear->id,
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'is_active' => 'boolean',
                'metadata' => 'array',
            ]);

            DB::beginTransaction();

            // If this year is set to active, deactivate others
            if ($validated['is_active'] ?? false) {
                AcademicYear::where('id', '!=', $academicYear->id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            $academicYear->update([
                'name' => $validated['name'],
                'start_date' => Carbon::parse($validated['start_date']),
                'end_date' => Carbon::parse($validated['end_date']),
                'is_active' => $validated['is_active'] ?? $academicYear->is_active,
                'metadata' => $validated['metadata'] ?? $academicYear->metadata,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $academicYear->fresh(),
                'message' => 'Academic year updated successfully',
            ]);
        } catch (ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to update academic year',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified academic year.
     */
    public function destroy(AcademicYear $academicYear): JsonResponse
    {
        try {
            // Check if there are grades associated with this academic year
            $gradesCount = $academicYear->grades()->count();
            if ($gradesCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Bu təhsil ilinə aid {$gradesCount} sinif var. Əvvəlcə sinifləri silməlisiniz.",
                ], 400);
            }

            // Check if this is the active academic year
            if ($academicYear->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aktiv təhsil ili silinə bilməz. Əvvəlcə başqa ili aktiv edin.',
                ], 400);
            }

            $name = $academicYear->name;
            $academicYear->delete();

            return response()->json([
                'success' => true,
                'message' => "'{$name}' təhsil ili uğurla silindi",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete academic year',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Activate the specified academic year.
     */
    public function activate(AcademicYear $academicYear): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Deactivate all other years
            AcademicYear::where('id', '!=', $academicYear->id)
                ->where('is_active', true)
                ->update(['is_active' => false]);

            // Activate this year
            $academicYear->update(['is_active' => true]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $academicYear->fresh(),
                'message' => "'{$academicYear->name}' təhsil ili aktiv edildi",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to activate academic year',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate future academic years and set the current year.
     */
    public function generateFutureYears(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'base_year' => ['nullable', 'regex:/^\d{4}\s*-\s*\d{4}$/'],
                'count' => 'nullable|integer|min:1|max:20',
            ]);

            $baseYearName = $validated['base_year'] ?? '2025-2026';
            $count = $validated['count'] ?? 5;

            [$startYear, $endYear] = $this->parseYearName($baseYearName);

            if (! $startYear || ! $endYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Təhsil ili formatı yalnışdır. Nümunə: 2025-2026',
                ], 422);
            }

            DB::beginTransaction();

            $baseYear = AcademicYear::updateOrCreate(
                ['name' => $baseYearName],
                [
                    'start_date' => Carbon::create($startYear, 9, 1),
                    'end_date' => Carbon::create($endYear, 6, 30),
                    'is_active' => true,
                ]
            );

            AcademicYear::where('id', '!=', $baseYear->id)->update(['is_active' => false]);

            $generated = [];

            for ($i = 1; $i <= $count; $i++) {
                $futureStart = $startYear + $i;
                $futureEnd = $futureStart + 1;
                $name = sprintf('%d-%d', $futureStart, $futureEnd);

                $academicYear = AcademicYear::firstOrCreate(
                    ['name' => $name],
                    [
                        'start_date' => Carbon::create($futureStart, 9, 1),
                        'end_date' => Carbon::create($futureEnd, 6, 30),
                        'is_active' => false,
                    ]
                );

                if ($academicYear->wasRecentlyCreated) {
                    $generated[] = $name;
                }
            }

            DB::commit();

            $academicYears = AcademicYear::orderBy('start_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $academicYears,
                'generated' => $generated,
                'message' => "'{$baseYearName}' təhsil ili aktiv edildi və növbəti {$count} il yoxlanıldı",
            ]);
        } catch (ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate academic years',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Parse year name helper (YYYY-YYYY).
     */
    private function parseYearName(string $name): array
    {
        if (preg_match('/^(?<start>\d{4})\s*-\s*(?<end>\d{4})$/', $name, $matches)) {
            $start = (int) $matches['start'];
            $end = (int) $matches['end'];

            if ($end === $start + 1) {
                return [$start, $end];
            }
        }

        return [null, null];
    }
}
