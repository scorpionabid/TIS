<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\GradeSubject;
use App\Models\Subject;
use App\Models\CurriculumPlan;
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
        // Find corresponding class_id from classes table to check assignments
        $classId = DB::table('classes')
            ->where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('grade_level', $grade->class_level)
            ->where('section', $grade->name)
            ->value('id');

        $assignments = $classId ? DB::table('teaching_loads')
            ->where('class_id', $classId)
            ->where('academic_year_id', $grade->academic_year_id)
            ->whereNull('deleted_at')
            ->select('subject_id', 'education_type', 'teacher_id')
            ->get()
            ->groupBy(function($item) {
                return $item->subject_id . '_' . ($item->education_type ?? 'umumi');
            }) : collect();

        $gradeSubjects = $grade->gradeSubjects()
            ->with(['subject', 'teacher'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($gs) use ($assignments) {
                $assignmentKey = $gs->subject_id . '_' . ($gs->education_type ?? 'umumi');
                $classAssignment = $assignments->get($assignmentKey)?->first();

                return [
                    'id' => $gs->id,
                    'subject_id' => $gs->subject_id,
                    'subject_name' => $gs->subject->name,
                    'subject_code' => $gs->subject->code,
                    'education_type' => $gs->education_type,
                    'weekly_hours' => $gs->weekly_hours,
                    'is_teaching_activity' => $gs->is_teaching_activity,
                    'is_extracurricular' => $gs->is_extracurricular,
                    'is_club' => $gs->is_club,
                    'is_split_groups' => $gs->is_split_groups,
                    'group_count' => $gs->group_count,
                    'calculated_hours' => $gs->calculated_hours,
                    'formatted_hours' => $gs->formatted_hours,
                    'activity_types' => $gs->activity_types,
                    'teacher_id' => $gs->teacher_id, // Default teacher from curriculum
                    'teacher_name' => $gs->teacher ? $gs->teacher->name : null,
                    'assigned_teacher_id' => $classAssignment?->teacher_id, // Who is actually assigned in this class
                    'is_assigned' => !is_null($classAssignment),
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
    public function availableSubjects(Request $request, Grade $grade)
    {
        // Get education type from request (default to umumi)
        $educationType = trim($request->query('education_type', 'umumi'));
        if (empty($educationType)) {
            $educationType = 'umumi';
        }

        // Get subjects already assigned to this grade IN THIS CATEGORY
        $assignedSubjectIds = $grade->gradeSubjects()
            ->where('education_type', $educationType)
            ->pluck('subject_id')
            ->toArray();

        // Get available subjects for this class level
        // Note: We no longer exclude assignedSubjectIds here to allow 
        // a subject to be visible for all education types.
        // The store() method validation will prevent duplicates in the same category.
        $availableSubjects = Subject::active()
            ->forClassLevel($grade->class_level)
            ->orderBy('name')
            ->get(['id', 'name', 'short_name', 'code', 'category', 'weekly_hours'])
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
            'education_type' => 'required|string|in:umumi,ferdi,evde,xususi',
            'subject_id' => [
                'required',
                'exists:subjects,id',
                Rule::unique('grade_subjects')
                    ->where(function ($query) use ($grade, $request) {
                        return $query->where('grade_id', $grade->id)
                                     ->where('education_type', $request->input('education_type', 'umumi'));
                    }),
            ],
            'weekly_hours' => 'required|numeric|min:0.5|max:10',
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
        if (! $subject->isAvailableForLevel($grade->class_level)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fənn bu sinif səviyyəsi üçün uyğun deyil.',
            ], 422);
        }

        // Check against Curriculum Plan (Master Plan)
        $plan = \App\Models\CurriculumPlan::where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('class_level', $grade->class_level)
            ->where('subject_id', $validated['subject_id'])
            ->where('education_type', $validated['education_type'])
            ->first();

        if ($plan && $validated['weekly_hours'] > $plan->hours) {
            return response()->json([
                'success' => false,
                'message' => "Tədris planına görə bu fənn üçün maksimal saat {$plan->weekly_hours} olmalıdır.",
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
                    'education_type' => $gradeSubject->education_type,
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
        $validated = $request->validate([
            'education_type' => 'required|string|in:umumi,ferdi,evde,xususi',
            'weekly_hours' => 'required|numeric|min:0.5|max:10',
            'is_teaching_activity' => 'boolean',
            'is_extracurricular' => 'boolean',
            'is_club' => 'boolean',
            'is_split_groups' => 'boolean',
            'group_count' => 'required|integer|min:1|max:4',
            'teacher_id' => 'nullable|exists:users,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Check against Curriculum Plan (Master Plan)
        $plan = \App\Models\CurriculumPlan::where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('class_level', $grade->class_level)
            ->where('subject_id', $gradeSubject->subject_id)
            ->where('education_type', $validated['education_type'])
            ->first();

        if ($plan && $validated['weekly_hours'] > $plan->hours) {
            return response()->json([
                'success' => false,
                'message' => "Tədris planına görə bu fənn üçün maksimal saat {$plan->weekly_hours} olmalıdır.",
            ], 422);
        }

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
                    'education_type' => $gradeSubject->education_type,
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
        $educationType = request('education_type', 'umumi');
        $query = $grade->gradeSubjects()->where('education_type', $educationType);

        $stats = [
            'total_subjects' => $query->count(),
            'total_weekly_hours' => $query->sum('weekly_hours'),
            'total_calculated_hours' => $query->get()->sum('calculated_hours'),
            'teaching_activity_count' => (clone $query)->teachingActivity()->count(),
            'extracurricular_count' => (clone $query)->extracurricular()->count(),
            'club_count' => (clone $query)->club()->count(),
            'split_groups_count' => (clone $query)->splitGroups()->count(),
            'subjects_with_teacher' => (clone $query)->whereNotNull('teacher_id')->count(),
            'subjects_without_teacher' => (clone $query)->whereNull('teacher_id')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
