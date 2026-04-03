<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SchoolStudentService
{
    public function getStudents(?Institution $school, Request $request): array
    {
        $user = auth()->user();
        $query = Student::query()
            ->with(['institution', 'grade']);

        // Role-based filtering
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can see all students
            // No filtering needed
        } elseif ($user->hasRole('regionadmin')) {
            // RegionAdmin sees students in their region's institutions
            $query->whereHas('institution', function ($q) use ($user) {
                $q->where('parent_id', $user->institution_id)
                    ->orWhere('id', $user->institution_id);
            });
        } elseif ($user->hasRole('sektoradmin')) {
            // SectorAdmin sees students in their sector's schools
            $query->whereHas('institution', function ($q) use ($user) {
                $q->where('parent_id', $user->institution_id)
                    ->orWhere('id', $user->institution_id);
            });
        } else {
            // School staff see only their school students
            if ($school) {
                $query->where('institution_id', $school->id);
            } else {
                $query->where('institution_id', $user->institution_id ?? 0);
            }
        }

        // Institution filter from request (additional filtering)
        if ($request->has('institution_id') && $request->institution_id) {
            $query->where('institution_id', $request->institution_id);
        }

        // Apply filters
        if ($request->has('grade_level') && $request->grade_level) {
            $query->where('grade_level', $request->grade_level);
        }

        if ($request->has('status') && $request->status) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('student_number', 'like', "%{$search}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) like ?", ["%{$search}%"]);
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'first_name');
        $sortOrder = $request->get('sort_order', 'asc');

        $query->orderBy($sortBy, $sortOrder);

        $perPage = min($request->get('per_page', 50), 100);

        $students = $query->paginate($perPage);

        // Transform data for frontend compatibility
        $transformedStudents = $students->getCollection()->map(function ($student) {
            return [
                'id' => $student->id,
                'student_number' => $student->student_number,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'full_name' => $student->first_name . ' ' . $student->last_name,
                'email' => $student->parent_email, // Using parent email as main contact
                'phone' => $student->parent_phone,
                'date_of_birth' => $student->birth_date,
                'gender' => $student->gender,
                'address' => $student->address,
                'enrollment_date' => $student->enrollment_date ?? $student->created_at,
                'current_grade_level' => $student->grade_level,
                'class_name' => $student->class_name,
                'current_class' => $student->grade ? [
                    'id' => $student->grade->id,
                    'name' => $student->grade->name,
                    'grade_level' => $student->grade->class_level,
                ] : null,
                'grade_id' => $student->grade_id,
                'grade' => $student->grade ? [
                    'id' => $student->grade->id,
                    'name' => $student->grade->name,
                    'class_level' => $student->grade->class_level,
                ] : null,
                'status' => $student->is_active ? 'active' : 'inactive',
                'institution_id' => $student->institution_id,
                'institution' => [
                    'id' => $student->institution->id ?? null,
                    'name' => $student->institution->name ?? null,
                ],
                'is_active' => $student->is_active,
                'created_at' => $student->created_at,
                'updated_at' => $student->updated_at,
            ];
        });

        return [
            'students' => $transformedStudents,
            'pagination' => [
                'current_page' => $students->currentPage(),
                'per_page' => $students->perPage(),
                'total' => $students->total(),
                'last_page' => $students->lastPage(),
                'from' => $students->firstItem(),
                'to' => $students->lastItem(),
            ],
        ];
    }

    public function createStudent(Institution $school, array $data): Student
    {
        // Convert empty strings to null for database compatibility
        foreach ($data as $key => $value) {
            if ($value === '') {
                $data[$key] = null;
            }
        }

        return DB::transaction(function () use ($school, $data) {
            // Map guardian fields to parent fields (backward compat)
            $data['parent_name'] = $data['guardian_name'] ?? $data['parent_name'] ?? null;
            $data['parent_phone'] = $data['guardian_phone'] ?? $data['parent_phone'] ?? null;
            $data['parent_email'] = $data['guardian_email'] ?? $data['parent_email'] ?? null;
            $data['special_needs'] = $data['allergies'] ?? $data['special_needs'] ?? null;

            // Email is optional - generate placeholder if not provided
            $email = $data['email'] ?? null;
            $generatedEmail = null;
            if (empty($email)) {
                $studentNum = $data['student_number'] ?? uniqid();
                $baseEmail = 'student.' . strtolower($studentNum);
                $email = $baseEmail . '@placeholder.school';

                // Ensure email is unique
                $counter = 1;
                while (User::where('email', $email)->exists()) {
                    $email = $baseEmail . '.' . $counter . '@placeholder.school';
                    $counter++;
                }
            } else {
                // Check if provided email already exists
                if (User::where('email', $email)->exists()) {
                    throw new \Exception('Bu email ünvanı artıq istifadə edilir: ' . $email);
                }
            }

            // Create user first
            $username = $data['username'] ?? null;
            if (empty($username)) {
                $studentNum = $data['student_number'] ?? uniqid();
                $username = 'st' . strtolower($studentNum);

                // Ensure username is unique
                $counter = 1;
                $originalUsername = $username;
                while (User::where('username', $username)->exists()) {
                    $username = $originalUsername . '.' . $counter;
                    $counter++;
                }
            } else {
                // Check if provided username already exists
                if (User::where('username', $username)->exists()) {
                    throw new \Exception('Bu istifadəçi adı artıq istifadə edilir: ' . $username);
                }
            }

            $user = User::create([
                'username' => $username,
                'name' => $data['name'] ?? ($data['first_name'] . ' ' . $data['last_name']),
                'email' => $email,
                'password' => Hash::make($data['password'] ?? 'student123'),
                'role' => 'student',
                'institution_id' => $school->id,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            // Create user profile
            $user->profile()->create([
                'first_name' => $data['first_name'] ?? '',
                'last_name' => $data['last_name'] ?? '',
                'contact_phone' => $data['phone'] ?? null,
                'birth_date' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'address' => $data['address'] ?? '{}',
                'emergency_contact' => $data['emergency_contact'] ?? null,
                'parent_name' => $data['parent_name'] ?? null,
                'parent_phone' => $data['parent_phone'] ?? null,
                'parent_email' => $data['parent_email'] ?? null,
            ]);

            // Create student record
            $student = Student::create([
                'user_id' => $user->id,
                'institution_id' => $school->id,
                'grade_id' => $data['grade_id'] ?? null,
                'student_number' => $data['student_number'] ?? $this->generateStudentNumber($school),
                'enrollment_date' => $data['enrollment_date'] ?? now(),
                'status' => $data['status'] ?? 'active',
                'is_active' => true,
                'first_name' => $data['first_name'] ?? '',
                'last_name' => $data['last_name'] ?? '',
                'class_name' => $data['class_name'] ?? '',
                'grade_level' => $data['current_grade_level'] ?? $data['grade_level'] ?? '',
                'birth_date' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'address' => $data['address'] ?? null,
                'parent_name' => $data['parent_name'] ?? null,
                'parent_phone' => $data['parent_phone'] ?? null,
                'parent_email' => $data['parent_email'] ?? null,
                'guardian_relation' => $data['guardian_relation'] ?? null,
                'emergency_contact' => $data['emergency_contact'] ?? null,
                'special_needs' => $data['special_needs'] ?? null,
                'medical_conditions' => $data['medical_conditions'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Create enrollment record (only if grade_id provided)
            if (! empty($data['grade_id'])) {
                StudentEnrollment::create([
                    'student_id' => $student->id,
                    'student_number' => $student->student_number,
                    'grade_id' => $data['grade_id'],
                    'academic_year_id' => $this->getCurrentAcademicYear(),
                    'enrollment_date' => $data['enrollment_date'] ?? now(),
                    'enrollment_status' => 'active',
                ]);
            }

            return $student->load(['institution']);
        });
    }

    public function updateStudent(Student $student, array $data): Student
    {
        // Convert empty strings to null for database compatibility
        foreach ($data as $key => $value) {
            if ($value === '') {
                $data[$key] = null;
            }
        }

        return DB::transaction(function () use ($student, $data) {
            // Update user (if relationship exists)
            if ($student->user) {
                $student->user->update([
                    'name' => $data['name'] ?? $student->user->name,
                    'email' => $data['email'] ?? $student->user->email,
                ]);

                // Update user profile (if relationship exists)
                if ($student->user->profile) {
                    $student->user->profile->update([
                        'first_name' => $data['first_name'] ?? $student->user->profile->first_name,
                        'last_name' => $data['last_name'] ?? $student->user->profile->last_name,
                        'contact_phone' => $data['phone'] ?? $student->user->profile->contact_phone,
                        'birth_date' => $data['date_of_birth'] ?? $student->user->profile->birth_date,
                        'gender' => $data['gender'] ?? $student->user->profile->gender,
                        'address' => $data['address'] ?? $student->user->profile->address,
                        'emergency_contact' => $data['emergency_contact'] ?? $student->user->profile->emergency_contact,
                        'parent_name' => $data['parent_name'] ?? $student->user->profile->parent_name,
                        'parent_phone' => $data['parent_phone'] ?? $student->user->profile->parent_phone,
                        'parent_email' => $data['parent_email'] ?? $student->user->profile->parent_email,
                    ]);
                }
            }

            // Update student record (all relevant fields)
            $student->update([
                'grade_id' => $data['grade_id'] ?? $student->grade_id,
                'student_number' => $data['student_number'] ?? $student->student_number,
                'first_name' => $data['first_name'] ?? $student->first_name,
                'last_name' => $data['last_name'] ?? $student->last_name,
                'birth_date' => $data['date_of_birth'] ?? $student->birth_date,
                'gender' => $data['gender'] ?? $student->gender,
                'address' => $data['address'] ?? $student->address,
                'enrollment_date' => $data['enrollment_date'] ?? $student->enrollment_date,
                'status' => $data['status'] ?? ($data['is_active'] === false ? 'inactive' : ($data['is_active'] === true ? 'active' : $student->status)),
                'is_active' => isset($data['is_active']) ? (bool) $data['is_active'] : (isset($data['status']) ? ($data['status'] === 'active') : $student->is_active),
                'special_needs' => $data['special_needs'] ?? $student->special_needs,
                'medical_conditions' => $data['medical_conditions'] ?? $student->medical_conditions,
                'notes' => $data['notes'] ?? $student->notes,
            ]);

            // Sync enrollment record if grade_id is provided
            if (! empty($data['grade_id'])) {
                $academicYearId = $this->getCurrentAcademicYear();

                // 1. Cari academic year üçün enrollment axtar
                $enrollment = StudentEnrollment::where('student_id', $student->id)
                    ->where('academic_year_id', $academicYearId)
                    ->first();

                if ($enrollment) {
                    // Mövcuddur — sadəcə UPDATE et (INSERT yoxdur, unique violation yoxdur)
                    $enrollment->update([
                        'grade_id' => $data['grade_id'],
                        'student_number' => $student->student_number,
                        'enrollment_status' => 'active',
                    ]);
                } else {
                    // 2. Bu student üçün hər hansı enrollment varsa — onu UPDATE et
                    $anyEnrollment = StudentEnrollment::where('student_id', $student->id)->first();

                    if ($anyEnrollment) {
                        $anyEnrollment->update([
                            'grade_id' => $data['grade_id'],
                            'academic_year_id' => $academicYearId,
                            'student_number' => $student->student_number,
                            'enrollment_status' => 'active',
                        ]);
                    } else {
                        // 3. Heç enrollment yoxdur — təhlükəsiz CREATE et
                        StudentEnrollment::create([
                            'student_id' => $student->id,
                            'student_number' => $student->student_number,
                            'grade_id' => $data['grade_id'],
                            'academic_year_id' => $academicYearId,
                            'enrollment_status' => 'active',
                            'enrollment_date' => $data['enrollment_date'] ?? now(),
                        ]);
                    }
                }
            }

            return $student->load(['user.profile', 'grade']);
        });
    }

    public function deleteStudent(Student $student): bool
    {
        return DB::transaction(function () use ($student) {
            // Soft delete by marking as inactive
            $student->update(['is_active' => false]);
            $student->user->update(['is_active' => false]);

            return true;
        });
    }

    public function bulkImportStudents(Institution $school, array $studentsData): array
    {
        $imported = 0;
        $errors = [];

        DB::transaction(function () use ($school, $studentsData, &$imported, &$errors) {
            foreach ($studentsData as $index => $data) {
                try {
                    $this->createStudent($school, $data);
                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = [
                        'row' => $index + 1,
                        'data' => $data,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        });

        return [
            'imported' => $imported,
            'errors' => $errors,
            'total' => count($studentsData),
        ];
    }

    public function getAvailableGrades(Institution $school): array
    {
        return Grade::where('institution_id', $school->id)
            ->orWhere('institution_id', null) // Global grades
            ->orderBy('level')
            ->get()
            ->toArray();
    }

    private function generateStudentNumber(Institution $school): string
    {
        $year = Carbon::now()->year;
        $lastStudent = Student::where('institution_id', $school->id)
            ->where('student_number', 'like', $year . '%')
            ->orderBy('student_number', 'desc')
            ->first();

        if ($lastStudent) {
            $lastNumber = (int) substr($lastStudent->student_number, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $year . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    private function getCurrentAcademicYear(): int
    {
        $academicYear = \App\Models\AcademicYear::where('is_active', true)->first();

        if (! $academicYear) {
            // If no current academic year is set, create one
            $currentYear = date('Y');
            $academicYear = \App\Models\AcademicYear::create([
                'name' => $currentYear . '-' . ($currentYear + 1),
                'start_date' => $currentYear . '-09-01',
                'end_date' => ($currentYear + 1) . '-06-30',
                'is_active' => true,
            ]);
        }

        return $academicYear->id;
    }
}
