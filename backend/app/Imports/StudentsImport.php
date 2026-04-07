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
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Validators\Failure;
use Maatwebsite\Excel\Row;

class StudentsImport implements OnEachRow, WithBatchInserts, WithChunkReading, WithHeadingRow, WithValidation, SkipsOnFailure, SkipsEmptyRows
{
    protected $institution;

    protected $errors = [];

    protected $successCount = 0;

    protected $updatedCount = 0;

    public function __construct($institution)
    {
        $this->institution = $institution;
    }

    /**
     * Process each row
     */
    public function onRow(Row $row)
    {
        $rowIndex = $row->getIndex();
        $data = $row->toArray();

        try {
            // Find existing student by UTIS code (via Profile) or Email
            $utisCode = ! empty($data['utis_code']) ? trim($data['utis_code']) : null;
            
            if (!$utisCode) {
                throw new \Exception('UTİS kod daxil edilməyib');
            }

            $user = User::whereHas('profile', function($q) use ($utisCode) {
                    $q->where('utis_code', $utisCode);
                })
                ->orWhere('email', $data['email'])
                ->first();

            $isUpdate = !!$user;

            // Find grade if specified
            $grade = null;
            if (! empty($data['grade_name'])) {
                $grade = Grade::where('name', $data['grade_name'])
                    ->where('institution_id', $this->institution->id)
                    ->first();
            }

            if ($isUpdate) {
                // Update existing user
                $user->update([
                    'institution_id' => $this->institution->id,
                ]);
                $this->updatedCount++;
            } else {
                // Create new user (check if username exists handled by generateUniqueUsername)
                $firstName = trim($data['first_name']);
                $lastName = trim($data['last_name']);
                $baseUsername = strtolower($firstName . '_' . $lastName);
                $username = $this->generateUniqueUsername($baseUsername);

                // Use provided email or generate a default one
                $email = ! empty($data['email']) ? $data['email'] : $username . '@student.local';

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
                $this->successCount++;
            }

            // Handle Profile
            $profileData = [
                'first_name' => trim($data['first_name']),
                'last_name' => trim($data['last_name']),
                'birth_date' => ! empty($data['date_of_birth']) ? $data['date_of_birth'] : null,
                'gender' => ! empty($data['gender']) ? $data['gender'] : null,
                'utis_code' => $utisCode,
                'enrollment_date' => ! empty($data['enrollment_date']) ? $data['enrollment_date'] : now()->format('Y-m-d'),
                'address' => $data['address'] ?? '',
            ];

            if ($user->profile) {
                $user->profile->update($profileData);
            } else {
                $user->profile()->create($profileData);
            }

            // Handle Enrollment
            if ($grade) {
                $currentAcademicYear = AcademicYear::where('is_active', true)->first();
                if ($currentAcademicYear) {
                    $studentNumber = $this->generateStudentNumber();

                    StudentEnrollment::updateOrCreate(
                        [
                            'student_id' => $user->id,
                            'academic_year_id' => $currentAcademicYear->id,
                        ],
                        [
                            'grade_id' => $grade->id,
                            'student_number' => $studentNumber,
                            'enrollment_date' => ! empty($data['enrollment_date']) ? $data['enrollment_date'] : now(),
                            'enrollment_status' => 'active',
                        ]
                    );
                }
            }

        } catch (\Exception $e) {
            Log::error("Error at row {$rowIndex}: " . $e->getMessage());
            $this->errors[] = [
                'row' => $rowIndex,
                'errors' => ["Sistem xətası: " . $e->getMessage()]
            ];
        }
    }

    /**
     * Validation rules
     */
    public function rules(): array
    {
        return [
            '*.first_name'      => 'required|string|max:255',
            '*.last_name'       => 'required|string|max:255',
            '*.date_of_birth'   => 'required|date|before:today',
            '*.gender'          => 'nullable|in:male,female,other',
            '*.grade_name'      => 'nullable|string',
            '*.utis_code'       => 'required|digits:7',
            '*.enrollment_date' => 'nullable|date',
            '*.email'           => 'nullable|email|max:255',
        ];
    }

    /**
     * Custom validation messages in Azerbaijani
     */
    public function customValidationMessages(): array
    {
        return [
            '*.first_name.required'    => 'Ad daxil edilməlidir',
            '*.last_name.required'     => 'Soyad daxil edilməlidir',
            '*.date_of_birth.required' => 'Doğum tarixi daxil edilməlidir',
            '*.date_of_birth.date'     => 'Doğum tarixi düzgün formatda deyil (YYYY-MM-DD)',
            '*.date_of_birth.before'   => 'Doğum tarixi bu günün tarixindən əvvəl olmalıdır',
            '*.utis_code.required'     => 'UTİS kodu daxil edilməlidir (7 rəqəm)',
            '*.utis_code.size'         => 'UTİS kodu tam 7 simvol olmalıdır',
            '*.gender.in'              => 'Cins yalnız "male", "female" və ya "other" ola bilər',
            '*.email.email'            => 'E-poçt düzgün formatda deyil',
        ];
    }

    /**
     * Human-readable attribute names in Azerbaijani
     */
    public function customValidationAttributes(): array
    {
        return [
            '*.first_name'      => 'Ad',
            '*.last_name'       => 'Soyad',
            '*.date_of_birth'   => 'Doğum tarixi',
            '*.gender'          => 'Cins',
            '*.grade_name'      => 'Sinif adı',
            '*.utis_code'       => 'UTİS kodu',
            '*.enrollment_date' => 'Qeydiyyat tarixi',
            '*.email'           => 'E-poçt',
        ];
    }

    /**
     * Capture validation failures
     */
    public function onFailure(Failure ...$failures)
    {
        foreach ($failures as $failure) {
            $this->errors[] = [
                'row' => $failure->row(),
                'attribute' => $failure->attribute(),
                'errors' => $failure->errors(),
                'values' => $failure->values()
            ];
        }
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

    public function getUpdatedCount()
    {
        return $this->updatedCount;
    }
}
