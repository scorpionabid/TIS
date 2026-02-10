<?php

namespace App\Http\Controllers;

use App\Models\AcademicYearTransition;
use App\Services\AcademicYearTransitionService;
use App\Services\GradeTransitionService;
use App\Services\StudentPromotionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AcademicYearTransitionController extends Controller
{
    public function __construct(
        private AcademicYearTransitionService $transitionService,
        private GradeTransitionService $gradeTransitionService,
        private StudentPromotionService $studentPromotionService
    ) {}

    /**
     * Preview transition without executing.
     */
    public function preview(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'source_academic_year_id' => 'required|exists:academic_years,id',
                'target_academic_year_id' => 'required|exists:academic_years,id|different:source_academic_year_id',
                'institution_id' => 'required|exists:institutions,id',
                'options' => 'array',
            ]);

            // Check user has access to institution
            $this->authorizeInstitutionAccess($request->user(), $validated['institution_id']);

            $preview = $this->transitionService->previewTransition(
                $validated['source_academic_year_id'],
                $validated['target_academic_year_id'],
                $validated['institution_id'],
                $validated['options'] ?? []
            );

            return response()->json([
                'success' => true,
                'data' => $preview,
                'message' => 'Keçid nəzərdən keçirildi',
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nəzərdən keçirmə xətası: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Initiate the transition.
     */
    public function initiate(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'source_academic_year_id' => 'required|exists:academic_years,id',
                'target_academic_year_id' => 'required|exists:academic_years,id|different:source_academic_year_id',
                'institution_id' => 'required|exists:institutions,id',
                'options' => 'array',
                'options.copy_subjects' => 'boolean',
                'options.copy_teachers' => 'boolean',
                'options.promote_students' => 'boolean',
                'options.copy_homeroom_teachers' => 'boolean',
                'options.copy_subject_teachers' => 'boolean',
                'options.copy_teaching_loads' => 'boolean',
                'options.exclude_student_ids' => 'array',
                'options.exclude_student_ids.*' => 'integer|exists:users,id',
                'options.retain_student_ids' => 'array',
                'options.retain_student_ids.*' => 'integer|exists:users,id',
            ]);

            // Check user has access to institution
            $this->authorizeInstitutionAccess($request->user(), $validated['institution_id']);

            $transition = $this->transitionService->initiateTransition(
                $validated['source_academic_year_id'],
                $validated['target_academic_year_id'],
                $validated['institution_id'],
                $request->user(),
                $validated['options'] ?? []
            );

            return response()->json([
                'success' => true,
                'data' => $this->transitionService->getTransitionStatus($transition),
                'message' => 'Keçid uğurla tamamlandı',
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Keçid xətası: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get transition details.
     */
    public function show(AcademicYearTransition $transition): JsonResponse
    {
        try {
            // Check user has access
            $this->authorizeInstitutionAccess(request()->user(), $transition->institution_id);

            return response()->json([
                'success' => true,
                'data' => $this->transitionService->getTransitionStatus($transition),
                'message' => 'Keçid məlumatları alındı',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * Get transition progress (for polling).
     */
    public function progress(AcademicYearTransition $transition): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $transition->id,
                'status' => $transition->status,
                'progress_percentage' => $transition->progress_percentage,
                'current_step' => $transition->current_step,
            ],
        ]);
    }

    /**
     * Get detailed transition breakdown.
     */
    public function details(AcademicYearTransition $transition, Request $request): JsonResponse
    {
        try {
            $this->authorizeInstitutionAccess($request->user(), $transition->institution_id);

            $perPage = $request->get('per_page', 50);
            $entityType = $request->get('entity_type');
            $action = $request->get('action');

            $query = $transition->details();

            if ($entityType) {
                $query->where('entity_type', $entityType);
            }

            if ($action) {
                $query->where('action', $action);
            }

            $details = $query->orderByDesc('id')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $details->items(),
                'meta' => [
                    'current_page' => $details->currentPage(),
                    'last_page' => $details->lastPage(),
                    'per_page' => $details->perPage(),
                    'total' => $details->total(),
                ],
                'summary' => $transition->getSummary(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * Rollback a transition.
     */
    public function rollback(AcademicYearTransition $transition): JsonResponse
    {
        try {
            $this->authorizeInstitutionAccess(request()->user(), $transition->institution_id);

            if (! $transition->canBeRolledBack()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu keçid geri qaytarıla bilməz. Rollback müddəti bitmiş ola bilər.',
                ], 400);
            }

            $this->transitionService->rollbackTransition($transition);

            return response()->json([
                'success' => true,
                'message' => 'Keçid uğurla geri qaytarıldı',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Geri qaytarma xətası: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get transition history for an institution.
     */
    public function history(int $institutionId, Request $request): JsonResponse
    {
        try {
            $this->authorizeInstitutionAccess($request->user(), $institutionId);

            $perPage = $request->get('per_page', 15);
            $history = $this->transitionService->getTransitionHistory($institutionId, $perPage);

            return response()->json([
                'success' => true,
                'data' => $history->items(),
                'meta' => [
                    'current_page' => $history->currentPage(),
                    'last_page' => $history->lastPage(),
                    'per_page' => $history->perPage(),
                    'total' => $history->total(),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * Get students for promotion preview.
     */
    public function studentsPreview(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'source_academic_year_id' => 'required|exists:academic_years,id',
                'institution_id' => 'required|exists:institutions,id',
                'grade_id' => 'nullable|exists:grades,id',
            ]);

            $this->authorizeInstitutionAccess($request->user(), $validated['institution_id']);

            $students = $this->studentPromotionService->getStudentsForPreview(
                $validated['source_academic_year_id'],
                $validated['institution_id'],
                $validated['grade_id'] ?? null
            );

            return response()->json([
                'success' => true,
                'data' => $students,
                'count' => $students->count(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get grades for transition preview.
     */
    public function gradesPreview(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'source_academic_year_id' => 'required|exists:academic_years,id',
                'target_academic_year_id' => 'required|exists:academic_years,id',
                'institution_id' => 'required|exists:institutions,id',
            ]);

            $this->authorizeInstitutionAccess($request->user(), $validated['institution_id']);

            $preview = $this->gradeTransitionService->previewGradeTransition(
                $validated['source_academic_year_id'],
                $validated['target_academic_year_id'],
                $validated['institution_id']
            );

            return response()->json([
                'success' => true,
                'data' => $preview,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if user has access to institution.
     */
    private function authorizeInstitutionAccess($user, int $institutionId): void
    {
        if ($user->hasRole('superadmin')) {
            return;
        }

        if ($user->hasRole('regionadmin')) {
            // Check if institution is in user's region
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->isAncestorOf($institutionId)) {
                return;
            }
        }

        if ($user->institution_id === $institutionId) {
            return;
        }

        throw new \Exception('Bu təşkilata giriş icazəniz yoxdur');
    }
}
