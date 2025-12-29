<?php

namespace App\Http\Controllers\StaffRating;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\User;
use App\Services\StaffRating\DirectorManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * DirectorManagementController
 *
 * Manages director assignments to institutions
 * Accessible by: SuperAdmin, RegionAdmin, RegionOperator, SektorAdmin
 */
class DirectorManagementController extends Controller
{
    protected DirectorManagementService $directorService;

    public function __construct(DirectorManagementService $directorService)
    {
        $this->directorService = $directorService;
    }

    /**
     * Get all directors
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $regionId = $request->input('region_id');
            $sectorId = $request->input('sector_id');
            $search = $request->input('search');

            // Get directors based on user's scope
            $directors = $this->directorService->getAllDirectors($regionId, $sectorId);

            // Filter by search if provided
            if ($search) {
                $directors = array_filter($directors, function ($director) use ($search) {
                    return stripos($director['institution_name'], $search) !== false ||
                           stripos($director['director']['name'], $search) !== false;
                });
            }

            return response()->json([
                'directors' => array_values($directors),
                'total' => count($directors),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Direktorları yükləməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get director for specific institution
     *
     * @param Institution $institution
     * @return JsonResponse
     */
    public function show(Institution $institution): JsonResponse
    {
        try {
            $directorInfo = $this->directorService->getDirector($institution);

            if (!$directorInfo) {
                return response()->json([
                    'message' => 'Bu müəssisənin direktoru yoxdur',
                ], 404);
            }

            $directorUser = $this->directorService->getDirectorUser($institution);
            $history = $this->directorService->getDirectorHistory($institution);

            return response()->json([
                'director' => $directorInfo,
                'director_user' => $directorUser,
                'history' => $history,
                'institution' => $institution,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Direktor məlumatlarını yükləməkdə xəta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Assign director to institution
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'required|exists:institutions,id',
            'user_id' => 'required|exists:users,id',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $institution = Institution::findOrFail($request->institution_id);
            $user = User::findOrFail($request->user_id);

            $updatedInstitution = $this->directorService->assignDirector(
                $institution,
                $user,
                $request->notes
            );

            return response()->json([
                'message' => 'Direktor uğurla təyin edildi',
                'institution' => $updatedInstitution,
                'director' => $this->directorService->getDirector($updatedInstitution),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Direktor təyin edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update director information
     *
     * @param Request $request
     * @param Institution $institution
     * @return JsonResponse
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'notes' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $updatedInstitution = $this->directorService->updateDirector(
                $institution,
                $request->only(['notes', 'status'])
            );

            return response()->json([
                'message' => 'Direktor məlumatları yeniləndi',
                'institution' => $updatedInstitution,
                'director' => $this->directorService->getDirector($updatedInstitution),
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Yeniləmədə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove director from institution
     *
     * @param Request $request
     * @param Institution $institution
     * @return JsonResponse
     */
    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $updatedInstitution = $this->directorService->removeDirector(
                $institution,
                $request->reason
            );

            return response()->json([
                'message' => 'Direktor silindi',
                'institution' => $updatedInstitution,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Silinməkdə xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk assign directors
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkAssign(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'assignments' => 'required|array|min:1',
            'assignments.*.institution_id' => 'required|exists:institutions,id',
            'assignments.*.user_id' => 'required|exists:users,id',
            'assignments.*.notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->directorService->bulkAssignDirectors($request->assignments);

            return response()->json([
                'message' => "Kütləvi təyinat tamamlandı: {$result['success']} uğurlu, " . count($result['failed']) . " uğursuz",
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Kütləvi təyinatda xəta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
