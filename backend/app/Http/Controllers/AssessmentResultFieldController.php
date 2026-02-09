<?php

namespace App\Http\Controllers;

use App\Models\AssessmentResultField;
use App\Models\AssessmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AssessmentResultFieldController extends BaseController
{
    public function index(AssessmentType $assessmentType): JsonResponse
    {
        $user = Auth::user();
        if (! $this->canManageType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növü üçün nəticə sahələrinə baxmaq icazəniz yoxdur',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $assessmentType->resultFields()->get(),
        ]);
    }

    public function store(Request $request, AssessmentType $assessmentType): JsonResponse
    {
        $user = Auth::user();
        if (! $this->canManageType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növü üçün nəticə sahəsi yaratmaq icazəniz yoxdur',
            ], 403);
        }

        $validator = $this->validator($request, $assessmentType);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['assessment_type_id'] = $assessmentType->id;

        if (empty($data['field_key'])) {
            $data['field_key'] = Str::slug($data['label'], '_');
        }

        $field = AssessmentResultField::create($data);

        return response()->json([
            'success' => true,
            'data' => $field,
            'message' => 'Nəticə sahəsi uğurla yaradıldı',
        ], 201);
    }

    public function update(Request $request, AssessmentType $assessmentType, AssessmentResultField $assessmentResultField): JsonResponse
    {
        $user = Auth::user();
        if (! $this->canManageType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu nəticə sahəsini redaktə etmək icazəniz yoxdur',
            ], 403);
        }

        if ($assessmentResultField->assessment_type_id !== $assessmentType->id) {
            return response()->json([
                'success' => false,
                'message' => 'Nəticə sahəsi bu qiymətləndirmə növünə aid deyil',
            ], 400);
        }

        $validator = $this->validator($request, $assessmentType, $assessmentResultField->id);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if (isset($data['field_key']) && empty($data['field_key'])) {
            $data['field_key'] = Str::slug($data['label'], '_');
        }

        $assessmentResultField->update($data);

        return response()->json([
            'success' => true,
            'data' => $assessmentResultField,
            'message' => 'Nəticə sahəsi uğurla yeniləndi',
        ]);
    }

    public function destroy(AssessmentType $assessmentType, AssessmentResultField $assessmentResultField): JsonResponse
    {
        $user = Auth::user();
        if (! $this->canManageType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu nəticə sahəsini silmək icazəniz yoxdur',
            ], 403);
        }

        if ($assessmentResultField->assessment_type_id !== $assessmentType->id) {
            return response()->json([
                'success' => false,
                'message' => 'Nəticə sahəsi bu qiymətləndirmə növünə aid deyil',
            ], 400);
        }

        if ($assessmentType->schoolAssessments()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sahə ilə bağlı qiymətləndirmələr mövcuddur, silinə bilməz',
            ], 409);
        }

        $assessmentResultField->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nəticə sahəsi uğurla silindi',
        ]);
    }

    private function validator(Request $request, AssessmentType $assessmentType, ?int $fieldId = null)
    {
        $rules = [
            'label' => 'required|string|max:255',
            'field_key' => 'nullable|string|max:255',
            'input_type' => 'required|in:number,decimal,text',
            'scope' => 'required|in:class,overall',
            'aggregation' => 'required|in:sum,average,max,min',
            'is_required' => 'boolean',
            'options' => 'nullable|array',
            'display_order' => 'nullable|integer|min:1|max:100',
        ];

        $uniqueRule = 'unique:assessment_result_fields,field_key';
        if ($fieldId) {
            $uniqueRule .= ',' . $fieldId;
        }
        $uniqueRule .= ',field_key,' . $assessmentType->id . ',id';

        $rules['field_key'] .= '|' . $uniqueRule;

        return Validator::make($request->all(), $rules);
    }

    private function canManageType($user, AssessmentType $assessmentType): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            // Region admin can manage global types
            if ($assessmentType->institution_id === null) {
                return true;
            }

            return $assessmentType->institution?->region_id === $user->institution?->region_id;
        }

        return false;
    }
}
