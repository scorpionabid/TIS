<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\User;
use App\Models\Grade;
use App\Models\TeacherSubject;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SubjectsController extends Controller
{
    /**
     * Display a listing of subjects with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category' => 'sometimes|in:core,elective,extra,vocational',
            'class_level_start' => 'sometimes|integer|min:1|max:12',
            'class_level_end' => 'sometimes|integer|min:1|max:12',
            'class_level' => 'sometimes|integer|min:1|max:12',
            'is_active' => 'sometimes|boolean',
            'search' => 'sometimes|string|max:255',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'include' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = Subject::query();

        // Apply filters
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('class_level_start')) {
            $query->where('class_level_start', '>=', $request->class_level_start);
        }

        if ($request->has('class_level_end')) {
            $query->where('class_level_end', '<=', $request->class_level_end);
        }

        if ($request->has('class_level')) {
            $query->forClassLevel($request->class_level);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('search')) {
            $query->search($request->search);
        }

        // Handle includes
        $includes = $request->get('include', '');
        if (str_contains($includes, 'teachers')) {
            $query->with(['activeTeacherAssignments.teacher.profile']);
        }
        if (str_contains($includes, 'grades')) {
            $query->with(['grades']);
        }

        $perPage = $request->get('per_page', 20);
        $subjects = $query->paginate($perPage);

        // Transform the data
        $transformedSubjects = $subjects->through(function ($subject) {
            $data = [
                'id' => $subject->id,
                'name' => $subject->name,
                'short_name' => $subject->short_name,
                'code' => $subject->code,
                'category' => $subject->category,
                'class_level_start' => $subject->class_level_start,
                'class_level_end' => $subject->class_level_end,
                'class_level_range' => $subject->class_level_range,
                'description' => $subject->description,
                'is_active' => $subject->is_active,
                'grade_levels' => $subject->grade_levels,
                'teachers_count' => $subject->activeTeacherAssignments()->count(),
                'grades_count' => $subject->grades()->count(),
                'created_at' => $subject->created_at,
                'updated_at' => $subject->updated_at,
            ];

            // Add teacher assignments if included
            if ($subject->relationLoaded('activeTeacherAssignments')) {
                $data['teacher_assignments'] = $subject->activeTeacherAssignments->map(function ($assignment) {
                    return [
                        'teacher' => [
                            'id' => $assignment->teacher->id,
                            'full_name' => $assignment->teacher->profile 
                                ? "{$assignment->teacher->profile->first_name} {$assignment->teacher->profile->last_name}"
                                : $assignment->teacher->username,
                            'email' => $assignment->teacher->email,
                        ],
                        'grade' => [
                            'id' => $assignment->grade->id,
                            'name' => $assignment->grade->name,
                            'class_level' => $assignment->grade->class_level,
                        ],
                        'weekly_hours' => $assignment->weekly_hours,
                        'academic_year_id' => $assignment->academic_year_id,
                    ];
                });
            }

            return $data;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'subjects' => $transformedSubjects->items(),
                'pagination' => [
                    'current_page' => $subjects->currentPage(),
                    'per_page' => $subjects->perPage(),
                    'total' => $subjects->total(),
                    'total_pages' => $subjects->lastPage(),
                    'from' => $subjects->firstItem(),
                    'to' => $subjects->lastItem(),
                ],
            ],
            'message' => 'Fənn siyahısı uğurla alındı',
        ]);
    }

    /**
     * Store a newly created subject.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:subjects,name',
            'short_name' => 'required|string|max:10|unique:subjects,short_name',
            'code' => 'required|string|max:20|unique:subjects,code',
            'category' => 'required|in:core,elective,extra,vocational',
            'class_level_start' => 'nullable|integer|min:1|max:12',
            'class_level_end' => 'nullable|integer|min:1|max:12|gte:class_level_start',
            'description' => 'nullable|string|max:1000',
            'grade_levels' => 'nullable|array',
            'grade_levels.*' => 'integer|min:1|max:12',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $subject = Subject::create([
                'name' => $request->name,
                'short_name' => $request->short_name,
                'code' => strtoupper($request->code),
                'category' => $request->category,
                'class_level_start' => $request->class_level_start,
                'class_level_end' => $request->class_level_end,
                'description' => $request->description,
                'grade_levels' => $request->grade_levels ?? [],
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'short_name' => $subject->short_name,
                    'code' => $subject->code,
                    'category' => $subject->category,
                    'class_level_range' => $subject->class_level_range,
                    'is_active' => $subject->is_active,
                    'created_at' => $subject->created_at,
                ],
                'message' => 'Fənn uğurla yaradıldı',
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fənn yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified subject.
     */
    public function show(Request $request, Subject $subject): JsonResponse
    {
        $subject->load([
            'activeTeacherAssignments.teacher.profile',
            'activeTeacherAssignments.grade',
            'grades',
        ]);

        $teacherAssignments = $subject->activeTeacherAssignments->map(function ($assignment) {
            return [
                'id' => $assignment->id,
                'teacher' => [
                    'id' => $assignment->teacher->id,
                    'full_name' => $assignment->teacher->profile 
                        ? "{$assignment->teacher->profile->first_name} {$assignment->teacher->profile->last_name}"
                        : $assignment->teacher->username,
                    'email' => $assignment->teacher->email,
                ],
                'grade' => [
                    'id' => $assignment->grade->id,
                    'name' => $assignment->grade->name,
                    'full_name' => $assignment->grade->full_name,
                    'class_level' => $assignment->grade->class_level,
                ],
                'weekly_hours' => $assignment->weekly_hours,
                'academic_year_id' => $assignment->academic_year_id,
                'is_active' => $assignment->is_active,
            ];
        });

        $gradesData = $subject->grades->map(function ($grade) {
            return [
                'id' => $grade->id,
                'name' => $grade->name,
                'full_name' => $grade->full_name,
                'class_level' => $grade->class_level,
                'student_count' => $grade->getCurrentStudentCount(),
                'teacher_id' => $grade->pivot->teacher_id,
                'weekly_hours' => $grade->pivot->weekly_hours,
            ];
        });

        $data = [
            'id' => $subject->id,
            'name' => $subject->name,
            'short_name' => $subject->short_name,
            'code' => $subject->code,
            'category' => $subject->category,
            'class_level_start' => $subject->class_level_start,
            'class_level_end' => $subject->class_level_end,
            'class_level_range' => $subject->class_level_range,
            'description' => $subject->description,
            'is_active' => $subject->is_active,
            'grade_levels' => $subject->grade_levels,
            'teachers_count' => $subject->activeTeacherAssignments->count(),
            'grades_count' => $subject->grades->count(),
            'teacher_assignments' => $teacherAssignments,
            'grades' => $gradesData,
            'created_at' => $subject->created_at,
            'updated_at' => $subject->updated_at,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Fənn məlumatları uğurla alındı',
        ]);
    }

    /**
     * Update the specified subject.
     */
    public function update(Request $request, Subject $subject): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('subjects')->ignore($subject->id)
            ],
            'short_name' => [
                'sometimes',
                'string',
                'max:10',
                Rule::unique('subjects')->ignore($subject->id)
            ],
            'code' => [
                'sometimes',
                'string',
                'max:20',
                Rule::unique('subjects')->ignore($subject->id)
            ],
            'category' => 'sometimes|in:core,elective,extra,vocational',
            'class_level_start' => 'sometimes|nullable|integer|min:1|max:12',
            'class_level_end' => 'sometimes|nullable|integer|min:1|max:12|gte:class_level_start',
            'description' => 'sometimes|nullable|string|max:1000',
            'is_active' => 'sometimes|boolean',
            'grade_levels' => 'sometimes|nullable|array',
            'grade_levels.*' => 'integer|min:1|max:12',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $updateData = $request->only([
                'name', 'short_name', 'code', 'category', 
                'class_level_start', 'class_level_end', 
                'description', 'is_active', 'grade_levels'
            ]);

            if (isset($updateData['code'])) {
                $updateData['code'] = strtoupper($updateData['code']);
            }

            $subject->update($updateData);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'short_name' => $subject->short_name,
                    'code' => $subject->code,
                    'category' => $subject->category,
                    'class_level_range' => $subject->class_level_range,
                    'is_active' => $subject->is_active,
                    'updated_at' => $subject->updated_at,
                ],
                'message' => 'Fənn məlumatları uğurla yeniləndi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fənn yenilənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified subject (soft delete).
     */
    public function destroy(Request $request, Subject $subject): JsonResponse
    {
        // Check if subject has active teacher assignments
        $activeAssignments = $subject->activeTeacherAssignments()->count();
        if ($activeAssignments > 0) {
            return response()->json([
                'success' => false,
                'message' => "Bu fənn {$activeAssignments} aktiv dərs təyinatında istifadə olunur. Əvvəlcə onları silin",
            ], 422);
        }

        try {
            // Deactivate instead of hard delete
            $subject->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Fənn uğurla deaktiv edildi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fənn deaktiv edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Assign teacher to subject for specific grades.
     */
    public function assignTeacher(Request $request, Subject $subject): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'teacher_id' => 'required|exists:users,id',
            'grade_ids' => 'required|array|min:1',
            'grade_ids.*' => 'exists:grades,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'weekly_hours' => 'required|integer|min:1|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $teacher = User::find($request->teacher_id);
        if (!$teacher->hasRole(['müəllim', 'müavin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Seçilən istifadəçi müəllim deyil',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $assignments = [];
            foreach ($request->grade_ids as $gradeId) {
                $grade = Grade::find($gradeId);
                
                // Check if subject is available for this grade level
                if (!$subject->isAvailableForLevel($grade->class_level)) {
                    return response()->json([
                        'success' => false,
                        'message' => "'{$subject->name}' fənni {$grade->class_level}. sinif üçün uygun deyil",
                    ], 422);
                }

                // Check if assignment already exists
                $existingAssignment = TeacherSubject::where('teacher_id', $request->teacher_id)
                    ->where('subject_id', $subject->id)
                    ->where('grade_id', $gradeId)
                    ->where('academic_year_id', $request->academic_year_id)
                    ->first();

                if ($existingAssignment) {
                    $existingAssignment->update([
                        'weekly_hours' => $request->weekly_hours,
                        'is_active' => true,
                    ]);
                    $assignments[] = $existingAssignment;
                } else {
                    $assignment = TeacherSubject::create([
                        'teacher_id' => $request->teacher_id,
                        'subject_id' => $subject->id,
                        'grade_id' => $gradeId,
                        'academic_year_id' => $request->academic_year_id,
                        'weekly_hours' => $request->weekly_hours,
                        'is_active' => true,
                    ]);
                    $assignments[] = $assignment;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'subject_id' => $subject->id,
                    'teacher_id' => $request->teacher_id,
                    'assignments_count' => count($assignments),
                    'grade_ids' => $request->grade_ids,
                ],
                'message' => 'Müəllim fənnə uğurla təyin edildi',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Müəllim təyin edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get subjects by grade level.
     */
    public function byGradeLevel(Request $request, int $gradeLevel): JsonResponse
    {
        if ($gradeLevel < 1 || $gradeLevel > 12) {
            return response()->json([
                'success' => false,
                'message' => 'Sinif səviyyəsi 1-12 arasında olmalıdır',
            ], 422);
        }

        $subjects = Subject::active()
            ->forClassLevel($gradeLevel)
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->map(function ($subject) {
                return [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'short_name' => $subject->short_name,
                    'code' => $subject->code,
                    'category' => $subject->category,
                    'class_level_range' => $subject->class_level_range,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'grade_level' => $gradeLevel,
                'subjects' => $subjects,
                'total_count' => $subjects->count(),
            ],
            'message' => "{$gradeLevel}. sinif üçün fənnlər alındı",
        ]);
    }

    /**
     * Get subject statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $totalSubjects = Subject::count();
        $activeSubjects = Subject::where('is_active', true)->count();
        $inactiveSubjects = $totalSubjects - $activeSubjects;

        // Category distribution
        $categoryDistribution = Subject::where('is_active', true)
            ->select('category', DB::raw('count(*) as count'))
            ->groupBy('category')
            ->get()
            ->map(function ($item) {
                return [
                    'category' => $item->category,
                    'count' => $item->count,
                ];
            });

        // Grade level coverage
        $gradeCoverage = [];
        for ($level = 1; $level <= 12; $level++) {
            $subjectsCount = Subject::active()->forClassLevel($level)->count();
            $gradeCoverage[] = [
                'grade_level' => $level,
                'subjects_count' => $subjectsCount,
            ];
        }

        // Teacher assignments statistics
        $totalAssignments = TeacherSubject::where('is_active', true)->count();
        $uniqueTeachers = TeacherSubject::where('is_active', true)->distinct('teacher_id')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_subjects' => $totalSubjects,
                    'active_subjects' => $activeSubjects,
                    'inactive_subjects' => $inactiveSubjects,
                    'total_assignments' => $totalAssignments,
                    'unique_teachers' => $uniqueTeachers,
                    'average_assignments_per_teacher' => $uniqueTeachers > 0 
                        ? round($totalAssignments / $uniqueTeachers, 2) 
                        : 0,
                ],
                'category_distribution' => $categoryDistribution,
                'grade_level_coverage' => $gradeCoverage,
            ],
            'message' => 'Fənn statistikaları uğurla alındı',
        ]);
    }
}