<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\BaseController;
use App\Http\Requests\InstitutionDeleteRequest;
use App\Models\Institution;
use App\Services\InstitutionDeleteProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class InstitutionCRUDController extends BaseController
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

        // Paginate results
        $perPage = $request->input('per_page', 15);
        $institutions = $query->paginate($perPage);

        return response()->json($institutions);
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
        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can see their own region and child institutions
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $query->where(function ($q) use ($userInstitution) {
                    // Their own regional institution
                    $q->where('id', $userInstitution->id)
                      // Or their child institutions (sectors and schools)
                        ->orWhere('parent_id', $userInstitution->id)
                      // Or grandchild institutions (schools under sectors)
                        ->orWhereIn('parent_id', function ($subQuery) use ($userInstitution) {
                            $subQuery->select('id')
                                ->from('institutions')
                                ->where('parent_id', $userInstitution->id);
                        });
                });
            }
        } elseif ($user->hasRole('sektoradmin')) {
            // SectorAdmin can see their own sector and child schools
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3) {
                $query->where(function ($q) use ($userInstitution) {
                    $q->where('id', $userInstitution->id)
                        ->orWhere('parent_id', $userInstitution->id);
                });
            }
        } elseif ($user->hasRole('schooladmin')) {
            // SchoolAdmin can only see their own school
            $userInstitution = $user->institution;
            if ($userInstitution) {
                $query->where('id', $userInstitution->id);
            }
        }
        // SuperAdmin sees all institutions (no additional filtering)
    }
}
