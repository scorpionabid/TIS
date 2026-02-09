<?php

namespace App\Http\Controllers;

use App\Http\Controllers\BaseController;
use App\Models\AssessmentStage;
use App\Models\AssessmentType;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AssessmentStageController extends BaseController
{
    /**
     * List stages for a given assessment type.
     */
    public function index(AssessmentType $assessmentType): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasPermissionTo('assessment-types.read')) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növünün mərhələlərinə baxmaq icazəniz yoxdur',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $assessmentType->stages()->get(),
        ]);
    }

    /**
     * Store a new stage for the assessment type.
     */
    public function store(Request $request, AssessmentType $assessmentType): JsonResponse
    {
        $user = Auth::user();
        if (! $this->canManageType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növü üçün mərhələ yaratmaq icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'roman_numeral' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:500',
            'display_order' => 'nullable|integer|min:1|max:100',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['assessment_type_id'] = $assessmentType->id;

        $stage = AssessmentStage::create($data);

        return response()->json([
            'success' => true,
            'data' => $stage,
            'message' => 'Mərhələ uğurla yaradıldı',
        ], 201);
    }

    /**
     * Update stage.
     */
    public function update(Request $request, AssessmentType $assessmentType, AssessmentStage $assessmentStage): JsonResponse
    {
        $user = Auth::user();
        if (! $this->canManageType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu mərhələni redaktə etmək icazəniz yoxdur',
            ], 403);
        }

        if ($assessmentStage->assessment_type_id !== $assessmentType->id) {
            return response()->json([
                'success' => false,
                'message' => 'Mərhələ bu qiymətləndirmə növünə aid deyil',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'roman_numeral' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:500',
            'display_order' => 'nullable|integer|min:1|max:100',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        $assessmentStage->update($validator->validated());

        return response()->json([
            'success' => true,
            'data' => $assessmentStage,
            'message' => 'Mərhələ uğurla yeniləndi',
        ]);
    }

    /**
     * Remove stage.
     */
    public function destroy(AssessmentType $assessmentType, AssessmentStage $assessmentStage): JsonResponse
    {
        $user = Auth::user();
        if (! $this->canManageType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu mərhələni silmək icazəniz yoxdur',
            ], 403);
        }

        if ($assessmentStage->assessment_type_id !== $assessmentType->id) {
            return response()->json([
                'success' => false,
                'message' => 'Mərhələ bu qiymətləndirmə növünə aid deyil',
            ], 400);
        }

        if ($assessmentStage->schoolAssessments()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Bu mərhələ ilə bağlı qiymətləndirmələr mövcuddur, silinə bilməz',
            ], 409);
        }

        $assessmentStage->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mərhələ uğurla silindi',
        ]);
    }

    private function canManageType(User $user, AssessmentType $assessmentType): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            // Region admin can manage global types
            if ($assessmentType->institution_id === null) {
                return true;
            }
            
            // Region admin can manage types created for their region
            if ($assessmentType->institution_id && $assessmentType->institution?->region_id === $user->institution?->region_id) {
                return true;
            }

            // ...or any type explicitly assigned to their institution
            if ($user->institution_id && $assessmentType->assignedInstitutions()
                ->where('institutions.id', $user->institution_id)
                ->exists()) {
                return true;
            }

            // ...or any type assigned to institutions within their region
            if ($user->institution?->region_id && $assessmentType->assignedInstitutions()
                ->where('institutions.region_id', $user->institution->region_id)
                ->exists()) {
                return true;
            }

            return false;
        }

        if ($user->hasRole('schooladmin')) {
            if ($user->institution_id === null) {
                return false;
            }

            return $assessmentType->institution_id === $user->institution_id ||
                $assessmentType->assignedInstitutions()
                    ->where('institutions.id', $user->institution_id)
                    ->exists();
        }

        return false;
    }
}
