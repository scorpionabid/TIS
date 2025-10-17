<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\GradeSubject;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GradeSubjectController extends Controller
{
    /**
     * Get all curriculum subjects for a grade.
     */
    public function index(Grade $grade)
    {
        $gradeSubjects = $grade->gradeSubjects()
            ->with(['subject', 'teacher'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($gs) {
                return [
                    'id' => $gs->id,
                    'subject_id' => $gs->subject_id,
                    'subject_name' => $gs->subject->name,
                    'subject_code' => $gs->subject->code,
                    'weekly_hours' => $gs->weekly_hours,
                    'is_teaching_activity' => $gs->is_teaching_activity,
                    'is_extracurricular' => $gs->is_extracurricular,
                    'is_club' => $gs->is_club,
                    'is_split_groups' => $gs->is_split_groups,
                    'group_count' => $gs->group_count,
                    'calculated_hours' => $gs->calculated_hours,
                    'formatted_hours' => $gs->formatted_hours,
                    'activity_types' => $gs->activity_types,
                    'teacher_id' => $gs->teacher_id,
                    'teacher_name' => $gs->teacher ? $gs->teacher->name : null,
                    'notes' => $gs->notes,
                    'created_at' => $gs->created_at,
                    'updated_at' => $gs->updated_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $gradeSubjects,
            'meta' => [
                'grade_id' => $grade->id,
                'grade_name' => $grade->full_name,
                'total_weekly_hours' => $grade->total_weekly_hours,
                'total_calculated_hours' => $grade->total_calculated_hours,
                'subject_count' => $gradeSubjects->count(),
            ],
        ]);
    }

    /**
     * Get available subjects for a grade.
     */
    public function availableSubjects(Grade $grade)
    {
        // Get subjects already assigned to this grade
        $assignedSubjectIds = $grade->gradeSubjects()->pluck('subject_id')->toArray();

        // Get available subjects for this class level
        $availableSubjects = Subject::active()
            ->forClassLevel($grade->class_level)
            ->whereNotIn('id', $assignedSubjectIds)
            ->orderBy('name')
            ->get()
            ->map(function ($subject) {
                return [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'short_name' => $subject->short_name,
                    'code' => $subject->code,
                    'category' => $subject->category,
                    'weekly_hours' => $subject->weekly_hours,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $availableSubjects,
        ]);
    }

    /**
     * Add a subject to grade curriculum.
     */
    public function store(Request $request, Grade $grade)
    {
        $validated = $request->validate([
            'subject_id' => [
                'required',
                'exists:subjects,id',
                Rule::unique('grade_subjects')
                    ->where('grade_id', $grade->id),
            ],
            'weekly_hours' => 'required|integer|min:1|max:10',
            'is_teaching_activity' => 'boolean',
            'is_extracurricular' => 'boolean',
            'is_club' => 'boolean',
            'is_split_groups' => 'boolean',
            'group_count' => 'required|integer|min:1|max:4',
            'teacher_id' => 'nullable|exists:users,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Verify subject is available for this grade level
        $subject = Subject::findOrFail($validated['subject_id']);
        if (!$subject->isAvailableForLevel($grade->class_level)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fənn bu sinif səviyyəsi üçün uyğun deyil.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $gradeSubject = $grade->gradeSubjects()->create($validated);

            DB::commit();

            // Load relationships
            $gradeSubject->load(['subject', 'teacher']);

            return response()->json([
                'success' => true,
                'message' => 'Fənn müvəffəqiyyətlə əlavə edildi.',
                'data' => [
                    'id' => $gradeSubject->id,
                    'subject_id' => $gradeSubject->subject_id,
                    'subject_name' => $gradeSubject->subject->name,
                    'subject_code' => $gradeSubject->subject->code,
                    'weekly_hours' => $gradeSubject->weekly_hours,
                    'is_teaching_activity' => $gradeSubject->is_teaching_activity,
                    'is_extracurricular' => $gradeSubject->is_extracurricular,
                    'is_club' => $gradeSubject->is_club,
                    'is_split_groups' => $gradeSubject->is_split_groups,
                    'group_count' => $gradeSubject->group_count,
                    'calculated_hours' => $gradeSubject->calculated_hours,
                    'formatted_hours' => $gradeSubject->formatted_hours,
                    'activity_types' => $gradeSubject->activity_types,
                    'teacher_id' => $gradeSubject->teacher_id,
                    'teacher_name' => $gradeSubject->teacher ? $gradeSubject->teacher->name : null,
                    'notes' => $gradeSubject->notes,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Fənn əlavə edilərkən xəta baş verdi.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a grade subject.
     */
    public function update(Request $request, Grade $grade, GradeSubject $gradeSubject)
    {
        // Verify grade subject belongs to this grade
        if ($gradeSubject->grade_id !== $grade->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fənn bu sinfə aid deyil.',
            ], 403);
        }

        $validated = $request->validate([
            'weekly_hours' => 'required|integer|min:1|max:10',
            'is_teaching_activity' => 'boolean',
            'is_extracurricular' => 'boolean',
            'is_club' => 'boolean',
            'is_split_groups' => 'boolean',
            'group_count' => 'required|integer|min:1|max:4',
            'teacher_id' => 'nullable|exists:users,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            DB::beginTransaction();

            $gradeSubject->update($validated);

            DB::commit();

            // Load relationships
            $gradeSubject->load(['subject', 'teacher']);

            return response()->json([
                'success' => true,
                'message' => 'Fənn yeniləndi.',
                'data' => [
                    'id' => $gradeSubject->id,
                    'subject_id' => $gradeSubject->subject_id,
                    'subject_name' => $gradeSubject->subject->name,
                    'subject_code' => $gradeSubject->subject->code,
                    'weekly_hours' => $gradeSubject->weekly_hours,
                    'is_teaching_activity' => $gradeSubject->is_teaching_activity,
                    'is_extracurricular' => $gradeSubject->is_extracurricular,
                    'is_club' => $gradeSubject->is_club,
                    'is_split_groups' => $gradeSubject->is_split_groups,
                    'group_count' => $gradeSubject->group_count,
                    'calculated_hours' => $gradeSubject->calculated_hours,
                    'formatted_hours' => $gradeSubject->formatted_hours,
                    'activity_types' => $gradeSubject->activity_types,
                    'teacher_id' => $gradeSubject->teacher_id,
                    'teacher_name' => $gradeSubject->teacher ? $gradeSubject->teacher->name : null,
                    'notes' => $gradeSubject->notes,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Fənn yenilənərkən xəta baş verdi.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove a subject from grade curriculum.
     */
    public function destroy(Grade $grade, GradeSubject $gradeSubject)
    {
        // Verify grade subject belongs to this grade
        if ($gradeSubject->grade_id !== $grade->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fənn bu sinfə aid deyil.',
            ], 403);
        }

        try {
            DB::beginTransaction();

            $subjectName = $gradeSubject->subject->name;
            $gradeSubject->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "{$subjectName} fənni silindi.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Fənn silinərkən xəta baş verdi.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get curriculum statistics for a grade.
     */
    public function statistics(Grade $grade)
    {
        $stats = [
            'total_subjects' => $grade->gradeSubjects()->count(),
            'total_weekly_hours' => $grade->total_weekly_hours,
            'total_calculated_hours' => $grade->total_calculated_hours,
            'teaching_activity_count' => $grade->gradeSubjects()->teachingActivity()->count(),
            'extracurricular_count' => $grade->gradeSubjects()->extracurricular()->count(),
            'club_count' => $grade->gradeSubjects()->club()->count(),
            'split_groups_count' => $grade->gradeSubjects()->splitGroups()->count(),
            'subjects_with_teacher' => $grade->gradeSubjects()->whereNotNull('teacher_id')->count(),
            'subjects_without_teacher' => $grade->gradeSubjects()->whereNull('teacher_id')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
