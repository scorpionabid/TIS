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
            ->groupBy(function ($item) {
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
                    'is_assigned' => ! is_null($classAssignment),
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

        // Yalnız curriculum_plans-da (Fənn və Vakansiyalar) bu müəssisə/tədris ili üzrə 
        // ümumiyyətlə hər hansı bir saat təyin edilibmi?
        $hasGlobalPlanForType = \DB::table('curriculum_plans')
            ->where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('hours', '>', 0)
            ->where(function ($q) use ($educationType) {
                $q->where('education_type', $educationType);
                if ($educationType === 'umumi') {
                    $q->orWhereNull('education_type');
                }
            })
            ->exists();

        $subjectQuery = Subject::active()->forClassLevel($grade->class_level);

        // Əgər plan istifadə olunursa (məktəb artıq fənləri və saatları Master Planda müəyyən edibsə),
        // o zaman yalnız Master Planda qeyd edilmiş və saatı 0-dan böyük olan fənləri göstər.
        if ($hasGlobalPlanForType) {
            $subjectQuery->whereExists(function ($q) use ($grade, $educationType) {
                $q->select(\DB::raw(1))
                    ->from('curriculum_plans')
                    ->whereColumn('curriculum_plans.subject_id', 'subjects.id')
                    ->where('curriculum_plans.institution_id', $grade->institution_id)
                    ->where('curriculum_plans.academic_year_id', $grade->academic_year_id)
                    ->where('curriculum_plans.class_level', $grade->class_level)
                    ->where('curriculum_plans.hours', '>', 0)
                    ->where(function ($q2) use ($educationType) {
                        $q2->where('curriculum_plans.education_type', $educationType);
                        if ($educationType === 'umumi') {
                            $q2->orWhereNull('curriculum_plans.education_type');
                        }
                    });
            });
        }

        $availableSubjects = $subjectQuery
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

        // Fəaliyyət növü yoxlanışı: tam olaraq bir növ seçilməlidir
        $activityCount = (int) ($validated['is_teaching_activity'] ?? false)
                       + (int) ($validated['is_extracurricular'] ?? false)
                       + (int) ($validated['is_club'] ?? false);

        if ($activityCount === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Fəaliyyət növü seçilməlidir (tədris, dərsdənkənar və ya dərnək).',
            ], 422);
        }

        if ($activityCount > 1) {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız bir fəaliyyət növü seçilə bilər.',
            ], 422);
        }

        // Verify subject is available for this grade level
        $subject = Subject::findOrFail($validated['subject_id']);
        if (! $subject->isAvailableForLevel($grade->class_level)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fənn bu sinif səviyyəsi üçün uyğun deyil.',
            ], 422);
        }

        // Check against Curriculum Plan (Master Plan) - Pool-based check (All classes in same level)
        $hasGlobalPlanForType = \DB::table('curriculum_plans')
            ->where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('hours', '>', 0)
            ->where(function ($q) use ($validated) {
                $q->where('education_type', $validated['education_type']);
                if ($validated['education_type'] === 'umumi') {
                    $q->orWhereNull('education_type');
                }
            })
            ->exists();

        $plan = \App\Models\CurriculumPlan::where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('class_level', $grade->class_level)
            ->where('subject_id', $validated['subject_id'])
            ->where(function ($q) use ($validated) {
                $q->where('education_type', $validated['education_type']);
                if ($validated['education_type'] === 'umumi') {
                    $q->orWhereNull('education_type');
                }
            })
            ->first();

        // Əgər həmin təhsil növü üçün plan varsa, lakin fənn üçün saat daxil edilməyibsə block et
        if ($hasGlobalPlanForType && (! $plan || $plan->hours <= 0)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fənn üçün Tədris Planında (Fənn və Vakansiyalar) bu sinif səviyyəsi üzrə saat daxil edilməyib.',
            ], 422);
        }

        if ($plan) {
            $totalUsedInLevel = GradeSubject::whereHas('grade', function ($q) use ($grade) {
                $q->where('institution_id', $grade->institution_id)
                    ->where('academic_year_id', $grade->academic_year_id)
                    ->where('class_level', $grade->class_level);
            })
                ->where('subject_id', $validated['subject_id'])
                ->where('education_type', $validated['education_type'])
                ->sum('weekly_hours');

            if (($totalUsedInLevel + $validated['weekly_hours']) > $plan->hours) {
                $remaining = max(0, $plan->hours - $totalUsedInLevel);

                return response()->json([
                    'success' => false,
                    'message' => "Tədris planına görə bu fənn üçün qalan limit {$remaining} saatdır (Səviyyə üzrə cəmi {$plan->hours}s olmalıdır).",
                ], 422);
            }
        }

        // Kateqoriya büdcəsi yoxlanışı (Səviyyə üzrə cəmi)
        $categoryBudget = \App\Models\CurriculumPlan::where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('class_level', $grade->class_level)
            ->where('education_type', $validated['education_type'])
            ->sum('hours');

        if ($categoryBudget > 0) {
            $currentUsedInLevel = GradeSubject::whereHas('grade', function ($q) use ($grade) {
                $q->where('institution_id', $grade->institution_id)
                    ->where('academic_year_id', $grade->academic_year_id)
                    ->where('class_level', $grade->class_level);
            })
                ->where('education_type', $validated['education_type'])
                ->sum('weekly_hours');

            if (($currentUsedInLevel + $validated['weekly_hours']) > $categoryBudget) {
                $remaining = max(0, $categoryBudget - $currentUsedInLevel);

                return response()->json([
                    'success' => false,
                    'message' => "Bu kateqoriya üzrə tədris planı limiti ({$categoryBudget}s) aşılacaq. Səviyyə üzrə cari istifadə: {$currentUsedInLevel}s, qalan: {$remaining}s.",
                ], 422);
            }
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
        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            Log::error('GradeSubject store QueryException: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            $message = 'Məlumat bazası xətası: ' . $e->getMessage();
            if ($e->getCode() === '23505') {
                $message = 'Bu fənn artıq bu sinif və təhsil növü üçün əlavə edilib.';
            }

            return response()->json([
                'success' => false,
                'message' => $message,
                'error' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('GradeSubject store Unexpected Exception: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sistem xətası: ' . $e->getMessage(),
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

        // Fəaliyyət növü yoxlanışı: tam olaraq bir növ seçilməlidir
        $activityCount = (int) ($validated['is_teaching_activity'] ?? false)
                       + (int) ($validated['is_extracurricular'] ?? false)
                       + (int) ($validated['is_club'] ?? false);

        if ($activityCount === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Fəaliyyət növü seçilməlidir (tədris, dərsdənkənar və ya dərnək).',
            ], 422);
        }

        if ($activityCount > 1) {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız bir fəaliyyət növü seçilə bilər.',
            ], 422);
        }

        // Check against Curriculum Plan (Master Plan) - Pool-based check (All classes in same level)
        $hasGlobalPlanForType = \DB::table('curriculum_plans')
            ->where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('hours', '>', 0)
            ->where(function ($q) use ($validated) {
                $q->where('education_type', $validated['education_type']);
                if ($validated['education_type'] === 'umumi') {
                    $q->orWhereNull('education_type');
                }
            })
            ->exists();

        $plan = \App\Models\CurriculumPlan::where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('class_level', $grade->class_level)
            ->where('subject_id', $gradeSubject->subject_id)
            ->where(function ($q) use ($validated) {
                $q->where('education_type', $validated['education_type']);
                if ($validated['education_type'] === 'umumi') {
                    $q->orWhereNull('education_type');
                }
            })
            ->first();

        // Əgər həmin təhsil növü üçün plan varsa, lakin fənn üçün saat daxil edilməyibsə block et
        if ($hasGlobalPlanForType && (! $plan || $plan->hours <= 0)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fənn üçün Tədris Planında (Fənn və Vakansiyalar) bu sinif səviyyəsi üzrə saat daxil edilməyib.',
            ], 422);
        }

        if ($plan) {
            $totalUsedInLevel = GradeSubject::whereHas('grade', function ($q) use ($grade) {
                $q->where('institution_id', $grade->institution_id)
                    ->where('academic_year_id', $grade->academic_year_id)
                    ->where('class_level', $grade->class_level);
            })
                ->where('subject_id', $gradeSubject->subject_id)
                ->where('education_type', $validated['education_type'])
                ->where('id', '!=', $gradeSubject->id)
                ->sum('weekly_hours');

            $newTotal = $totalUsedInLevel + $validated['weekly_hours'];
            $oldTotal = $totalUsedInLevel + $gradeSubject->weekly_hours;

            // Only block if we are increasing hours AND we are over the limit
            if ($newTotal > $plan->hours && $newTotal > $oldTotal) {
                $remaining = max(0, $plan->hours - $totalUsedInLevel);

                return response()->json([
                    'success' => false,
                    'message' => "Tədris planına görə bu fənn üçün qalan limit {$remaining} saatdır (Səviyyə üzrə cəmi {$plan->hours}s olmalıdır).",
                ], 422);
            }
        }

        // Kateqoriya büdcəsi yoxlanışı (Səviyyə üzrə cəmi)
        $categoryBudget = \App\Models\CurriculumPlan::where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('class_level', $grade->class_level)
            ->where('education_type', $validated['education_type'])
            ->sum('hours');

        if ($categoryBudget > 0) {
            $currentUsedInLevel = GradeSubject::whereHas('grade', function ($q) use ($grade) {
                $q->where('institution_id', $grade->institution_id)
                    ->where('academic_year_id', $grade->academic_year_id)
                    ->where('class_level', $grade->class_level);
            })
                ->where('education_type', $validated['education_type'])
                ->where('id', '!=', $gradeSubject->id)
                ->sum('weekly_hours');

            $newTotalCat = $currentUsedInLevel + $validated['weekly_hours'];
            $oldTotalCat = $currentUsedInLevel + $gradeSubject->weekly_hours;

            // Only block if increasing AND over limit
            if ($newTotalCat > $categoryBudget && $newTotalCat > $oldTotalCat) {
                $remaining = max(0, $categoryBudget - $currentUsedInLevel);

                return response()->json([
                    'success' => false,
                    'message' => "Bu kateqoriya üzrə tədris planı limiti ({$categoryBudget}s) aşılacaq. Səviyyə üzrə cari istifadə: {$currentUsedInLevel}s, qalan: {$remaining}s.",
                ], 422);
            }
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
        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            Log::error('GradeSubject update QueryException: ' . $e->getMessage());
            $message = 'Fənn yenilənərkən xəta baş verdi.';
            if ($e->getCode() === '23505') { // PostgreSQL unique constraint violation
                $message = 'Bu fənn artıq bu sinif və təhsil növü üçün mövcuddur.';
            }

            return response()->json([
                'success' => false,
                'message' => $message,
                'error' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('GradeSubject update Unexpected Exception: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sistem xətası: ' . $e->getMessage(),
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
    /**
     * Bulk remove subjects from grade curriculum.
     */
    public function bulkDestroy(Request $request, Grade $grade)
    {
        $ids = $request->input('ids', []);

        if (empty($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'Heç bir fənn seçilməyib.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Verify all IDs belong to this grade to prevent unauthorized deletion
            $deletedCount = $grade->gradeSubjects()
                ->whereIn('id', $ids)
                ->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "{$deletedCount} fənn tədris planından silindi.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Fənnlər silinərkən xəta baş verdi.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
