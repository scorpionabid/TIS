<?php

namespace App\Http\Controllers;

use App\Models\AssessmentEntry;
use App\Models\AssessmentType;
use App\Models\Student;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AssessmentEntryController extends Controller
{
    /**
     * Display a listing of assessment entries
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Validate request parameters
        $validator = Validator::make($request->all(), [
            'assessment_type_id' => 'sometimes|exists:assessment_types,id',
            'institution_id' => 'sometimes|exists:institutions,id',
            'student_id' => 'sometimes|exists:students,id',
            'status' => 'sometimes|in:draft,submitted,approved,rejected',
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'grade_level' => 'sometimes|string|max:10',
            'subject' => 'sometimes|string|max:100',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        // Build query with access control
        $query = AssessmentEntry::with([
            'assessmentType',
            'student',
            'institution',
            'creator',
            'approver'
        ])->orderBy('created_at', 'desc');

        // Apply access control based on user role
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can see all entries
        } elseif ($user->hasRole('regionadmin')) {
            // RegionAdmin can see entries from their institution
            $query->where('institution_id', $user->institution_id);
        } else {
            // Other roles can only see their institution's entries
            $query->forInstitution($user->institution_id);
        }

        // Apply filters
        if ($request->filled('assessment_type_id')) {
            $query->byAssessmentType($request->assessment_type_id);
        }

        if ($request->filled('institution_id')) {
            $query->forInstitution($request->institution_id);
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        if ($request->filled('date_from')) {
            $endDate = $request->filled('date_to') ? $request->date_to : null;
            $query->byDateRange($request->date_from, $endDate);
        }

        if ($request->filled('grade_level')) {
            $query->byGradeLevel($request->grade_level);
        }

        if ($request->filled('subject')) {
            $query->where('subject', $request->subject);
        }

        $perPage = $request->get('per_page', 15);
        $assessmentEntries = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $assessmentEntries,
            'message' => 'Qiymətləndirmə qeydləri uğurla yükləndi'
        ]);
    }

    /**
     * Store new assessment entries (bulk operation)
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Check permissions
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur'
            ], 403);
        }

        // Validate request
        $validator = Validator::make($request->all(), [
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'institution_id' => 'required|exists:institutions,id',
            'assessment_date' => 'required|date',
            'grade_level' => 'nullable|string|max:10',
            'subject' => 'nullable|string|max:100',
            'entries' => 'required|array|min:1',
            'entries.*.student_id' => 'required|exists:students,id',
            'entries.*.score' => 'required|numeric|min:0',
            'entries.*.notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate assessment type access
        $assessmentType = AssessmentType::find($request->assessment_type_id);
        if (!$this->canAccessAssessmentType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növünə giriş icazəniz yoxdur'
            ], 403);
        }

        // Validate institution access
        $institution = Institution::find($request->institution_id);
        if (!$this->canAccessInstitution($user, $institution)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu təşkilata giriş icazəniz yoxdur'
            ], 403);
        }

        try {
            DB::beginTransaction();

            $createdEntries = [];
            $errors = [];

            foreach ($request->entries as $index => $entryData) {
                try {
                    // Validate score against assessment type max_score
                    if ($entryData['score'] > $assessmentType->max_score) {
                        $errors[] = "Şagird {$entryData['student_id']} üçün bal maksimum {$assessmentType->max_score} ola bilər";
                        continue;
                    }

                    // Validate student belongs to institution
                    $student = Student::where('id', $entryData['student_id'])
                        ->where('institution_id', $request->institution_id)
                        ->first();

                    if (!$student) {
                        $errors[] = "Şagird {$entryData['student_id']} bu təşkilata aid deyil";
                        continue;
                    }

                    // Check for existing entry
                    $existingEntry = AssessmentEntry::where([
                        'assessment_type_id' => $request->assessment_type_id,
                        'student_id' => $entryData['student_id'],
                        'assessment_date' => $request->assessment_date
                    ])->first();

                    if ($existingEntry) {
                        // Update existing entry if it's still a draft
                        if ($existingEntry->status === 'draft') {
                            $existingEntry->update([
                                'score' => $entryData['score'],
                                'notes' => $entryData['notes'] ?? null,
                                'grade_level' => $request->grade_level,
                                'subject' => $request->subject,
                            ]);
                            $createdEntries[] = $existingEntry;
                        } else {
                            $errors[] = "Şagird {$student->name} üçün bu tarixdə artıq qiymətləndirmə mövcuddur";
                        }
                        continue;
                    }

                    // Create new entry
                    $assessmentEntry = AssessmentEntry::create([
                        'assessment_type_id' => $request->assessment_type_id,
                        'student_id' => $entryData['student_id'],
                        'institution_id' => $request->institution_id,
                        'created_by' => $user->id,
                        'assessment_date' => $request->assessment_date,
                        'score' => $entryData['score'],
                        'grade_level' => $request->grade_level,
                        'subject' => $request->subject,
                        'notes' => $entryData['notes'] ?? null,
                        'status' => 'draft'
                    ]);

                    $createdEntries[] = $assessmentEntry;

                } catch (\Exception $e) {
                    $errors[] = "Şagird {$entryData['student_id']} üçün xəta: " . $e->getMessage();
                }
            }

            DB::commit();

            $response = [
                'success' => true,
                'data' => [
                    'created_count' => count($createdEntries),
                    'error_count' => count($errors),
                    'entries' => $createdEntries
                ],
                'message' => count($createdEntries) . ' qiymətləndirmə uğurla saxlanıldı'
            ];

            if (!empty($errors)) {
                $response['warnings'] = $errors;
            }

            return response()->json($response, 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmələr saxlanılarkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified assessment entry
     */
    public function show(AssessmentEntry $assessmentEntry): JsonResponse
    {
        $user = Auth::user();

        // Check if user can view this entry
        if (!$this->canAccessAssessmentEntry($user, $assessmentEntry)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə qeydinə giriş icazəniz yoxdur'
            ], 403);
        }

        $assessmentEntry->load([
            'assessmentType',
            'student',
            'institution',
            'creator',
            'approver'
        ]);

        return response()->json([
            'success' => true,
            'data' => $assessmentEntry,
            'message' => 'Qiymətləndirmə qeydi məlumatları'
        ]);
    }

    /**
     * Update the specified assessment entry
     */
    public function update(Request $request, AssessmentEntry $assessmentEntry): JsonResponse
    {
        $user = Auth::user();

        // Check if user can edit this entry
        if (!$assessmentEntry->canBeEditedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə qeydini redaktə etmək icazəniz yoxdur'
            ], 403);
        }

        // Validate request
        $validator = Validator::make($request->all(), [
            'score' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'grade_level' => 'nullable|string|max:10',
            'subject' => 'nullable|string|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate score against assessment type max_score
        if ($request->score > $assessmentEntry->assessmentType->max_score) {
            return response()->json([
                'success' => false,
                'message' => "Bal maksimum {$assessmentEntry->assessmentType->max_score} ola bilər"
            ], 422);
        }

        $assessmentEntry->update([
            'score' => $request->score,
            'notes' => $request->notes,
            'grade_level' => $request->grade_level,
            'subject' => $request->subject,
        ]);

        $assessmentEntry->load(['assessmentType', 'student', 'institution']);

        return response()->json([
            'success' => true,
            'data' => $assessmentEntry,
            'message' => 'Qiymətləndirmə qeydi uğurla yeniləndi'
        ]);
    }

    /**
     * Submit assessment entry for approval
     */
    public function submit(AssessmentEntry $assessmentEntry): JsonResponse
    {
        $user = Auth::user();

        if (!$assessmentEntry->canBeEditedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə qeydini təqdim etmək icazəniz yoxdur'
            ], 403);
        }

        if ($assessmentEntry->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız layihə statusunda olan qeydlər təqdim edilə bilər'
            ], 422);
        }

        $assessmentEntry->submit();

        return response()->json([
            'success' => true,
            'data' => $assessmentEntry,
            'message' => 'Qiymətləndirmə qeydi təsdiqə təqdim edildi'
        ]);
    }

    /**
     * Approve assessment entry
     */
    public function approve(Request $request, AssessmentEntry $assessmentEntry): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə təsdiqləmək icazəniz yoxdur'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!$assessmentEntry->approve($user, $request->notes)) {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə təsdiqlənə bilmədi'
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => $assessmentEntry,
            'message' => 'Qiymətləndirmə qeydi uğurla təsdiqləndi'
        ]);
    }

    /**
     * Reject assessment entry
     */
    public function reject(Request $request, AssessmentEntry $assessmentEntry): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə rədd etmək icazəniz yoxdur'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'notes' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Rədd etmə səbəbi qeyd edilməlidir',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!$assessmentEntry->reject($user, $request->notes)) {
            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmə rədd edilə bilmədi'
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => $assessmentEntry,
            'message' => 'Qiymətləndirmə qeydi rədd edildi'
        ]);
    }

    /**
     * Delete assessment entry
     */
    public function destroy(AssessmentEntry $assessmentEntry): JsonResponse
    {
        $user = Auth::user();

        if (!$assessmentEntry->canBeEditedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə qeydini silmək icazəniz yoxdur'
            ], 403);
        }

        if ($assessmentEntry->status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiqlənmiş qiymətləndirmə qeydləri silinə bilməz'
            ], 422);
        }

        $assessmentEntry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə qeydi uğurla silindi'
        ]);
    }

    /**
     * Check if user can access assessment type
     */
    private function canAccessAssessmentType($user, AssessmentType $assessmentType): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            if ($assessmentType->institution_id === null) return true; // Global types
            return $assessmentType->institution_id === $user->institution_id;
        }

        return $assessmentType->institution_id === null || 
               $assessmentType->institution_id === $user->institution_id;
    }

    /**
     * Check if user can access institution
     */
    private function canAccessInstitution($user, Institution $institution): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            return $institution->id === $user->institution_id;
        }

        return $institution->id === $user->institution_id;
    }

    /**
     * Check if user can access assessment entry
     */
    private function canAccessAssessmentEntry($user, AssessmentEntry $assessmentEntry): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            return $assessmentEntry->institution_id === $user->institution_id;
        }

        return $assessmentEntry->institution_id === $user->institution_id;
    }
}