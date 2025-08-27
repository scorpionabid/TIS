<?php

namespace App\Services;

use App\Models\User;
use App\Models\StudentEnrollment;
use App\Models\Grade;
use App\Models\AcademicYear;
use App\Models\Role;
use App\Services\BaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Exception;

class StudentManagementService extends BaseService
{
    /**
     * Get students list with filtering and pagination
     */
    public function getStudents(Request $request, $user)
    {
        $query = User::with(['profile', 'institution', 'studentEnrollments.grade'])
            ->whereHas('role', function ($q) {
                $q->where('name', 'şagird');
            });

        // Apply user-based access control
        if (!$user->hasRole('superadmin')) {
            $query = $this->applyUserAccessControl($query, $user);
        }

        // Apply filters
        $query = $this->applyFilters($query, $request);

        // Apply search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhereHas('profile', function ($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('national_id', 'like', "%{$search}%");
                  });
            });
        }

        // Apply sorting
        $sortField = $request->get('sort', 'created_at');
        $direction = $request->get('direction', 'desc');
        
        if ($sortField === 'name') {
            $query->join('user_profiles', 'users.id', '=', 'user_profiles.user_id')
                  ->orderBy('user_profiles.first_name', $direction)
                  ->orderBy('user_profiles.last_name', $direction)
                  ->select('users.*');
        } else {
            $query->orderBy($sortField, $direction);
        }

        // Paginate results
        $perPage = $request->get('per_page', 15);
        $students = $query->paginate($perPage);

        return [
            'students' => $students,
            'total' => $students->total(),
            'current_page' => $students->currentPage(),
            'last_page' => $students->lastPage(),
            'per_page' => $students->perPage()
        ];
    }

    /**
     * Create new student
     */
    public function createStudent(array $data, $user)
    {
        return DB::transaction(function () use ($data, $user) {
            // Get student role
            $studentRole = Role::where('name', 'şagird')->firstOrFail();

            // Generate username and email if not provided
            if (empty($data['username'])) {
                $data['username'] = $this->generateStudentUsername($data['first_name'], $data['last_name']);
            }

            if (empty($data['email'])) {
                $data['email'] = $this->generateStudentEmail($data['first_name'], $data['last_name']);
            }

            // Create user
            $userData = [
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => Hash::make($data['password'] ?? 'student123'),
                'role_id' => $studentRole->id,
                'institution_id' => $data['institution_id'],
                'is_active' => $data['is_active'] ?? true,
                'email_verified_at' => now()
            ];

            $student = User::create($userData);

            // Create profile
            $profileData = [
                'user_id' => $student->id,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'patronymic' => $data['patronymic'] ?? null,
                'birth_date' => $data['birth_date'] ?? null,
                'gender' => $data['gender'] ?? null,
                'national_id' => $data['national_id'] ?? null,
                'contact_phone' => $data['contact_phone'] ?? null,
                'address' => $data['address'] ?? null,
                'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                'emergency_contact_email' => $data['emergency_contact_email'] ?? null,
                'notes' => $data['notes'] ?? null
            ];

            $student->profile()->create($profileData);

            // Create enrollment if class/grade is specified
            if (!empty($data['class_id'])) {
                $this->enrollStudent($student, $data['class_id'], $data);
            }

            return $student->load(['profile', 'institution', 'studentEnrollments.grade']);
        });
    }

    /**
     * Update student
     */
    public function updateStudent($student, array $data, $user)
    {
        if (!$this->canAccessStudent($user, $student)) {
            throw new Exception('Bu şagirdə giriş icazəniz yoxdur', 403);
        }

        return DB::transaction(function () use ($student, $data) {
            // Update user data
            $userData = array_filter([
                'username' => $data['username'] ?? null,
                'email' => $data['email'] ?? null,
                'institution_id' => $data['institution_id'] ?? null,
                'is_active' => $data['is_active'] ?? null
            ], function ($value) {
                return $value !== null;
            });

            if (!empty($userData)) {
                $student->update($userData);
            }

            // Update password if provided
            if (!empty($data['password'])) {
                $student->update(['password' => Hash::make($data['password'])]);
            }

            // Update profile
            $profileData = array_filter([
                'first_name' => $data['first_name'] ?? null,
                'last_name' => $data['last_name'] ?? null,
                'patronymic' => $data['patronymic'] ?? null,
                'birth_date' => $data['birth_date'] ?? null,
                'gender' => $data['gender'] ?? null,
                'national_id' => $data['national_id'] ?? null,
                'contact_phone' => $data['contact_phone'] ?? null,
                'address' => $data['address'] ?? null,
                'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                'emergency_contact_email' => $data['emergency_contact_email'] ?? null,
                'notes' => $data['notes'] ?? null
            ], function ($value) {
                return $value !== null;
            });

            if (!empty($profileData) && $student->profile) {
                $student->profile->update($profileData);
            }

            return $student->fresh(['profile', 'institution', 'studentEnrollments.grade']);
        });
    }

    /**
     * Delete student
     */
    public function deleteStudent($student, $user)
    {
        if (!$this->canAccessStudent($user, $student)) {
            throw new Exception('Bu şagirdə giriş icazəniz yoxdur', 403);
        }

        return DB::transaction(function () use ($student) {
            // Check if student has enrollments
            if ($student->studentEnrollments()->count() > 0) {
                throw new Exception('Bu şagirdin aktiv qeydiyyatları var. Əvvəlcə qeydiyyatları ləğv edin.', 422);
            }

            // Delete profile first
            if ($student->profile) {
                $student->profile->delete();
            }

            // Delete tokens
            $student->tokens()->delete();

            // Soft delete user
            $student->delete();

            return true;
        });
    }

    /**
     * Enroll student in class/grade
     */
    public function enrollStudent($student, $gradeId, array $additionalData = [])
    {
        $grade = Grade::findOrFail($gradeId);
        $currentAcademicYear = AcademicYear::current()->first();

        if (!$currentAcademicYear) {
            throw new Exception('Hazırda aktiv tədris ili yoxdur', 422);
        }

        // Check if student is already enrolled in this grade for current year
        $existingEnrollment = StudentEnrollment::where('student_id', $student->id)
            ->where('grade_id', $gradeId)
            ->where('academic_year_id', $currentAcademicYear->id)
            ->where('is_active', true)
            ->first();

        if ($existingEnrollment) {
            throw new Exception('Şagird artıq bu sinifə qeydiyyatdan keçmişdir', 422);
        }

        // Create enrollment
        $enrollmentData = [
            'student_id' => $student->id,
            'grade_id' => $gradeId,
            'academic_year_id' => $currentAcademicYear->id,
            'enrollment_date' => $additionalData['enrollment_date'] ?? now(),
            'student_number' => $additionalData['student_number'] ?? $this->generateStudentNumber($grade),
            'is_active' => true,
            'notes' => $additionalData['enrollment_notes'] ?? null
        ];

        return StudentEnrollment::create($enrollmentData);
    }

    /**
     * Get student performance data
     */
    public function getStudentPerformance($student, $user)
    {
        if (!$this->canAccessStudent($user, $student)) {
            throw new Exception('Bu şagirdə giriş icazəniz yoxdur', 403);
        }

        $currentYear = AcademicYear::current()->first();
        if (!$currentYear) {
            return null;
        }

        // Get current enrollment
        $enrollment = $student->studentEnrollments()
            ->where('academic_year_id', $currentYear->id)
            ->where('is_active', true)
            ->first();

        if (!$enrollment) {
            return null;
        }

        // Get assessments and grades
        $assessments = $student->academicAssessments()
            ->where('academic_year_id', $currentYear->id)
            ->with(['subject', 'teacher'])
            ->get();

        // Calculate average grades by subject
        $subjectAverages = $assessments->groupBy('subject_id')
            ->map(function ($subjectAssessments) {
                $totalScore = $subjectAssessments->sum('score');
                $count = $subjectAssessments->count();
                return $count > 0 ? round($totalScore / $count, 2) : 0;
            });

        // Overall average
        $overallAverage = $subjectAverages->count() > 0 ? 
            round($subjectAverages->sum() / $subjectAverages->count(), 2) : 0;

        return [
            'enrollment' => $enrollment,
            'assessments' => $assessments,
            'subject_averages' => $subjectAverages,
            'overall_average' => $overallAverage,
            'total_assessments' => $assessments->count()
        ];
    }

    /**
     * Apply user-based access control
     */
    private function applyUserAccessControl($query, $user)
    {
        if ($user->hasRole('regionadmin')) {
            $regionInstitution = $user->institution;
            if ($regionInstitution && $regionInstitution->level == 2) {
                $childIds = $regionInstitution->getAllChildrenIds();
                $query->whereIn('institution_id', $childIds);
            }
        } elseif ($user->hasRole('sektoradmin')) {
            $sectorInstitution = $user->institution;
            if ($sectorInstitution && $sectorInstitution->level == 3) {
                $childIds = $sectorInstitution->getAllChildrenIds();
                $query->whereIn('institution_id', $childIds);
            }
        } elseif ($user->hasRole('schooladmin') || $user->hasRole('müəllim')) {
            $schoolInstitution = $user->institution;
            if ($schoolInstitution) {
                $query->where('institution_id', $schoolInstitution->id);
            }
        }

        return $query;
    }

    /**
     * Apply filters to query
     */
    private function applyFilters($query, Request $request)
    {
        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->filled('class_id')) {
            $query->whereHas('studentEnrollments', function ($q) use ($request) {
                $q->where('grade_id', $request->class_id)->where('is_active', true);
            });
        }

        if ($request->filled('grade_level')) {
            $query->whereHas('studentEnrollments.grade', function ($q) use ($request) {
                $q->where('grade_level', $request->grade_level);
            });
        }

        if ($request->filled('academic_year_id')) {
            $query->whereHas('studentEnrollments', function ($q) use ($request) {
                $q->where('academic_year_id', $request->academic_year_id);
            });
        }

        if ($request->filled('enrollment_status')) {
            $isActive = $request->enrollment_status === 'active';
            $query->whereHas('studentEnrollments', function ($q) use ($isActive) {
                $q->where('is_active', $isActive);
            });
        }

        if ($request->filled('status')) {
            $isActive = $request->status === 'active';
            $query->where('is_active', $isActive);
        }

        if ($request->filled('age_range')) {
            $ageRange = explode('-', $request->age_range);
            if (count($ageRange) === 2) {
                $minAge = (int) $ageRange[0];
                $maxAge = (int) $ageRange[1];
                $maxDate = Carbon::now()->subYears($minAge)->format('Y-m-d');
                $minDate = Carbon::now()->subYears($maxAge + 1)->format('Y-m-d');
                
                $query->whereHas('profile', function ($q) use ($minDate, $maxDate) {
                    $q->whereBetween('birth_date', [$minDate, $maxDate]);
                });
            }
        }

        if ($request->filled('gender')) {
            $query->whereHas('profile', function ($q) use ($request) {
                $q->where('gender', $request->gender);
            });
        }

        return $query;
    }

    /**
     * Check if user can access student
     */
    private function canAccessStudent($user, $student): bool
    {
        if (!$user || !$student) {
            return false;
        }

        // SuperAdmin has access to all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        $userInstitution = $user->institution;
        if (!$userInstitution) {
            return false;
        }

        // RegionAdmin can access students in their region
        if ($user->hasRole('regionadmin') && $userInstitution->level == 2) {
            $allowedIds = $userInstitution->getAllChildrenIds();
            return in_array($student->institution_id, $allowedIds);
        }

        // SektorAdmin can access students in their sector
        if ($user->hasRole('sektoradmin') && $userInstitution->level == 3) {
            $allowedIds = $userInstitution->getAllChildrenIds();
            return in_array($student->institution_id, $allowedIds);
        }

        // SchoolAdmin and teachers can access students in their school
        if ($user->hasRole(['schooladmin', 'müəllim'])) {
            return $userInstitution->id === $student->institution_id;
        }

        return false;
    }

    /**
     * Generate unique student username
     */
    private function generateStudentUsername($firstName, $lastName): string
    {
        $baseUsername = strtolower(
            $this->transliterate($firstName) . '.' . $this->transliterate($lastName)
        );
        
        $username = $baseUsername;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        return $username;
    }

    /**
     * Generate student email
     */
    private function generateStudentEmail($firstName, $lastName): string
    {
        $baseEmail = strtolower(
            $this->transliterate($firstName) . '.' . $this->transliterate($lastName)
        );
        
        $email = $baseEmail . '@student.edu.az';
        $counter = 1;

        while (User::where('email', $email)->exists()) {
            $email = $baseEmail . $counter . '@student.edu.az';
            $counter++;
        }

        return $email;
    }

    /**
     * Generate student number for grade
     */
    private function generateStudentNumber($grade): string
    {
        $currentYear = date('Y');
        $gradeLevel = str_pad($grade->grade_level, 2, '0', STR_PAD_LEFT);
        
        // Get last student number for this grade in current year
        $lastEnrollment = StudentEnrollment::where('grade_id', $grade->id)
            ->whereYear('created_at', $currentYear)
            ->orderBy('student_number', 'desc')
            ->first();

        $lastNumber = 0;
        if ($lastEnrollment && preg_match('/(\d+)$/', $lastEnrollment->student_number, $matches)) {
            $lastNumber = (int) $matches[1];
        }

        $nextNumber = str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
        
        return $currentYear . $gradeLevel . $nextNumber;
    }

    /**
     * Transliterate Azerbaijani characters to Latin
     */
    private function transliterate($text): string
    {
        $azToLatin = [
            'ə' => 'a', 'Ə' => 'A',
            'ı' => 'i', 'I' => 'I',
            'İ' => 'I', 'i' => 'i',
            'ö' => 'o', 'Ö' => 'O',
            'ü' => 'u', 'Ü' => 'U',
            'ç' => 'c', 'Ç' => 'C',
            'ğ' => 'g', 'Ğ' => 'G',
            'ş' => 's', 'Ş' => 'S'
        ];

        return strtr($text, $azToLatin);
    }
}