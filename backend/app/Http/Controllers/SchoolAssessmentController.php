<?php

namespace App\Http\Controllers;

use App\Exports\SchoolAssessmentExport;
use App\Models\AssessmentStage;
use App\Models\AssessmentType;
use App\Models\ClassAssessmentResult;
use App\Models\Institution;
use App\Models\SchoolAssessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;

class SchoolAssessmentController extends Controller
{
    /**
     * List school assessments accessible to the user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $query = SchoolAssessment::with(['assessmentType', 'stage', 'institution'])
            ->orderBy('created_at', 'desc');

        if ($user->hasRole('superadmin')) {
            // SuperAdmin sees all
        } elseif ($user->hasRole('regionadmin')) {
            $regionId = $user->institution?->region_id;
            $query->whereHas('institution', function ($q) use ($regionId) {
                $q->where('region_id', $regionId);
            });
        } else {
            $query->forInstitution($user->institution_id);
        }

        if ($request->filled('assessment_type_id')) {
            $query->where('assessment_type_id', $request->assessment_type_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->integer('per_page', 15);

        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage),
        ]);
    }

    /**
     * Create new school assessment session.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['superadmin', 'regionadmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'assessment_stage_id' => 'required|exists:assessment_stages,id',
            'institution_id' => $user->hasRole('regionadmin') ? 'required|exists:institutions,id' : 'nullable|exists:institutions,id',
            'scheduled_date' => 'nullable|date',
            'subjects' => 'nullable|array',
            'subjects.*' => 'string|max:100',
            'grade_levels' => 'nullable|array',
            'grade_levels.*' => 'string|max:20',
            'notes' => 'nullable|string|max:1000',
            'total_students' => 'nullable|integer|min:0',
            'participants_count' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        /** @var AssessmentType $assessmentType */
        $assessmentType = AssessmentType::findOrFail($data['assessment_type_id']);
        /** @var AssessmentStage $stage */
        $stage = AssessmentStage::findOrFail($data['assessment_stage_id']);

        if ($stage->assessment_type_id !== $assessmentType->id) {
            return response()->json([
                'success' => false,
                'message' => 'Seçilmiş mərhələ bu qiymətləndirmə növünə aid deyil'
            ], 422);
        }

        $institutionId = $user->institution_id;
        if ($user->hasRole('superadmin') && isset($data['institution_id'])) {
            $institutionId = (int) $data['institution_id'];
        }

        if ($user->hasRole('regionadmin')) {
            $institutionId = (int) ($data['institution_id'] ?? 0);
            $regionId = $user->institution?->region_id;

            if (!$institutionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Təşkilat seçilməlidir'
                ], 422);
            }

            $isAccessibleInstitution = Institution::where('id', $institutionId)
                ->where('region_id', $regionId)
                ->exists();

            if (!$isAccessibleInstitution) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilmiş təşkilat regionunuza aid deyil'
                ], 403);
            }

            if ($assessmentType->institution_id !== null && $assessmentType->institution_id !== $institutionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu qiymətləndirmə növü yalnız konkret təşkilat üçün nəzərdə tutulub'
                ], 403);
            }
        }

        if (!$institutionId) {
            return response()->json([
                'success' => false,
                'message' => 'Müəssisə müəyyən edilməlidir'
            ], 422);
        }

        // Check if assessment type is available for this institution
        // Priority: 1) Owned by institution, 2) Assigned to institution, 3) Global type
        $isOwnedByInstitution = $assessmentType->institution_id === $institutionId;
        $isAssigned = $assessmentType->isAssignedToInstitution($institutionId);
        $isGlobal = $assessmentType->institution_id === null;

        if (!$isOwnedByInstitution && !$isAssigned && !$isGlobal) {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə növü təşkilatınıza təyin edilməyib'
            ], 403);
        }

        // If type is owned by another institution and not assigned, deny access
        if ($assessmentType->institution_id !== null && $assessmentType->institution_id !== $institutionId && !$isAssigned) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növü üçün icazəniz yoxdur'
            ], 403);
        }

        // Auto-generate title from assessment type and stage
        $generatedTitle = $assessmentType->name . ' - ' . $stage->name;

        $schoolAssessment = SchoolAssessment::create([
            'assessment_type_id' => $assessmentType->id,
            'assessment_stage_id' => $stage->id,
            'institution_id' => $institutionId,
            'created_by' => $user->id,
            'scheduled_date' => $data['scheduled_date'] ?? null,
            'title' => $generatedTitle,
            'subjects' => $data['subjects'],
            'grade_levels' => $data['grade_levels'],
            'notes' => $data['notes'] ?? null,
            'total_students' => $data['total_students'] ?? null,
            'participants_count' => $data['participants_count'] ?? null,
            'status' => SchoolAssessment::STATUS_DRAFT,
        ]);

        $schoolAssessment->load(['assessmentType', 'stage']);

        return response()->json([
            'success' => true,
            'data' => $schoolAssessment,
            'message' => 'Qiymətləndirmə sessiyası yaradıldı'
        ], 201);
    }

    /**
     * Show session details including result fields.
     */
    public function show(SchoolAssessment $schoolAssessment): JsonResponse
    {
        $user = Auth::user();
        if (!$this->canAccessSchoolAssessment($user, $schoolAssessment)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirməyə giriş icazəniz yoxdur'
            ], 403);
        }

        $schoolAssessment->load(['assessmentType.resultFields', 'stage', 'classResults']);

        return response()->json([
            'success' => true,
            'data' => $schoolAssessment,
        ]);
    }

    /**
     * Store class level results.
     */
    public function storeClassResults(Request $request, SchoolAssessment $schoolAssessment): JsonResponse
    {
        $user = Auth::user();
        if (!$this->canAccessSchoolAssessment($user, $schoolAssessment, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə üçün nəticə daxil etmək icazəniz yoxdur'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'class_label' => 'required|string|max:50',
            'grade_level' => 'nullable|string|max:20',
            'subject' => 'nullable|string|max:100',
            'student_count' => 'nullable|integer|min:0',
            'participant_count' => 'nullable|integer|min:0',
            'results' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        $resultFields = $schoolAssessment->assessmentType->resultFields;

        $metadata = [];
        foreach ($resultFields as $field) {
            if (!array_key_exists($field->field_key, $data['results'])) {
                if ($field->is_required) {
                    return response()->json([
                        'success' => false,
                        'message' => "{$field->label} dəyəri tələb olunur"
                    ], 422);
                }
                continue;
            }

            $value = $data['results'][$field->field_key];
            if ($field->input_type !== 'text' && !is_numeric($value)) {
                return response()->json([
                    'success' => false,
                    'message' => "{$field->label} üçün rəqəm daxil edilməlidir"
                ], 422);
            }

            $metadata[$field->field_key] = $value;
        }

        $classResult = ClassAssessmentResult::updateOrCreate(
            [
                'school_assessment_id' => $schoolAssessment->id,
                'class_label' => $data['class_label'],
                'subject' => $data['subject'] ?? null,
            ],
            [
                'grade_level' => $data['grade_level'] ?? null,
                'student_count' => $data['student_count'] ?? null,
                'participant_count' => $data['participant_count'] ?? null,
                'metadata' => $metadata,
                'recorded_by' => $user->id,
                'recorded_at' => now(),
            ]
        );

        if ($schoolAssessment->status === SchoolAssessment::STATUS_DRAFT) {
            $schoolAssessment->update(['status' => SchoolAssessment::STATUS_IN_PROGRESS]);
        }

        $classResult->load('schoolAssessment');

        return response()->json([
            'success' => true,
            'data' => $classResult,
            'message' => 'Sinif nəticəsi saxlanıldı'
        ]);
    }

    /**
     * Mark assessment as completed.
     */
    public function complete(SchoolAssessment $schoolAssessment): JsonResponse
    {
        $user = Auth::user();
        if (!$this->canAccessSchoolAssessment($user, $schoolAssessment, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirməni tamamlamağa icazəniz yoxdur'
            ], 403);
        }

        $schoolAssessment->update(['status' => SchoolAssessment::STATUS_COMPLETED]);

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə tamamlandı'
        ]);
    }

    /**
     * Delete a class result.
     */
    public function deleteClassResult(SchoolAssessment $schoolAssessment, ClassAssessmentResult $classResult): JsonResponse
    {
        $user = Auth::user();

        // Check if user has access to this assessment
        if (!$this->canAccessSchoolAssessment($user, $schoolAssessment, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu nəticəni silməyə icazəniz yoxdur'
            ], 403);
        }

        // Verify the class result belongs to this assessment
        if ($classResult->school_assessment_id !== $schoolAssessment->id) {
            return response()->json([
                'success' => false,
                'message' => 'Nəticə bu qiymətləndirməyə aid deyil'
            ], 404);
        }

        // Only allow creator or admins to delete
        if (!$user->hasRole(['superadmin', 'regionadmin']) && $classResult->recorded_by !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız nəticəni daxil edən istifadəçi silə bilər'
            ], 403);
        }

        $classResult->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nəticə silindi'
        ]);
    }

    /**
     * Export assessment results to Excel.
     */
    public function export(SchoolAssessment $schoolAssessment)
    {
        $user = Auth::user();

        if (!$this->canAccessSchoolAssessment($user, $schoolAssessment)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirməyə giriş icazəniz yoxdur'
            ], 403);
        }

        $schoolAssessment->load(['assessmentType', 'stage', 'institution', 'classResults.recorder']);

        $fileName = sprintf(
            '%s_%s_%s.xlsx',
            $schoolAssessment->assessmentType->name ?? 'Qiymetlendirme',
            $schoolAssessment->stage->name ?? 'Merhele',
            now()->format('d_m_Y')
        );

        // Sanitize filename
        $fileName = preg_replace('/[^A-Za-z0-9_\-.]/', '_', $fileName);

        return Excel::download(new SchoolAssessmentExport($schoolAssessment), $fileName);
    }

    private function canAccessSchoolAssessment($user, SchoolAssessment $schoolAssessment, bool $edit = false): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            $regionId = $user->institution?->region_id;
            return $schoolAssessment->institution?->region_id === $regionId;
        }

        if ($user->hasRole('schooladmin')) {
            if ($schoolAssessment->institution_id !== $user->institution_id) {
                return false;
            }

            if ($edit) {
                return $schoolAssessment->created_by === $user->id || $schoolAssessment->status !== SchoolAssessment::STATUS_SUBMITTED;
            }

            return true;
        }

        return false;
    }
}
