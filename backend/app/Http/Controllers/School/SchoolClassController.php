<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Room;
use App\Models\User;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SchoolClassController extends Controller
{
    /**
     * Get all classes for the school
     */
    public function getClasses(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        Log::info('🏫 SchoolClassController::getClasses - User:', [
            'user_id' => $user->id,
            'username' => $user->username,
            'institution_id' => $user->institution_id,
            'school' => $school ? $school->toArray() : null
        ]);

        if (!$school) {
            Log::warning('🏫 User has no institution');
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        Log::info('🏫 Building query for institution:', ['institution_id' => $school->id]);

        $query = Grade::with(['room', 'homeroomTeacher', 'academicYear'])
            ->byInstitution($school->id);
        
        Log::info('🏫 Base query built, checking total grades in DB...');
        $totalGrades = Grade::count();
        $gradesForInstitution = Grade::where('institution_id', $school->id)->count();
        Log::info('🏫 Grade counts:', [
            'total_in_db' => $totalGrades,
            'for_institution_' . $school->id => $gradesForInstitution
        ]);

        // Apply filters if provided
        if ($request->has('level')) {
            $query->where('level', $request->level);
            Log::info('🏫 Applied level filter:', ['level' => $request->level]);
        }

        if ($request->has('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
            Log::info('🏫 Applied academic year filter:', ['academic_year_id' => $request->academic_year_id]);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%");
            });
            Log::info('🏫 Applied search filter:', ['search' => $search]);
        }

        // Get the results
        $classes = $query->get();
        Log::info('🏫 Found classes:', ['count' => $classes->count()]);

        // Transform the data
        $transformedClasses = $classes->map(function ($class) {
            $students = $class->students()->count();
            
            return [
                'id' => $class->id,
                'name' => $class->name,
                'level' => $class->level,
                'description' => $class->description,
                'capacity' => $class->capacity,
                'student_count' => $students,
                'available_spots' => max(0, ($class->capacity ?? 30) - $students),
                'room' => $class->room ? [
                    'id' => $class->room->id,
                    'name' => $class->room->name,
                    'building' => $class->room->building,
                    'floor' => $class->room->floor,
                ] : null,
                'homeroom_teacher' => $class->homeroomTeacher ? [
                    'id' => $class->homeroomTeacher->id,
                    'name' => $class->homeroomTeacher->name,
                    'email' => $class->homeroomTeacher->email,
                ] : null,
                'academic_year' => $class->academicYear ? [
                    'id' => $class->academicYear->id,
                    'name' => $class->academicYear->name,
                    'start_date' => $class->academicYear->start_date,
                    'end_date' => $class->academicYear->end_date,
                ] : null,
                'is_active' => $class->is_active ?? true,
                'created_at' => $class->created_at,
                'updated_at' => $class->updated_at,
            ];
        });

        Log::info('🏫 Returning transformed classes:', ['count' => $transformedClasses->count()]);

        return response()->json([
            'success' => true,
            'data' => $transformedClasses,
            'message' => $transformedClasses->count() . ' sinif tapıldı'
        ]);
    }

    /**
     * Get specific class details
     */
    public function getClass(Request $request, int $classId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $class = Grade::with(['room', 'homeroomTeacher', 'academicYear', 'students.profile'])
                ->where('id', $classId)
                ->byInstitution($school->id)
                ->firstOrFail();

            $classData = [
                'id' => $class->id,
                'name' => $class->name,
                'level' => $class->level,
                'description' => $class->description,
                'capacity' => $class->capacity,
                'room' => $class->room ? [
                    'id' => $class->room->id,
                    'name' => $class->room->name,
                    'building' => $class->room->building,
                    'floor' => $class->room->floor,
                    'equipment' => $class->room->equipment ?? [],
                ] : null,
                'homeroom_teacher' => $class->homeroomTeacher ? [
                    'id' => $class->homeroomTeacher->id,
                    'name' => $class->homeroomTeacher->name,
                    'email' => $class->homeroomTeacher->email,
                    'phone' => $class->homeroomTeacher->profile->phone ?? null,
                ] : null,
                'academic_year' => $class->academicYear ? [
                    'id' => $class->academicYear->id,
                    'name' => $class->academicYear->name,
                    'start_date' => $class->academicYear->start_date,
                    'end_date' => $class->academicYear->end_date,
                ] : null,
                'students' => $class->students->map(function ($student) {
                    return [
                        'id' => $student->id,
                        'name' => $student->name,
                        'email' => $student->email,
                        'student_number' => $student->profile->student_number ?? null,
                        'enrollment_date' => $student->enrollment_date ?? null,
                        'is_active' => $student->is_active ?? true,
                    ];
                }),
                'student_count' => $class->students->count(),
                'available_spots' => max(0, ($class->capacity ?? 30) - $class->students->count()),
                'is_active' => $class->is_active ?? true,
                'created_at' => $class->created_at,
                'updated_at' => $class->updated_at,
            ];

            return response()->json([
                'success' => true,
                'data' => $classData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Sinif məlumatları əldə edilərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new class
     */
    public function createClass(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $request->validate([
                'name' => 'required|string|max:100',
                'level' => 'required|string|max:50',
                'description' => 'nullable|string|max:500',
                'capacity' => 'nullable|integer|min:1|max:50',
                'room_id' => 'nullable|exists:rooms,id',
                'homeroom_teacher_id' => 'nullable|exists:users,id',
                'academic_year_id' => 'required|exists:academic_years,id',
            ]);

            // Verify room belongs to the school if provided
            if ($request->room_id) {
                $room = Room::where('id', $request->room_id)
                    ->where('institution_id', $school->id)
                    ->first();
                
                if (!$room) {
                    return response()->json(['error' => 'Otaq sizin məktəbə aid deyil'], 400);
                }
            }

            // Verify teacher belongs to the school if provided
            if ($request->homeroom_teacher_id) {
                $teacher = User::where('id', $request->homeroom_teacher_id)
                    ->where('institution_id', $school->id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'müəllim');
                    })
                    ->first();
                
                if (!$teacher) {
                    return response()->json(['error' => 'Müəllim sizin məktəbə aid deyil'], 400);
                }
            }

            $class = Grade::create([
                'name' => $request->name,
                'level' => $request->level,
                'description' => $request->description,
                'capacity' => $request->capacity ?? 30,
                'room_id' => $request->room_id,
                'homeroom_teacher_id' => $request->homeroom_teacher_id,
                'academic_year_id' => $request->academic_year_id,
                'institution_id' => $school->id,
                'is_active' => true,
            ]);

            $class->load(['room', 'homeroomTeacher', 'academicYear']);

            return response()->json([
                'success' => true,
                'message' => 'Sinif uğurla yaradıldı',
                'data' => [
                    'id' => $class->id,
                    'name' => $class->name,
                    'level' => $class->level,
                    'description' => $class->description,
                    'capacity' => $class->capacity,
                    'room' => $class->room,
                    'homeroom_teacher' => $class->homeroomTeacher,
                    'academic_year' => $class->academicYear,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Sinif yaradılarkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing class
     */
    public function updateClass(Request $request, int $classId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (!$school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $class = Grade::where('id', $classId)
                ->byInstitution($school->id)
                ->firstOrFail();

            $request->validate([
                'name' => 'sometimes|required|string|max:100',
                'level' => 'sometimes|required|string|max:50',
                'description' => 'nullable|string|max:500',
                'capacity' => 'sometimes|integer|min:1|max:50',
                'room_id' => 'nullable|exists:rooms,id',
                'homeroom_teacher_id' => 'nullable|exists:users,id',
                'academic_year_id' => 'sometimes|exists:academic_years,id',
                'is_active' => 'sometimes|boolean',
            ]);

            // Verify room belongs to the school if provided
            if ($request->room_id) {
                $room = Room::where('id', $request->room_id)
                    ->where('institution_id', $school->id)
                    ->first();
                
                if (!$room) {
                    return response()->json(['error' => 'Otaq sizin məktəbə aid deyil'], 400);
                }
            }

            // Verify teacher belongs to the school if provided
            if ($request->homeroom_teacher_id) {
                $teacher = User::where('id', $request->homeroom_teacher_id)
                    ->where('institution_id', $school->id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'müəllim');
                    })
                    ->first();
                
                if (!$teacher) {
                    return response()->json(['error' => 'Müəllim sizin məktəbə aid deyil'], 400);
                }
            }

            $class->update($request->only([
                'name', 'level', 'description', 'capacity', 
                'room_id', 'homeroom_teacher_id', 'academic_year_id', 'is_active'
            ]));

            $class->load(['room', 'homeroomTeacher', 'academicYear']);

            return response()->json([
                'success' => true,
                'message' => 'Sinif məlumatları yeniləndi',
                'data' => [
                    'id' => $class->id,
                    'name' => $class->name,
                    'level' => $class->level,
                    'description' => $class->description,
                    'capacity' => $class->capacity,
                    'room' => $class->room,
                    'homeroom_teacher' => $class->homeroomTeacher,
                    'academic_year' => $class->academicYear,
                    'is_active' => $class->is_active,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Sinif yenilənərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }
}