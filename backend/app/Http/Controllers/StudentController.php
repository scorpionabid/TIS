<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\StudentEnrollment;
use App\Models\Grade;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class StudentController extends Controller
{
    /**
     * Display a listing of students with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institution_id' => 'sometimes|exists:institutions,id',
            'class_id' => 'sometimes|exists:grades,id',
            'grade_level' => 'sometimes|integer|min:1|max:12',
            'status' => 'sometimes|in:active,inactive,graduated,transferred_out,dropped,expelled',
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

        $user = $request->user();
        $query = User::whereHas('roles', function ($q) {
            $q->where('name', 'şagird');
        })->with(['studentEnrollment.grade', 'studentEnrollment.academicYear', 'profile']);

        // Apply regional data access filtering
        if (!$user->hasRole('superadmin')) {
            if ($user->hasRole('regionadmin')) {
                // RegionAdmin can see students in their regional institutions
                $query->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id)
                      ->orWhere('id', $user->institution_id);
                });
            } elseif ($user->hasRole('sektoradmin')) {
                // SektorAdmin can see students in their sector schools
                $query->whereHas('institution', function ($q) use ($user) {
                    $q->where('parent_id', $user->institution_id)
                      ->orWhere('id', $user->institution_id);
                });
            } elseif ($user->hasRole('məktəbadmin') || $user->hasRole('müəllim')) {
                // School staff can only see students in their school
                $query->where('institution_id', $user->institution_id);
            }
        }

        // Apply filters
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->has('class_id')) {
            $query->whereHas('studentEnrollment', function ($q) use ($request) {
                $q->where('grade_id', $request->class_id);
            });
        }

        if ($request->has('grade_level')) {
            $query->whereHas('studentEnrollment.grade', function ($q) use ($request) {
                $q->where('class_level', $request->grade_level);
            });
        }

        if ($request->has('status')) {
            $query->whereHas('studentEnrollment', function ($q) use ($request) {
                $q->where('enrollment_status', $request->status);
            });
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('username', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhereHas('profile', function ($pq) use ($search) {
                      $pq->where('first_name', 'ILIKE', "%{$search}%")
                         ->orWhere('last_name', 'ILIKE', "%{$search}%");
                  })
                  ->orWhereHas('studentEnrollment', function ($sq) use ($search) {
                      $sq->where('student_number', 'ILIKE', "%{$search}%");
                  });
            });
        }

        // Handle includes
        $includes = $request->get('include', '');
        if (str_contains($includes, 'classes')) {
            $query->with(['studentEnrollment.grade']);
        }
        if (str_contains($includes, 'grades')) {
            $query->with(['studentEnrollment.grade']);
        }

        $perPage = $request->get('per_page', 20);
        $students = $query->paginate($perPage);

        // Transform the data
        $transformedStudents = $students->through(function ($student) {
            $enrollment = $student->studentEnrollment;
            $profile = $student->profile;

            return [
                'id' => $student->id,
                'student_number' => $enrollment?->student_number,
                'first_name' => $profile?->first_name,
                'last_name' => $profile?->last_name,
                'full_name' => $profile ? "{$profile->first_name} {$profile->last_name}" : null,
                'email' => $student->email,
                'phone' => $profile?->contact_phone,
                'date_of_birth' => $profile?->date_of_birth,
                'gender' => $profile?->gender,
                'address' => $profile?->address,
                'enrollment_date' => $enrollment?->enrollment_date,
                'current_grade_level' => $enrollment?->grade?->class_level,
                'class_name' => $enrollment?->grade?->name,
                'status' => $enrollment?->enrollment_status ?? 'inactive',
                'institution_id' => $student->institution_id,
                'created_at' => $student->created_at,
                'updated_at' => $student->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'students' => $transformedStudents->items(),
                'pagination' => [
                    'current_page' => $students->currentPage(),
                    'per_page' => $students->perPage(),
                    'total' => $students->total(),
                    'total_pages' => $students->lastPage(),
                    'from' => $students->firstItem(),
                    'to' => $students->lastItem(),
                ],
            ],
            'message' => 'Şagird siyahısı uğurla alındı',
        ]);
    }

    /**
     * Store a newly created student.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_number' => 'required|string|unique:student_enrollments,student_number|max:50',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email|max:255',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'required|date|before:today',
            'gender' => 'required|in:male,female',
            'address' => 'nullable|string|max:500',
            'parent_name' => 'required|string|max:255',
            'parent_phone' => 'required|string|max:20',
            'parent_email' => 'required|email|max:255',
            'enrollment_date' => 'required|date',
            'grade_id' => 'required|exists:grades,id',
            'institution_id' => 'required|exists:institutions,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Generate username from student number
            $username = 'student_' . $request->student_number;

            // Create user account for student
            $student = User::create([
                'username' => $username,
                'email' => $request->email,
                'password' => Hash::make('student123'), // Default password
                'institution_id' => $request->institution_id,
                'is_active' => true,
            ]);

            // Assign student role
            $student->assignRole('şagird');

            // Create user profile
            $student->profile()->create([
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'contact_phone' => $request->phone,
                'date_of_birth' => $request->date_of_birth,
                'gender' => $request->gender,
                'address' => $request->address,
                'emergency_contact_name' => $request->parent_name,
                'emergency_contact_phone' => $request->parent_phone,
                'emergency_contact_email' => $request->parent_email,
            ]);

            // Create student enrollment
            $enrollment = StudentEnrollment::create([
                'student_id' => $student->id,
                'grade_id' => $request->grade_id,
                'academic_year_id' => $request->academic_year_id,
                'enrollment_date' => $request->enrollment_date,
                'student_number' => $request->student_number,
                'enrollment_status' => 'active',
                'enrollment_type' => 'regular',
                'attendance_target_percentage' => 85, // Default target
                'metadata' => $request->metadata ?? [],
            ]);

            DB::commit();

            // Load relationships for response
            $student->load(['profile', 'studentEnrollment.grade', 'studentEnrollment.academicYear']);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $student->id,
                    'student_number' => $enrollment->student_number,
                    'first_name' => $student->profile->first_name,
                    'last_name' => $student->profile->last_name,
                    'full_name' => "{$student->profile->first_name} {$student->profile->last_name}",
                    'email' => $student->email,
                    'username' => $student->username,
                    'enrollment_status' => $enrollment->enrollment_status,
                    'grade' => [
                        'id' => $enrollment->grade->id,
                        'name' => $enrollment->grade->name,
                        'class_level' => $enrollment->grade->class_level,
                    ],
                    'created_at' => $student->created_at,
                ],
                'message' => 'Şagird uğurla yaradıldı',
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Şagird yaradılarkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified student.
     */
    public function show(Request $request, User $student): JsonResponse
    {
        // Verify this is actually a student
        if (!$student->hasRole('şagird')) {
            return response()->json([
                'success' => false,
                'message' => 'İstifadəçi şagird deyil',
            ], 404);
        }

        // Check access permissions
        $user = $request->user();
        if (!$this->canAccessStudent($user, $student)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu şagirdin məlumatlarına giriş icazəniz yoxdur',
            ], 403);
        }

        $student->load([
            'profile',
            'studentEnrollment.grade',
            'studentEnrollment.academicYear',
            'studentEnrollment.primaryGuardian.profile',
            'studentEnrollment.secondaryGuardian.profile',
        ]);

        $enrollment = $student->studentEnrollment;
        $profile = $student->profile;

        $data = [
            'id' => $student->id,
            'student_number' => $enrollment?->student_number,
            'first_name' => $profile?->first_name,
            'last_name' => $profile?->last_name,
            'full_name' => $profile ? "{$profile->first_name} {$profile->last_name}" : null,
            'email' => $student->email,
            'phone' => $profile?->contact_phone,
            'date_of_birth' => $profile?->date_of_birth,
            'gender' => $profile?->gender,
            'address' => $profile?->address,
            'enrollment_date' => $enrollment?->enrollment_date,
            'enrollment_status' => $enrollment?->enrollment_status,
            'enrollment_type' => $enrollment?->enrollment_type,
            'current_grade_level' => $enrollment?->grade?->class_level,
            'institution_id' => $student->institution_id,
            'academic_year_id' => $enrollment?->academic_year_id,
            'attendance_rate' => $enrollment?->calculateCurrentAttendanceRate(),
            'attendance_target' => $enrollment?->attendance_target_percentage,
            'metadata' => $enrollment?->metadata ?? [],
            'grade' => $enrollment?->grade ? [
                'id' => $enrollment->grade->id,
                'name' => $enrollment->grade->name,
                'class_level' => $enrollment->grade->class_level,
                'specialty' => $enrollment->grade->specialty,
            ] : null,
            'academic_year' => $enrollment?->academicYear ? [
                'id' => $enrollment->academicYear->id,
                'name' => $enrollment->academicYear->name,
                'start_date' => $enrollment->academicYear->start_date,
                'end_date' => $enrollment->academicYear->end_date,
            ] : null,
            'guardians' => $enrollment?->getAllGuardians() ?? [],
            'emergency_contacts' => $enrollment?->getEmergencyContactsList() ?? [],
            'medical_alerts' => $enrollment?->getMedicalAlerts() ?? [],
            'created_at' => $student->created_at,
            'updated_at' => $student->updated_at,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Şagird məlumatları uğurla alındı',
        ]);
    }

    /**
     * Update the specified student.
     */
    public function update(Request $request, User $student): JsonResponse
    {
        // Verify this is actually a student
        if (!$student->hasRole('şagird')) {
            return response()->json([
                'success' => false,
                'message' => 'İstifadəçi şagird deyil',
            ], 404);
        }

        // Check access permissions
        $user = $request->user();
        if (!$this->canAccessStudent($user, $student)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu şagirdi yeniləmək icazəniz yoxdur',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($student->id)],
            'phone' => 'sometimes|nullable|string|max:20',
            'address' => 'sometimes|nullable|string|max:500',
            'grade_id' => 'sometimes|exists:grades,id',
            'enrollment_status' => 'sometimes|in:active,inactive,graduated,transferred_out,dropped,expelled',
            'metadata' => 'sometimes|nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Update user data
            $userData = [];
            if ($request->has('email')) {
                $userData['email'] = $request->email;
            }
            
            if (!empty($userData)) {
                $student->update($userData);
            }

            // Update profile data
            $profileData = [];
            if ($request->has('first_name')) {
                $profileData['first_name'] = $request->first_name;
            }
            if ($request->has('last_name')) {
                $profileData['last_name'] = $request->last_name;
            }
            if ($request->has('phone')) {
                $profileData['contact_phone'] = $request->phone;
            }
            if ($request->has('address')) {
                $profileData['address'] = $request->address;
            }

            if (!empty($profileData)) {
                $student->profile()->updateOrCreate([], $profileData);
            }

            // Update enrollment data
            $enrollmentData = [];
            if ($request->has('grade_id')) {
                $enrollmentData['grade_id'] = $request->grade_id;
            }
            if ($request->has('enrollment_status')) {
                $enrollmentData['enrollment_status'] = $request->enrollment_status;
            }
            if ($request->has('metadata')) {
                $enrollmentData['metadata'] = $request->metadata;
            }

            if (!empty($enrollmentData)) {
                $student->studentEnrollment()->updateOrCreate(
                    ['student_id' => $student->id],
                    $enrollmentData
                );
            }

            DB::commit();

            // Reload relationships
            $student->load(['profile', 'studentEnrollment.grade']);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $student->id,
                    'first_name' => $student->profile?->first_name,
                    'last_name' => $student->profile?->last_name,
                    'email' => $student->email,
                    'enrollment_status' => $student->studentEnrollment?->enrollment_status,
                    'updated_at' => $student->updated_at,
                ],
                'message' => 'Şagird məlumatları uğurla yeniləndi',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Şagird yenilənərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified student (soft delete).
     */
    public function destroy(Request $request, User $student): JsonResponse
    {
        // Verify this is actually a student
        if (!$student->hasRole('şagird')) {
            return response()->json([
                'success' => false,
                'message' => 'İstifadəçi şagird deyil',
            ], 404);
        }

        // Check access permissions
        $user = $request->user();
        if (!$this->canAccessStudent($user, $student)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu şagirdi silmək icazəniz yoxdur',
            ], 403);
        }

        try {
            DB::beginTransaction();

            // Set enrollment status to inactive instead of hard delete
            $student->studentEnrollment()->update([
                'enrollment_status' => 'inactive',
                'withdrawal_date' => now(),
                'withdrawal_reason' => 'Administrativ qərar',
            ]);

            // Deactivate user account
            $student->update(['is_active' => false]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Şagird uğurla deaktiv edildi',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Şagird deaktiv edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enroll student in a class.
     */
    public function enroll(Request $request, User $student): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'grade_id' => 'required|exists:grades,id',
            'academic_year_id' => 'required|exists:academic_years,id',
            'enrollment_date' => 'sometimes|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $enrollment = $student->studentEnrollment();
            
            $enrollment->updateOrCreate(
                ['student_id' => $student->id],
                [
                    'grade_id' => $request->grade_id,
                    'academic_year_id' => $request->academic_year_id,
                    'enrollment_date' => $request->get('enrollment_date', now()),
                    'enrollment_status' => 'active',
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Şagird sinifə uğurla daxil edildi',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Şagird daxil edilərkən xəta baş verdi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get student performance data.
     */
    public function performance(Request $request, User $student): JsonResponse
    {
        if (!$student->hasRole('şagird')) {
            return response()->json([
                'success' => false,
                'message' => 'İstifadəçi şagird deyil',
            ], 404);
        }

        $user = $request->user();
        if (!$this->canAccessStudent($user, $student)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu şagirdin performans məlumatlarına giriş icazəniz yoxdur',
            ], 403);
        }

        $enrollment = $student->studentEnrollment;
        if (!$enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'Şagirdin qeydiyyat məlumatı tapılmadı',
            ], 404);
        }

        $data = [
            'student_info' => [
                'id' => $student->id,
                'full_name' => $student->profile ? "{$student->profile->first_name} {$student->profile->last_name}" : null,
                'student_number' => $enrollment->student_number,
                'class' => $enrollment->grade?->name,
            ],
            'attendance_statistics' => [
                'current_rate' => $enrollment->calculateCurrentAttendanceRate(),
                'target_rate' => $enrollment->attendance_target_percentage,
                'difference' => $enrollment->getAttendanceTargetDifference(),
                'is_at_risk' => $enrollment->isAttendanceAtRisk(),
            ],
            'enrollment_info' => [
                'status' => $enrollment->enrollment_status,
                'enrollment_date' => $enrollment->enrollment_date,
                'academic_year' => $enrollment->academicYear?->name,
                'expected_graduation_year' => $enrollment->getExpectedGraduationYear(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Şagird performans məlumatları alındı',
        ]);
    }

    /**
     * Check if user can access student data.
     */
    private function canAccessStudent(User $user, User $student): bool
    {
        // SuperAdmin can access all students
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // RegionAdmin can access students in their region
        if ($user->hasRole('regionadmin')) {
            return $student->institution && 
                   ($student->institution->parent_id === $user->institution_id || 
                    $student->institution_id === $user->institution_id);
        }

        // SektorAdmin can access students in their sector
        if ($user->hasRole('sektoradmin')) {
            return $student->institution && 
                   ($student->institution->parent_id === $user->institution_id || 
                    $student->institution_id === $user->institution_id);
        }

        // School staff can access students in their school
        if ($user->hasRole(['məktəbadmin', 'müəllim'])) {
            return $student->institution_id === $user->institution_id;
        }

        // Guardian can access their own students
        if ($user->isGuardian()) {
            return $user->guardianStudents()->where('student_id', $student->id)->exists() ||
                   $user->secondaryGuardianStudents()->where('student_id', $student->id)->exists();
        }

        return false;
    }
}