<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Student;
use App\Models\User;
use App\Models\Grade;
use App\Models\StudentEnrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class SchoolStudentService
{
    public function getStudents(Institution $school, Request $request): array
    {
        $query = Student::where('institution_id', $school->id)
            ->with(['grade', 'user.profile']);

        // Apply filters
        if ($request->has('grade_id') && $request->grade_id) {
            $query->where('grade_id', $request->grade_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('is_active', $request->status === 'active');
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');

        if ($sortBy === 'name') {
            $query->join('users', 'students.user_id', '=', 'users.id')
                ->orderBy('users.name', $sortOrder)
                ->select('students.*');
        } else {
            $query->orderBy($sortBy, $sortOrder);
        }

        $perPage = min($request->get('per_page', 15), 100);
        
        return $query->paginate($perPage)->toArray();
    }

    public function createStudent(Institution $school, array $data): Student
    {
        return DB::transaction(function () use ($school, $data) {
            // Create user first
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
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
                'phone' => $data['phone'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'address' => $data['address'] ?? null,
                'emergency_contact' => $data['emergency_contact'] ?? null,
                'parent_name' => $data['parent_name'] ?? null,
                'parent_phone' => $data['parent_phone'] ?? null,
                'parent_email' => $data['parent_email'] ?? null,
            ]);

            // Create student record
            $student = Student::create([
                'user_id' => $user->id,
                'institution_id' => $school->id,
                'grade_id' => $data['grade_id'],
                'student_number' => $data['student_number'] ?? $this->generateStudentNumber($school),
                'enrollment_date' => $data['enrollment_date'] ?? now(),
                'is_active' => true,
                'special_needs' => $data['special_needs'] ?? null,
                'medical_conditions' => $data['medical_conditions'] ?? null,
            ]);

            // Create enrollment record
            StudentEnrollment::create([
                'student_id' => $student->id,
                'grade_id' => $data['grade_id'],
                'academic_year_id' => $this->getCurrentAcademicYear(),
                'enrollment_date' => $data['enrollment_date'] ?? now(),
                'status' => 'active',
            ]);

            return $student->load(['user.profile', 'grade']);
        });
    }

    public function updateStudent(Student $student, array $data): Student
    {
        return DB::transaction(function () use ($student, $data) {
            // Update user
            $student->user->update([
                'name' => $data['name'] ?? $student->user->name,
                'email' => $data['email'] ?? $student->user->email,
            ]);

            // Update user profile
            $student->user->profile->update([
                'first_name' => $data['first_name'] ?? $student->user->profile->first_name,
                'last_name' => $data['last_name'] ?? $student->user->profile->last_name,
                'phone' => $data['phone'] ?? $student->user->profile->phone,
                'date_of_birth' => $data['date_of_birth'] ?? $student->user->profile->date_of_birth,
                'gender' => $data['gender'] ?? $student->user->profile->gender,
                'address' => $data['address'] ?? $student->user->profile->address,
                'emergency_contact' => $data['emergency_contact'] ?? $student->user->profile->emergency_contact,
                'parent_name' => $data['parent_name'] ?? $student->user->profile->parent_name,
                'parent_phone' => $data['parent_phone'] ?? $student->user->profile->parent_phone,
                'parent_email' => $data['parent_email'] ?? $student->user->profile->parent_email,
            ]);

            // Update student
            $student->update([
                'grade_id' => $data['grade_id'] ?? $student->grade_id,
                'student_number' => $data['student_number'] ?? $student->student_number,
                'special_needs' => $data['special_needs'] ?? $student->special_needs,
                'medical_conditions' => $data['medical_conditions'] ?? $student->medical_conditions,
            ]);

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
                        'error' => $e->getMessage()
                    ];
                }
            }
        });

        return [
            'imported' => $imported,
            'errors' => $errors,
            'total' => count($studentsData)
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

    private function getCurrentAcademicYear(): ?int
    {
        $academicYear = \App\Models\AcademicYear::where('is_current', true)->first();
        return $academicYear ? $academicYear->id : null;
    }
}