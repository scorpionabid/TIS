<?php

namespace App\Http\Controllers\Institution;

use App\Constants\SubjectConstants;
use App\Http\Controllers\Controller;
use App\Http\Requests\InstitutionDeleteRequest;
use App\Models\Institution;
use App\Services\InstitutionDeleteProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InstitutionCRUDController extends Controller
{
    /**
     * Display a listing of the institutions.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Institution::query();

        // Handle soft deleted institutions visibility
        $showTrashed = $request->boolean('include_trashed', false);
        $onlyTrashed = $request->boolean('only_trashed', false);

        if ($onlyTrashed) {
            $query->onlyTrashed();
        } elseif ($showTrashed) {
            $query->withTrashed();
        }
        // Default behavior: only show non-deleted institutions (withoutTrashed is default)

        // Apply role-based access control
        $this->applyAccessControl($query, $user);

        // Filter by parent institution hierarchy (for report table wizard and similar selectors)
        if ($request->has('parent_id')) {
            // Filter by parent_id only if provided and valid.
            // This is crucial for RegionAdmins who should see all institutions in the region.
            $parentId = $request->integer('parent_id');
            if ($parentId > 0) {
                $query->where(function ($q) use ($parentId) {
                    $q->where('id', $parentId)
                        ->orWhere('parent_id', $parentId)
                        ->orWhereIn('parent_id', function ($subQuery) use ($parentId) {
                            $subQuery->select('id')
                                ->from('institutions')
                                ->where('parent_id', $parentId);
                        });
                });
            }
        }

        // Apply filters if provided
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('level')) {
            $query->where('level', $request->integer('level'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('search')) {
            $search = $request->search;

            // Check if search is in format "type:value"
            if (strpos($search, 'type:') === 0) {
                $typeValue = substr($search, 5); // Remove "type:" prefix
                $query->where('type', $typeValue);
            } else {
                // Regular search in name, code, and short_name
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('institution_code', 'like', "%{$search}%")
                        ->orWhere('short_name', 'like', "%{$search}%");
                });
            }
        }

        // --- Curriculum Dashboard Stats Integration ---
        if ($request->boolean('with_curriculum_stats', false)) {
            // Automatically detect the active academic year if not provided
            $academicYearId = (int) ($request->input('academic_year_id')
                ?? \App\Models\AcademicYear::where('is_active', true)->value('id')
                ?? 0);

            // Only add curriculum stats subqueries if we have a valid academic year
            if ($academicYearId > 0) {
                $clubId = SubjectConstants::CLUB_SUBJECT_ID;

                $query->addSelect(['institutions.*'])
                    ->addSelect([
                        'curriculum_status' => DB::table('curriculum_plan_approvals')
                            ->selectRaw('status')
                            ->whereColumn('institution_id', 'institutions.id')
                            ->where('academic_year_id', $academicYearId)
                            ->orderBy('id', 'desc')
                            ->limit(1),

                        'curriculum_main_hours' => DB::table('curriculum_plans')
                            ->selectRaw('COALESCE(SUM(hours), 0)')
                            ->whereColumn('institution_id', 'institutions.id')
                            ->where('academic_year_id', $academicYearId)
                            ->where('subject_id', '<>', $clubId),

                        'curriculum_total_hours' => DB::table('curriculum_plans')
                            ->selectRaw('COALESCE(SUM(hours), 0)')
                            ->whereColumn('institution_id', 'institutions.id')
                            ->where('academic_year_id', $academicYearId),

                        'curriculum_club_hours' => DB::table('curriculum_plans')
                            ->selectRaw('COALESCE(SUM(hours), 0)')
                            ->whereColumn('institution_id', 'institutions.id')
                            ->where('academic_year_id', $academicYearId)
                            ->where('subject_id', $clubId),
                    ]);

                // Vacancy raw subqueries chained directly — no duplicate 'institutions.*' select
                // (the prior addSelect(['institutions.*']) at L99 already covers the base columns)
                $query->selectRaw("(
                    (SELECT COALESCE(SUM(hours), 0) FROM curriculum_plans
                    WHERE institution_id = institutions.id AND academic_year_id = ? AND subject_id <> {$clubId})
                    -
                    (SELECT COALESCE(SUM(tl.weekly_hours), 0) FROM teaching_loads tl
                    INNER JOIN classes c ON tl.class_id = c.id
                    WHERE c.institution_id = institutions.id AND c.academic_year_id = ? AND tl.subject_id <> {$clubId} AND tl.deleted_at IS NULL)
                  ) as curriculum_main_vacancies", [$academicYearId, $academicYearId])
                    ->selectRaw('(
                    (SELECT COALESCE(SUM(hours), 0) FROM curriculum_plans
                    WHERE institution_id = institutions.id AND academic_year_id = ?)
                    -
                    (SELECT COALESCE(SUM(tl.weekly_hours), 0) FROM teaching_loads tl
                    INNER JOIN classes c ON tl.class_id = c.id
                    WHERE c.institution_id = institutions.id AND c.academic_year_id = ? AND tl.deleted_at IS NULL)
                  ) as curriculum_vacancies', [$academicYearId, $academicYearId])
                    ->selectRaw("(
                    (SELECT COALESCE(SUM(hours), 0) FROM curriculum_plans
                    WHERE institution_id = institutions.id AND academic_year_id = ? AND subject_id = {$clubId})
                    -
                    (SELECT COALESCE(SUM(tl.weekly_hours), 0) FROM teaching_loads tl
                    INNER JOIN classes c ON tl.class_id = c.id
                    WHERE c.institution_id = institutions.id AND c.academic_year_id = ? AND tl.subject_id = {$clubId} AND tl.deleted_at IS NULL)
                  ) as curriculum_club_vacancies", [$academicYearId, $academicYearId]);
            } // end if ($academicYearId > 0)
        } // end if (with_curriculum_stats)

        // Paginate results
        $perPage = $request->input('per_page', 15);
        $institutions = $query->paginate($perPage);

        // --- Post-process: fix curriculum hours with deduplicated batch query ---
        if ($request->boolean('with_curriculum_stats', false) && isset($academicYearId) && $academicYearId > 0) {
            $institutionIds = $institutions->pluck('id')->toArray();

            if (! empty($institutionIds)) {
                // One single DISTINCT ON query to get correctly deduplicated stats for all institutions
                $clubId = SubjectConstants::CLUB_SUBJECT_ID;
                $batchStats = DB::select("
                    SELECT
                        institution_id,
                        COALESCE(SUM(hours), 0) as total_hours,
                        COALESCE(SUM(CASE WHEN subject_id <> {$clubId} THEN hours ELSE 0 END), 0) as main_hours,
                        COALESCE(SUM(CASE WHEN subject_id = {$clubId} THEN hours ELSE 0 END), 0) as club_hours
                    FROM (
                        SELECT DISTINCT ON (
                            institution_id,
                            class_level,
                            subject_id,
                            education_type,
                            COALESCE(is_extra, false)
                        )
                            institution_id,
                            subject_id,
                            hours
                        FROM curriculum_plans
                        WHERE academic_year_id = :year_id
                          AND institution_id = ANY(:inst_ids)
                        ORDER BY
                            institution_id,
                            class_level,
                            subject_id,
                            education_type,
                            COALESCE(is_extra, false),
                            id ASC
                    ) as deduped
                    GROUP BY institution_id
                ", [
                    'year_id' => $academicYearId,
                    'inst_ids' => '{' . implode(',', $institutionIds) . '}',
                ]);

                $statsMap = collect($batchStats)->keyBy(fn ($item) => (int) $item->institution_id);

                $institutions->getCollection()->transform(function ($institution) use ($statsMap) {
                    $stats = $statsMap->get((int) $institution->id);
                    if ($stats) {
                        // Correct teaching load hours = inflated_plan - raw_vacancy
                        $inflatedMain = (float) $institution->curriculum_main_hours;
                        $inflatedTotal = (float) $institution->curriculum_total_hours;
                        $inflatedClub = (float) $institution->curriculum_club_hours;

                        $rawMainVacancy = (float) ($institution->curriculum_main_vacancies ?? 0);
                        $rawTotalVacancy = (float) ($institution->curriculum_vacancies ?? 0);
                        $rawClubVacancy = (float) ($institution->curriculum_club_vacancies ?? 0);

                        $mainLoad = $inflatedMain - $rawMainVacancy;
                        $totalLoad = $inflatedTotal - $rawTotalVacancy;
                        $clubLoad = $inflatedClub - $rawClubVacancy;

                        // Apply correct deduplicated plan hours
                        $correctMain = (float) $stats->main_hours;
                        $correctTotal = (float) $stats->total_hours;
                        $correctClub = (float) $stats->club_hours;

                        $institution->curriculum_main_hours = $correctMain;
                        $institution->curriculum_total_hours = $correctTotal;
                        $institution->curriculum_club_hours = $correctClub;
                        $institution->curriculum_main_vacancies = max(0.0, $correctMain - $mainLoad);
                        $institution->curriculum_vacancies = max(0.0, $correctTotal - $totalLoad);
                        $institution->curriculum_club_vacancies = max(0.0, $correctClub - $clubLoad);
                    }

                    return $institution;
                });
            }
        }

        return response()->json($institutions);
    }

    /**
     * Search institutions by name or code.
     */
    public function search(string $query): JsonResponse
    {
        $user = Auth::user();
        $baseQuery = Institution::query()
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('institution_code', 'like', "%{$query}%")
                    ->orWhere('short_name', 'like', "%{$query}%");
            });

        $this->applyAccessControl($baseQuery, $user);

        $results = $baseQuery->limit(20)
            ->get(['id', 'name', 'institution_code', 'type']);

        return response()->json([
            'success' => true,
            'data' => $results
        ]);
    }

    /**
     * Store a newly created institution in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Check permissions
        if (! $user->hasRole('superadmin') && ! $user->hasRole('regionadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'User does not have the right permissions.',
            ], 403);
        }

        // RegionAdmin can only create institutions under their region
        if ($user->hasRole('regionadmin')) {
            $parentId = $request->input('parent_id');
            $userInstitution = $user->institution;

            if (! $userInstitution || $userInstitution->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'RegionAdmin must be associated with a regional institution.',
                ], 403);
            }

            // Parent must be either their region or a sector under their region
            if ($parentId && $parentId !== $userInstitution->id) {
                $parentInstitution = Institution::find($parentId);
                if (! $parentInstitution || $parentInstitution->parent_id !== $userInstitution->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'RegionAdmin can only create institutions under their own region.',
                    ], 403);
                }
            }
        }

        // Dynamic validation rules - parent_id required for levels > 1
        $level = $request->input('level', 1);
        $parentIdRule = $level > 1 ? 'required|exists:institutions,id' : 'nullable|exists:institutions,id';

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'type' => 'required|string|max:50',
            'institution_code' => 'required|string|max:50|unique:institutions',
            'parent_id' => $parentIdRule,
            'level' => 'required|integer|min:1',
            'region_code' => 'required|string|max:50',
            'contact_info' => 'nullable|array',
            'location' => 'nullable|array',
            'metadata' => 'nullable|array',
            'is_active' => 'boolean',
            'established_date' => 'nullable|date',
        ]);

        $institution = Institution::create($validated);

        return response()->json($institution, 201);
    }

    /**
     * Display the specified institution.
     */
    public function show(Institution $institution): JsonResponse
    {
        return response()->json($institution);
    }

    /**
     * Update the specified institution in storage.
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        $user = Auth::user();

        // Check permissions
        if (! $user->hasRole('superadmin') && ! $user->hasRole('regionadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'User does not have the right permissions.',
            ], 403);
        }

        // RegionAdmin can only update institutions within their hierarchy
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;

            if (! $userInstitution || $userInstitution->level !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'RegionAdmin must be associated with a regional institution.',
                ], 403);
            }

            // Check if institution is within their hierarchy
            $canUpdate = $institution->id === $userInstitution->id || // Their own region
                        $institution->parent_id === $userInstitution->id || // Direct child (sector)
                        ($institution->parent && $institution->parent->parent_id === $userInstitution->id); // Grandchild (school under sector)

            if (! $canUpdate) {
                return response()->json([
                    'success' => false,
                    'message' => 'RegionAdmin can only update institutions within their region.',
                ], 403);
            }
        }

        // Dynamic validation rules - parent_id required for levels > 1
        $level = $request->input('level', $institution->level);
        $parentIdRule = $level > 1 ? 'required|exists:institutions,id' : 'nullable|exists:institutions,id';

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'type' => 'sometimes|required|string|max:50',
            'institution_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('institutions')->ignore($institution->id),
            ],
            'parent_id' => $parentIdRule,
            'level' => 'sometimes|required|integer|min:1',
            'region_code' => 'sometimes|required|string|max:50',
            'contact_info' => 'nullable|array',
            'location' => 'nullable|array',
            'metadata' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'established_date' => 'nullable|date',
        ]);

        $institution->update($validated);

        return response()->json($institution);
    }

    /**
     * Get delete impact summary for institution
     */
    public function getDeleteImpact($id): JsonResponse
    {
        $user = Auth::user();

        // Check permissions
        if (! $user->hasRole('superadmin') && ! $user->hasRole('regionadmin') && ! $user->hasRole('sektoradmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        try {
            // Find institution including soft deleted ones
            $institution = Institution::withTrashed()->findOrFail($id);

            // Ensure we have a single model instance, not a collection
            if ($institution instanceof \Illuminate\Database\Eloquent\Collection) {
                $institution = $institution->first();
            }

            if (! $institution) {
                return response()->json([
                    'success' => false,
                    'message' => 'Müəssisə tapılmadı.',
                ], 404);
            }

            // Verify the method exists before calling it
            if (! method_exists($institution, 'getDeleteImpactSummary')) {
                \Log::error('getDeleteImpactSummary method not found on Institution model', [
                    'institution_id' => $id,
                    'institution_class' => get_class($institution),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Sistem xətası: Metodun mövcud olmadığı müəyyən edildi.',
                ], 500);
            }

            $impactSummary = $institution->getDeleteImpactSummary();

            return response()->json([
                'success' => true,
                'data' => $impactSummary,
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Delete impact calculation failed', [
                'institution_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Məlumat toplanarkən xəta baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get delete operation progress
     */
    public function getDeleteProgress(Request $request, $operationId): JsonResponse
    {
        $progressService = new InstitutionDeleteProgressService;
        $progress = $progressService->getProgress($operationId);

        if (! $progress) {
            return response()->json([
                'success' => false,
                'message' => 'Progress not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $progress,
        ]);
    }

    /**
     * Remove the specified institution from storage.
     */
    public function destroy(InstitutionDeleteRequest $request, $id): JsonResponse
    {
        \Log::info("🚀 DELETE request received for Institution ID: {$id}", [
            'request_data' => $request->all(),
            'user_id' => auth()->id(),
            'ip' => $request->ip(),
        ]);

        $user = Auth::user();
        $progressService = new InstitutionDeleteProgressService;

        // Find institution including soft deleted ones
        $institution = Institution::withTrashed()->findOrFail($id);
        $operationId = InstitutionDeleteProgressService::generateOperationId();

        \Log::info("Deletion process initiated for Institution ID: {$institution->id} ('{$institution->name}') by User ID: {$user->id} ('{$user->name}').");

        // Initialize progress tracking
        $progressService->initializeProgress($operationId, [
            'institution_id' => $institution->id,
            'institution_name' => $institution->name,
            'delete_type' => $request->input('type', 'soft'),
            'user_id' => $user->id,
            'children_count' => $institution->children()->withTrashed()->count(),
            'users_count' => $institution->users()->count(),
        ]);

        $progressService->updateProgress($operationId, 10, 'İcazələr yoxlanılır...');

        // Check permissions - align with frontend UI permissions
        if (! $user->hasRole('superadmin') && ! $user->hasRole('regionadmin') && ! $user->hasRole('sektoradmin')) {
            \Log::warning("Permission denied for User ID: {$user->id} attempting to delete Institution ID: {$institution->id}. Required roles: superadmin, regionadmin, or sektoradmin.");
            $progressService->failProgress($operationId, 'Bu əməliyyat üçün icazəniz yoxdur.');

            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
                'operation_id' => $operationId,
            ], 403);
        }

        // RegionAdmin permission checks
        if ($user->hasRole('regionadmin')) {
            $userInstitution = $user->institution;
            if (! $userInstitution || $userInstitution->level !== 2) {
                \Log::warning("RegionAdmin (User ID: {$user->id}) permission failed: Not associated with a regional institution.");

                return response()->json(['success' => false, 'message' => 'RegionAdmin regional müəssisə ilə əlaqələndirilməlidir.'], 403);
            }
            $canDelete = $institution->parent_id === $userInstitution->id || ($institution->parent_id && Institution::withTrashed()->where('id', $institution->parent_id)->where('parent_id', $userInstitution->id)->exists());
            if (! $canDelete || $institution->level < 3) {
                \Log::warning("RegionAdmin (User ID: {$user->id}) permission failed: Attempted to delete institution ({$institution->id}) outside of their hierarchy.");

                return response()->json(['success' => false, 'message' => 'RegionAdmin yalnız öz regionu altındakı müəssisələri silə bilər.'], 403);
            }
        }

        // SektorAdmin permission checks
        if ($user->hasRole('sektoradmin')) {
            $userInstitution = $user->institution;
            if (! $userInstitution || $userInstitution->level !== 3) {
                \Log::warning("SektorAdmin (User ID: {$user->id}) permission failed: Not associated with a sector institution.");

                return response()->json(['success' => false, 'message' => 'SektorAdmin sektor müəssisəsi ilə əlaqələndirilməlidir.'], 403);
            }
            if ($institution->parent_id !== $userInstitution->id || $institution->level !== 4) {
                \Log::warning("SektorAdmin (User ID: {$user->id}) permission failed: Attempted to delete institution ({$institution->id}) outside of their hierarchy.");

                return response()->json(['success' => false, 'message' => 'SektorAdmin yalnız öz sektoru altındakı məktəbləri silə bilər.'], 403);
            }
        }

        $deleteType = $request->input('type', 'soft');
        \Log::info("Delete type specified: '{$deleteType}' for Institution ID: {$institution->id}.");

        $progressService->updateProgress($operationId, 20, 'Silmə növü təsdiq edilir...');

        if (! in_array($deleteType, ['soft', 'hard'])) {
            \Log::error("Invalid delete type '{$deleteType}' requested for Institution ID: {$institution->id}.");
            $progressService->failProgress($operationId, 'Yanlış silmə növü. "soft" və ya "hard" olmalıdır.');

            return response()->json([
                'success' => false,
                'message' => 'Yanlış silmə növü. "soft" və ya "hard" olmalıdır.',
                'operation_id' => $operationId,
            ], 422);
        }

        // Check if institution has users (prevent soft delete if users exist)
        if ($deleteType === 'soft') {
            $userCount = $institution->users()->count();
            if ($userCount > 0) {
                \Log::warning("Soft delete aborted for Institution ID: {$institution->id}. Reason: Institution has {$userCount} associated users.");

                return response()->json([
                    'success' => false,
                    'message' => "İstifadəçiləri ({$userCount} nəfər) olan müəssisə arxivə köçürülə bilməz. Əvvəlcə istifadəçiləri köçürün.",
                ], 422);
            }
        }

        try {
            if ($deleteType === 'soft') {
                $progressService->updateProgress($operationId, 50, 'Arxivə köçürülür...');

                \Log::info("Executing soft delete for Institution ID: {$institution->id}.");
                $institution->delete();
                $message = 'Müəssisə arxivə köçürüldü və lazım olduqda bərpa edilə bilər.';
                \Log::info("Soft delete successful for Institution ID: {$institution->id}.");

                $progressService->completeProgress($operationId, [
                    'message' => $message,
                    'delete_type' => $deleteType,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'delete_type' => $deleteType,
                    'operation_id' => $operationId,
                ], 200);
            }
            $progressService->updateProgress($operationId, 40, 'Həmişəlik silmə başlanılır...');

            \Log::info("Executing hard delete for Institution ID: {$institution->id}. Calling hardDeleteWithRelationships method.");

            // Pass progress service to hard delete method
            $deletedData = $institution->hardDeleteWithRelationships($progressService, $operationId);
            \Log::info("Hard delete completed for Institution ID: {$institution->id}.", ['details' => $deletedData]);

            $childrenCount = isset($deletedData['children_deleted']) ? count($deletedData['children_deleted']) : 0;
            $detailMessage = $childrenCount > 0 ? ' (Rekursiv silmə - alt müəssisələr də daxil olmaqla)' : '';
            $message = 'Müəssisə və bütün əlaqəli məlumatlar həmişəlik silindi.' . $detailMessage;

            $progressService->completeProgress($operationId, [
                'message' => $message,
                'delete_type' => $deleteType,
                'deleted_data' => $deletedData,
            ]);

            return response()->json([
                'success' => true,
                'message' => $message,
                'delete_type' => $deleteType,
                'deleted_data' => $deletedData,
                'operation_id' => $operationId,
            ], 200);
        } catch (\Exception $e) {
            \Log::error("An exception occurred during the '{$deleteType}' deletion of Institution ID: {$institution->id}.", [
                'error_message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $progressService->failProgress($operationId, 'Müəssisə silinərkən xəta baş verdi: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Müəssisə silinərkən xəta baş verdi: ' . $e->getMessage(),
                'operation_id' => $operationId,
            ], 500);
        }
    }

    /**
     * Apply role-based access control to institution queries
     */
    private function applyAccessControl($query, $user): void
    {
        $institutionId = $user->institution_id;

        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can see their own region and child institutions
            if ($institutionId) {
                $query->where(function ($q) use ($institutionId) {
                    // Their own regional institution
                    $q->where('id', $institutionId)
                      // Or their child institutions (sectors and schools)
                        ->orWhere('parent_id', $institutionId)
                      // Or grandchild institutions (schools under sectors)
                        ->orWhereIn('parent_id', function ($subQuery) use ($institutionId) {
                            $subQuery->select('id')
                                ->from('institutions')
                                ->where('parent_id', $institutionId);
                        });
                });
            } else {
                $query->whereRaw('1 = 0'); // Fail-safe: no ID, no results
            }
        } elseif ($user->hasRole('regionoperator')) {
            // RegionOperator: region comes from user's institution or, as fallback, from their department's institution
            if (! $institutionId && $user->department) {
                $institutionId = $user->department->institution_id;
            }

            if ($institutionId) {
                $query->where(function ($q) use ($institutionId) {
                    $q->where('id', $institutionId)
                        ->orWhere('parent_id', $institutionId)
                        ->orWhereIn('parent_id', function ($subQuery) use ($institutionId) {
                            $subQuery->select('id')
                                ->from('institutions')
                                ->where('parent_id', $institutionId);
                        });
                });
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user->hasRole('sektoradmin')) {
            // SectorAdmin can see their own sector and child institutions (schools)
            if ($institutionId) {
                $query->where(function ($q) use ($institutionId) {
                    $q->where('id', $institutionId)
                        ->orWhere('parent_id', $institutionId)
                        ->orWhereIn('parent_id', function ($subQuery) use ($institutionId) {
                            $subQuery->select('id')
                                ->from('institutions')
                                ->where('parent_id', $institutionId);
                        });
                });
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user->hasRole('schooladmin')) {
            // SchoolAdmin can only see their own school
            if ($institutionId) {
                $query->where('id', $institutionId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }
        // SuperAdmin sees all institutions (no additional filtering)
    }
}
