<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeachingLoadApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user->institution_id;

        $query = DB::table('teaching_loads')
            ->join('users', 'teaching_loads.teacher_id', '=', 'users.id')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->leftJoin('grades as grade_map', function ($join) {
                $join->on('grade_map.institution_id', '=', 'classes.institution_id')
                    ->on('grade_map.academic_year_id', '=', 'classes.academic_year_id')
                    ->on('grade_map.class_level', '=', 'classes.grade_level')
                    ->on('grade_map.name', '=', 'classes.section');
            })
            ->select([
                'teaching_loads.*',
                'users.username as teacher_name',
                'subjects.name as subject_name',
                'grade_map.id as grade_id',
                DB::raw("COALESCE(grade_map.full_name, CONCAT(classes.grade_level, '-', classes.section)) as class_name"),
            ])
            ->orderBy('users.username');

        // If user has institution_id, filter by it. SuperAdmin (null institution_id) sees all
        if ($institutionId !== null) {
            $query->where('classes.institution_id', $institutionId);
        }

        $teachingLoads = $query->get();

        return response()->json([
            'success' => true,
            'data' => $teachingLoads,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'subject_id' => 'required|exists:subjects,id',
            // Frontend currently sends Grade/Class (grades table) id
            'class_id' => 'required|exists:grades,id',
            'weekly_hours' => 'required|numeric|min:1|max:40',
            'academic_year_id' => 'required|exists:academic_years,id',
        ]);

        // Map grade id to real classes table id (teaching_loads.class_id FK)
        $grade = DB::table('grades')->where('id', $validated['class_id'])->first();
        if (! $grade) {
            return response()->json([
                'success' => false,
                'message' => 'Selected class not found',
            ], 422);
        }

        $existingClass = DB::table('classes')
            ->where('institution_id', $grade->institution_id)
            ->where('academic_year_id', $grade->academic_year_id)
            ->where('grade_level', $grade->class_level)
            ->where('section', $grade->name)
            ->first();

        $classId = $existingClass?->id;
        if (! $classId) {
            $classId = DB::table('classes')->insertGetId([
                'institution_id' => $grade->institution_id,
                'academic_year_id' => $grade->academic_year_id,
                'name' => (string) ($grade->class_level . $grade->name),
                'grade_level' => $grade->class_level,
                'section' => $grade->name,
                'max_capacity' => 30,
                'current_enrollment' => 0,
                'status' => 'active',
                'class_teacher_id' => null,
                'classroom_location' => null,
                'schedule_preferences' => json_encode([]),
                'metadata' => json_encode([
                    'source' => 'teaching-loads',
                    'grade_id' => $grade->id,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 1. Check if the exact same teacher + subject + class exists (Duplicate assignment for same teacher)
        $existingOwnLoad = DB::table('teaching_loads')
            ->where('teacher_id', $validated['teacher_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('class_id', $classId)
            ->where('academic_year_id', $validated['academic_year_id'])
            ->first();

        if ($existingOwnLoad) {
            return response()->json([
                'success' => false,
                'message' => 'Bu fənn artıq bu müəllimə bu sinif üçün təyin edilib.',
            ], 422);
        }

        // 2. Check if the subject is configured as split_groups. If not, prevent multiple teachers.
        $gradeSubject = DB::table('grade_subjects')
            ->where('grade_id', $grade->id)
            ->where('subject_id', $validated['subject_id'])
            ->first();

        $isSplit = $gradeSubject ? (bool) $gradeSubject->is_split_groups : false;

        if (! $isSplit) {
            // Check if any OTHER teacher already has this subject in this class
            $existingOtherLoad = DB::table('teaching_loads')
                ->where('subject_id', $validated['subject_id'])
                ->where('class_id', $classId)
                ->where('academic_year_id', $validated['academic_year_id'])
                ->first();

            if ($existingOtherLoad) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu fənn qruplara bölünməyən fənndir və artıq başqa müəllimə təyin edilib.',
                ], 422);
            }
        } else {
            // Split subject: max 2 teachers allowed per class per subject
            $assignedTeacherCount = DB::table('teaching_loads')
                ->where('subject_id', $validated['subject_id'])
                ->where('class_id', $classId)
                ->where('academic_year_id', $validated['academic_year_id'])
                ->count();

            if ($assignedTeacherCount >= 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Qruplara bölünən fənnə maksimum 2 müəllim təyin edilə bilər. Bu sinif üçün artıq 2 müəllim təyin edilib.',
                ], 422);
            }
        }

        // Add default values for required fields that might be missing
        $data = array_merge($validated, [
            // Replace incoming grade id with real classes.id
            'class_id' => $classId,
            'total_hours' => $validated['weekly_hours'], // Default total_hours to weekly_hours
            'status' => 'active', // Default status
            'start_date' => now()->startOfYear(), // Default to current academic year start
            'end_date' => now()->endOfYear(), // Default to current academic year end
            'schedule_slots' => json_encode([]), // Empty array for schedule slots
            'metadata' => json_encode([]), // Empty metadata
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $teachingLoadId = DB::table('teaching_loads')->insertGetId($data);

        return response()->json([
            'success' => true,
            'message' => 'Teaching load created successfully',
            'data' => ['id' => $teachingLoadId],
        ]);
    }

    public function getTeacherWorkload(Request $request, string $teacherId): JsonResponse
    {
        // Get active academic year
        $activeYear = DB::table('academic_years')
            ->where('is_active', true)
            ->first();

        $query = DB::table('teaching_loads')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->leftJoin('grades as grade_map', function ($join) {
                $join->on('grade_map.institution_id', '=', 'classes.institution_id')
                    ->on('grade_map.academic_year_id', '=', 'classes.academic_year_id')
                    ->on('grade_map.class_level', '=', 'classes.grade_level')
                    ->on('grade_map.name', '=', 'classes.section');
            })
            ->leftJoin('grade_subjects', function ($join) {
                $join->on('grade_subjects.grade_id', '=', 'grade_map.id')
                    ->on('grade_subjects.subject_id', '=', 'teaching_loads.subject_id');
            })
            ->where('teaching_loads.teacher_id', $teacherId);

        // Filter by active academic year if exists
        if ($activeYear) {
            $query->where('teaching_loads.academic_year_id', $activeYear->id);
        }

        $workload = $query->select([
            'teaching_loads.*',
            'subjects.name as subject_name',
            'grade_map.id as grade_id',
            'grade_map.education_program',
            'grade_map.class_profile',
            'grade_subjects.is_teaching_activity',
            'grade_subjects.is_extracurricular',
            'grade_subjects.is_club',
            DB::raw("CONCAT(classes.grade_level, '-', classes.section) as class_name"),
        ])->get();

        $totalHours = $workload->sum('weekly_hours');
        $maxHours = 24;

        return response()->json([
            'success' => true,
            'data' => [
                'loads' => $workload,
                'total_hours' => $totalHours,
                'max_hours' => $maxHours,
                'remaining_hours' => max(0, $maxHours - $totalHours),
                'is_overloaded' => $totalHours > $maxHours,
            ],
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'weekly_hours' => 'required|numeric|min:1|max:40',
        ]);

        $updated = DB::table('teaching_loads')
            ->where('id', $id)
            ->update(array_merge($validated, [
                'updated_at' => now(),
            ]));

        if (! $updated) {
            return response()->json([
                'success' => false,
                'message' => 'Teaching load not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Teaching load updated successfully',
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $deleted = DB::table('teaching_loads')->where('id', $id)->delete();

        if (! $deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Teaching load not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Teaching load deleted successfully',
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $teachingLoad = DB::table('teaching_loads')
            ->join('users', 'teaching_loads.teacher_id', '=', 'users.id')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->leftJoin('grades as grade_map', function ($join) {
                $join->on('grade_map.institution_id', '=', 'classes.institution_id')
                    ->on('grade_map.academic_year_id', '=', 'classes.academic_year_id')
                    ->on('grade_map.class_level', '=', 'classes.grade_level')
                    ->on('grade_map.name', '=', 'classes.section');
            })
            ->leftJoin('grade_subjects', function ($join) {
                $join->on('grade_subjects.grade_id', '=', 'grade_map.id')
                    ->on('grade_subjects.subject_id', '=', 'teaching_loads.subject_id');
            })
            ->where('teaching_loads.id', $id)
            ->select([
                'teaching_loads.*',
                'users.username as teacher_name',
                'subjects.name as subject_name',
                'grade_map.id as grade_id',
                'grade_map.education_program',
                'grade_map.class_profile',
                'grade_subjects.is_teaching_activity',
                'grade_subjects.is_extracurricular',
                'grade_subjects.is_club',
                DB::raw("COALESCE(grade_map.full_name, CONCAT(classes.grade_level, '-', classes.section)) as class_name"),
            ])
            ->first();

        if (! $teachingLoad) {
            return response()->json([
                'success' => false,
                'message' => 'Teaching load not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $teachingLoad,
        ]);
    }

    public function getByTeacher(string $teacherId): JsonResponse
    {
        return $this->getTeacherWorkload(request(), $teacherId);
    }

    public function getByInstitution(string $institutionId): JsonResponse
    {
        $teachingLoads = DB::table('teaching_loads')
            ->join('users', 'teaching_loads.teacher_id', '=', 'users.id')
            ->join('subjects', 'teaching_loads.subject_id', '=', 'subjects.id')
            ->join('classes', 'teaching_loads.class_id', '=', 'classes.id')
            ->leftJoin('grades as grade_map', function ($join) {
                $join->on('grade_map.institution_id', '=', 'classes.institution_id')
                    ->on('grade_map.academic_year_id', '=', 'classes.academic_year_id')
                    ->on('grade_map.class_level', '=', 'classes.grade_level')
                    ->on('grade_map.name', '=', 'classes.section');
            })
            ->where('classes.institution_id', $institutionId)
            ->select([
                'teaching_loads.*',
                'users.username as teacher_name',
                'subjects.name as subject_name',
                'grade_map.id as grade_id',
                DB::raw("COALESCE(grade_map.full_name, CONCAT(classes.grade_level, '-', classes.section)) as class_name"),
            ])
            ->orderBy('users.username')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $teachingLoads,
        ]);
    }

    public function bulkAssign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'assignments' => 'required|array',
            'assignments.*.teacher_id' => 'required|exists:users,id',
            'assignments.*.subject_id' => 'required|exists:subjects,id',
            // Frontend sends Grade/Class (grades table) id
            'assignments.*.class_id' => 'required|exists:grades,id',
            'assignments.*.weekly_hours' => 'required|numeric|min:1|max:40',
            'assignments.*.academic_year_id' => 'required|exists:academic_years,id',
        ]);

        $insertData = [];
        foreach ($validated['assignments'] as $assignment) {
            $grade = DB::table('grades')->where('id', $assignment['class_id'])->first();
            if (! $grade) {
                continue;
            }

            $existingClass = DB::table('classes')
                ->where('institution_id', $grade->institution_id)
                ->where('academic_year_id', $grade->academic_year_id)
                ->where('grade_level', $grade->class_level)
                ->where('section', $grade->name)
                ->first();

            $classId = $existingClass?->id;
            if (! $classId) {
                $classId = DB::table('classes')->insertGetId([
                    'institution_id' => $grade->institution_id,
                    'academic_year_id' => $grade->academic_year_id,
                    'name' => (string) ($grade->class_level . $grade->name),
                    'grade_level' => $grade->class_level,
                    'section' => $grade->name,
                    'max_capacity' => 30,
                    'current_enrollment' => 0,
                    'status' => 'active',
                    'class_teacher_id' => null,
                    'classroom_location' => null,
                    'schedule_preferences' => json_encode([]),
                    'metadata' => json_encode([
                        'source' => 'teaching-loads',
                        'grade_id' => $grade->id,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $insertData[] = array_merge($assignment, [
                'class_id' => $classId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('teaching_loads')->insert($insertData);

        return response()->json([
            'success' => true,
            'message' => 'Teaching loads assigned successfully',
            'data' => ['count' => count($insertData)],
        ]);
    }

    public function getAnalytics(): JsonResponse
    {
        $totalTeachers = DB::table('users')
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('roles.name', 'müəllim')
            ->where('model_has_roles.model_type', 'App\\Models\\User')
            ->count();

        $totalHoursAssigned = DB::table('teaching_loads')->sum('weekly_hours');

        $overloadedTeachers = DB::table('teaching_loads')
            ->select('teacher_id', DB::raw('SUM(weekly_hours) as total_hours'))
            ->groupBy('teacher_id')
            ->having('total_hours', '>', 24)
            ->count();

        $averageLoadPerTeacher = $totalTeachers > 0 ? $totalHoursAssigned / $totalTeachers : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'total_teachers' => $totalTeachers,
                'overloaded_teachers' => $overloadedTeachers,
                'total_hours_assigned' => $totalHoursAssigned,
                'average_load_per_teacher' => round($averageLoadPerTeacher, 2),
            ],
        ]);
    }

    /**
     * Get teacher's assigned subjects with details
     */
    public function getTeacherSubjects(string $teacherId): JsonResponse
    {
        $teacherSubjects = DB::table('teacher_subjects')
            ->join('subjects', 'teacher_subjects.subject_id', '=', 'subjects.id')
            ->where('teacher_subjects.teacher_id', $teacherId)
            ->where('teacher_subjects.is_active', true)
            ->select([
                'teacher_subjects.id',
                'teacher_subjects.subject_id',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'teacher_subjects.grade_levels',
                'teacher_subjects.specialization_level',
                'teacher_subjects.is_primary_subject',
                'teacher_subjects.max_hours_per_week',
            ])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $teacherSubjects,
        ]);
    }
}
