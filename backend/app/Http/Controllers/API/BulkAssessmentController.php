<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AssessmentEntry;
use App\Models\AssessmentType;
use App\Models\BulkAssessmentSession;
use App\Models\Institution;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BulkAssessmentController extends Controller
{
    /**
     * Create a new bulk assessment session
     */
    public function createSession(Request $request): JsonResponse
    {
        $request->validate([
            'assessment_type_id' => 'required|exists:assessment_types,id',
            'institution_id' => 'required|exists:institutions,id',
            'assessment_date' => 'required|date',
            'grade_level' => 'nullable|string',
            'class_name' => 'nullable|string',
        ]);

        $user = Auth::user();

        // Authorization check
        if (! $this->canAccessInstitution($user, $request->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to institution'], 403);
        }

        $assessmentType = AssessmentType::findOrFail($request->assessment_type_id);

        // Check if assessment type allows bulk entry
        if (! $assessmentType->allowsBulkEntry()) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növü kütləvi daxiletməni dəstəkləmir',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Get students for the session
            $studentsQuery = Student::where('institution_id', $request->institution_id)
                ->where('is_active', true);

            if ($request->grade_level) {
                $studentsQuery->where('grade_level', $request->grade_level);
            }

            if ($request->class_name) {
                $studentsQuery->where('class_name', $request->class_name);
            }

            $students = $studentsQuery->get();

            if ($students->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seçilmiş kriteriylərə uyğun şagird tapılmadı',
                ], 404);
            }

            // Create bulk session
            $session = BulkAssessmentSession::create([
                'assessment_type_id' => $request->assessment_type_id,
                'institution_id' => $request->institution_id,
                'created_by' => $user->id,
                'assessment_date' => $request->assessment_date,
                'grade_level' => $request->grade_level,
                'class_name' => $request->class_name,
                'entry_method' => 'bulk_interface',
                'total_students' => $students->count(),
                'status' => 'draft',
            ]);

            // Create draft assessment entries for all students
            foreach ($students as $student) {
                AssessmentEntry::create([
                    'assessment_type_id' => $request->assessment_type_id,
                    'student_id' => $student->id,
                    'institution_id' => $request->institution_id,
                    'created_by' => $user->id,
                    'assessment_date' => $request->assessment_date,
                    'score' => 0, // Default score
                    'grade_level' => $request->grade_level ?: $student->grade_level,
                    'subject' => $assessmentType->subjects[0] ?? null,
                    'status' => 'draft',
                    'bulk_session_id' => $session->session_id,
                    'entry_method' => 'bulk',
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Kütləvi daxiletmə sessiyası yaradıldı',
                'data' => [
                    'session' => $session->load(['assessmentType', 'institution', 'createdBy']),
                    'students_count' => $students->count(),
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Sessiya yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get bulk session details with student entries
     */
    public function getSession(string $sessionId): JsonResponse
    {
        $user = Auth::user();

        $session = BulkAssessmentSession::with(['assessmentType', 'institution', 'createdBy'])
            ->where('session_id', $sessionId)
            ->firstOrFail();

        // Authorization check
        if (! $this->canAccessInstitution($user, $session->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to session'], 403);
        }

        // Get assessment entries for this session
        $entries = AssessmentEntry::with(['student'])
            ->where('bulk_session_id', $sessionId)
            ->orderBy('student_id')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'student' => [
                        'id' => $entry->student->id,
                        'name' => $entry->student->name,
                        'student_number' => $entry->student->student_number,
                        'class_name' => $entry->student->class_name,
                        'grade_level' => $entry->student->grade_level,
                    ],
                    'score' => $entry->score,
                    'notes' => $entry->notes,
                    'is_completed' => $entry->score > 0,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'session' => $session,
                'entries' => $entries,
                'summary' => $session->getSummary(),
            ],
        ]);
    }

    /**
     * Update bulk assessment entries
     */
    public function updateEntries(string $sessionId, Request $request): JsonResponse
    {
        $request->validate([
            'entries' => 'required|array',
            'entries.*.student_id' => 'required|exists:students,id',
            'entries.*.score' => 'required|numeric|min:0',
            'entries.*.notes' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();

        $session = BulkAssessmentSession::where('session_id', $sessionId)->firstOrFail();

        // Authorization check
        if (! $this->canAccessInstitution($user, $session->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to session'], 403);
        }

        // Check if session is still editable
        if (! $session->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sessiya artıq redaktə edilə bilməz',
            ], 400);
        }

        $assessmentType = $session->assessmentType;

        DB::beginTransaction();
        try {
            $updatedCount = 0;
            $errors = [];

            foreach ($request->entries as $entryData) {
                // Validate score range
                if ($entryData['score'] > $assessmentType->max_score) {
                    $errors[] = [
                        'student_id' => $entryData['student_id'],
                        'message' => "Bal maksimum {$assessmentType->max_score} ola bilər",
                    ];

                    continue;
                }

                // Find and update the assessment entry
                $entry = AssessmentEntry::where('bulk_session_id', $sessionId)
                    ->where('student_id', $entryData['student_id'])
                    ->first();

                if ($entry) {
                    $entry->update([
                        'score' => $entryData['score'],
                        'notes' => $entryData['notes'] ?? $entry->notes,
                    ]);
                    $updatedCount++;
                } else {
                    $errors[] = [
                        'student_id' => $entryData['student_id'],
                        'message' => 'Qiymətləndirmə qeydi tapılmadı',
                    ];
                }
            }

            // Update session completion stats
            $session->updateCompletionStats();

            // Log bulk operation
            $session->logBulkOperation([
                'action' => 'update_entries',
                'user_id' => $user->id,
                'updated_count' => $updatedCount,
                'errors_count' => count($errors),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "{$updatedCount} qiymətləndirmə yeniləndi",
                'data' => [
                    'updated_count' => $updatedCount,
                    'errors' => $errors,
                    'session_summary' => $session->fresh()->getSummary(),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Qiymətləndirmələr yenilənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Apply bulk operation (same score to multiple students)
     */
    public function applyBulkOperation(string $sessionId, Request $request): JsonResponse
    {
        $request->validate([
            'operation_type' => 'required|in:set_score,add_score,set_notes,clear_scores',
            'student_ids' => 'required|array',
            'student_ids.*' => 'exists:students,id',
            'value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();

        $session = BulkAssessmentSession::where('session_id', $sessionId)->firstOrFail();

        // Authorization check
        if (! $this->canAccessInstitution($user, $session->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to session'], 403);
        }

        if (! $session->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sessiya artıq redaktə edilə bilməz',
            ], 400);
        }

        $assessmentType = $session->assessmentType;

        DB::beginTransaction();
        try {
            $entries = AssessmentEntry::where('bulk_session_id', $sessionId)
                ->whereIn('student_id', $request->student_ids)
                ->get();

            $updatedCount = 0;

            foreach ($entries as $entry) {
                switch ($request->operation_type) {
                    case 'set_score':
                        if ($request->value <= $assessmentType->max_score) {
                            $entry->score = $request->value;
                            $updatedCount++;
                        }
                        break;

                    case 'add_score':
                        $newScore = $entry->score + $request->value;
                        if ($newScore <= $assessmentType->max_score) {
                            $entry->score = $newScore;
                            $updatedCount++;
                        }
                        break;

                    case 'set_notes':
                        $entry->notes = $request->notes;
                        $updatedCount++;
                        break;

                    case 'clear_scores':
                        $entry->score = 0;
                        $entry->notes = '';
                        $updatedCount++;
                        break;
                }

                $entry->save();
            }

            // Update session completion stats
            $session->updateCompletionStats();

            // Log bulk operation
            $session->logBulkOperation([
                'action' => $request->operation_type,
                'user_id' => $user->id,
                'student_count' => count($request->student_ids),
                'updated_count' => $updatedCount,
                'value' => $request->value,
                'notes' => $request->notes,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Kütləvi əməliyyat tətbiq edildi ({$updatedCount} şagird)",
                'data' => [
                    'updated_count' => $updatedCount,
                    'operation_type' => $request->operation_type,
                    'session_summary' => $session->fresh()->getSummary(),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Kütləvi əməliyyat zamanı xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Submit bulk assessment session
     */
    public function submitSession(string $sessionId, Request $request): JsonResponse
    {
        $user = Auth::user();

        $session = BulkAssessmentSession::where('session_id', $sessionId)->firstOrFail();

        // Authorization check
        if (! $this->canAccessInstitution($user, $session->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to session'], 403);
        }

        if (! $session->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Bu sessiya artıq təqdim edilmiş və ya tamamlanmışdır',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Update all assessment entries to submitted status
            $entriesCount = AssessmentEntry::where('bulk_session_id', $sessionId)
                ->where('score', '>', 0) // Only submit entries with scores
                ->update([
                    'status' => 'submitted',
                    'submitted_at' => now(),
                ]);

            // Mark session as submitted
            $session->markSubmitted();

            // Log the submission
            $session->logBulkOperation([
                'action' => 'submit_session',
                'user_id' => $user->id,
                'submitted_entries' => $entriesCount,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Kütləvi qiymətləndirmə təqdim edildi ({$entriesCount} qeyd)",
                'data' => [
                    'submitted_entries' => $entriesCount,
                    'session_summary' => $session->fresh()->getSummary(),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Sessiya təqdim edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete bulk assessment session
     */
    public function deleteSession(string $sessionId): JsonResponse
    {
        $user = Auth::user();

        $session = BulkAssessmentSession::where('session_id', $sessionId)->firstOrFail();

        // Authorization check
        if (! $this->canAccessInstitution($user, $session->institution_id)) {
            return response()->json(['error' => 'Unauthorized access to session'], 403);
        }

        // Only allow deletion of draft sessions
        if ($session->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız layihə statusunda olan sessiyalar silinə bilər',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Delete related assessment entries
            AssessmentEntry::where('bulk_session_id', $sessionId)->delete();

            // Delete the session
            $session->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Kütləvi qiymətləndirmə sessiyası silindi',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Sessiya silinərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user's bulk assessment sessions
     */
    public function getUserSessions(Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'nullable|in:draft,in_progress,completed,submitted',
            'institution_id' => 'nullable|exists:institutions,id',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $user = Auth::user();

        $query = BulkAssessmentSession::with(['assessmentType', 'institution'])
            ->orderBy('created_at', 'desc');

        // Filter by user access
        if ($user->hasRole('superadmin')) {
            if ($request->institution_id) {
                $query->where('institution_id', $request->institution_id);
            }
        } elseif ($user->hasRole('regionadmin')) {
            $userRegion = $user->institution;
            $regionInstitutions = Institution::where('parent_id', $userRegion->id)
                ->orWhere('id', $userRegion->id)
                ->pluck('id');
            $query->whereIn('institution_id', $regionInstitutions);

            if ($request->institution_id && $regionInstitutions->contains($request->institution_id)) {
                $query->where('institution_id', $request->institution_id);
            }
        } else {
            $query->where('institution_id', $user->institution_id);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $sessions = $query->paginate($request->per_page ?? 20);

        // Add summary for each session
        $sessions->getCollection()->transform(function ($session) {
            $session->summary = $session->getSummary();

            return $session;
        });

        return response()->json([
            'success' => true,
            'data' => $sessions,
        ]);
    }

    /**
     * Check if user can access institution
     */
    private function canAccessInstitution($user, $institutionId): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            $userRegion = $user->institution;
            $institution = Institution::find($institutionId);

            if (! $userRegion || ! $institution) {
                return false;
            }

            $userRegionId = $userRegion->level === 2 ? $userRegion->id : $userRegion->parent_id;
            $institutionRegionId = $institution->level === 2 ? $institution->id : $institution->parent_id;

            return $userRegionId === $institutionRegionId;
        }

        return $user->institution_id === $institutionId;
    }
}
