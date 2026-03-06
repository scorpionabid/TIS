<?php

namespace App\Imports;

use App\Models\AcademicYear;
use App\Models\Grade;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\UtisCodeService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class StudentsImport implements ToModel, WithBatchInserts, WithChunkReading, WithHeadingRow, WithValidation
{
    protected $institution;

    protected $errors = [];

    protected $successCount = 0;

    public function __construct($institution)
    {
        $this->institution = $institution;
    }

    /**
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        try {
            Log::info('Processing student import row:', $row);

            // Validate required fields
            if (empty($row['first_name']) || empty($row['last_name']) || empty($row['date_of_birth'])) {
                Log::warning('Skipping row due to missing required fields:', $row);

                return;
            }

            // Generate username from name
            $firstName = trim($row['first_name']);
            $lastName = trim($row['last_name']);
            $baseUsername = strtolower($firstName . '_' . $lastName);
            $username = $this->generateUniqueUsername($baseUsername);

            // Generate email if not provided
            $email = ! empty($row['email']) ? $row['email'] : $username . '@student.local';

            // Validate email uniqueness
            if (User::where('email', $email)->exists()) {
                $email = $username . '_' . time() . '@student.local';
            }

            // Find grade if specified
            $grade = null;
            if (! empty($row['grade_name'])) {
                $grade = Grade::where('name', $row['grade_name'])
                    ->where('institution_id', $this->institution->id)
                    ->first();
            }

            // Create user
            $user = User::create([
                'username' => $username,
                'email' => $email,
                'password' => Hash::make('student123'),
                'institution_id' => $this->institution->id,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            // Assign student role
            $user->assignRole('şagird');

            // Generate UTIS code
            $utisCode = ! empty($row['utis_code']) && strlen($row['utis_code']) === 7
                ? $row['utis_code']
                : UtisCodeService::generateUserUtisCode();

            // Validate UTIS code uniqueness
            if (UserProfile::where('utis_code', $utisCode)->exists()) {
                $utisCode = UtisCodeService::generateUserUtisCode();
            }

            // Create user profile
            $user->profile()->create([
                'utis_code' => $utisCode,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'birth_date' => $row['date_of_birth'],
                'gender' => ! empty($row['gender']) ? $row['gender'] : null,
                'contact_phone' => ! empty($row['guardian_phone']) ? $row['guardian_phone'] : null,
                'emergency_contact' => json_encode([
                    'name' => ! empty($row['guardian_name']) ? $row['guardian_name'] : null,
                    'phone' => ! empty($row['guardian_phone']) ? $row['guardian_phone'] : null,
                    'email' => ! empty($row['guardian_email']) ? $row['guardian_email'] : null,
                ]),
                'address' => ! empty($row['address']) ? $row['address'] : '',
            ]);

            // Create enrollment if grade is found
            if ($grade) {
                $currentAcademicYear = AcademicYear::where('is_active', true)->first();
                if ($currentAcademicYear) {
                    $studentNumber = $this->generateStudentNumber();

                    StudentEnrollment::create([
                        'student_id' => $user->id,
                        'grade_id' => $grade->id,
                        'academic_year_id' => $currentAcademicYear->id,
                        'student_number' => $studentNumber,
                        'enrollment_date' => now(),
                        'enrollment_status' => 'active',
                    ]);
                }
            }

            $this->successCount++;
            Log::info('Successfully imported student:', ['user_id' => $user->id, 'utis_code' => $utisCode]);

            return $user;
        } catch (\Exception $e) {
            Log::error('Error importing student:', [
                'row' => $row,
                'error' => $e->getMessage(),
            ]);
            $this->errors[] = 'Row error: ' . $e->getMessage();

            return;
        }
    }

    /**
     * Validation rules
     */
    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'date_of_birth' => 'required|date|before:today',
            'gender' => 'nullable|in:male,female',
            'guardian_name' => 'nullable|string|max:255',
            'guardian_phone' => 'nullable|string|max:20',
            'guardian_email' => 'nullable|email',
            'grade_name' => 'nullable|string',
            'address' => 'nullable|string|max:500',
            'utis_code' => 'nullable|string|size:7|unique:user_profiles,utis_code',
        ];
    }

    /**
     * Generate unique username
     */
    private function generateUniqueUsername($baseUsername)
    {
        $username = $baseUsername;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . '_' . $counter;
            $counter++;
        }

        return $username;
    }

    /**
     * Generate student number
     */
    private function generateStudentNumber()
    {
        $currentYear = date('Y');
        $lastStudent = StudentEnrollment::where('student_number', 'LIKE', $currentYear . '%')
            ->orderBy('student_number', 'desc')
            ->first();

        $nextNumber = $lastStudent ?
            intval(substr($lastStudent->student_number, 4)) + 1 : 1;

        return $currentYear . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }

    public function batchSize(): int
    {
        return 100;
    }

    public function chunkSize(): int
    {
        return 100;
    }

    public function getErrors()
    {
        return $this->errors;
    }

    public function getSuccessCount()
    {
        return $this->successCount;
    }
}
