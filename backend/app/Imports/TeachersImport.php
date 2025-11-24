<?php

namespace App\Imports;

use App\Models\Department;
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

class TeachersImport implements ToModel, WithBatchInserts, WithChunkReading, WithHeadingRow, WithValidation
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
            Log::info('Processing teacher import row:', $row);

            // Validate required fields
            if (empty($row['first_name']) || empty($row['last_name']) || empty($row['email'])) {
                Log::warning('Skipping row due to missing required fields:', $row);

                return;
            }

            // Check email uniqueness
            if (User::where('email', $row['email'])->exists()) {
                Log::warning('Skipping row due to duplicate email:', $row);

                return;
            }

            // Generate username from email
            $baseUsername = explode('@', $row['email'])[0];
            $username = $this->generateUniqueUsername($baseUsername);

            // Find department if specified
            $department = null;
            if (! empty($row['department_name'])) {
                $department = Department::where('name', $row['department_name'])
                    ->where('institution_id', $this->institution->id)
                    ->first();
            }

            // Validate position
            $position = ! empty($row['position']) ? $row['position'] : 'müəllim';
            $validPositions = ['müəllim', 'muavin', 'ubr', 'psixoloq', 'tesarrufat'];
            if (! in_array($position, $validPositions)) {
                $position = 'müəllim';
            }

            // Create user
            $user = User::create([
                'username' => $username,
                'email' => $row['email'],
                'password' => Hash::make('temp123'),
                'institution_id' => $this->institution->id,
                'department_id' => $department ? $department->id : null,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            // Assign role
            $user->assignRole($position);

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
                'first_name' => trim($row['first_name']),
                'last_name' => trim($row['last_name']),
                'birth_date' => ! empty($row['date_of_birth']) ? $row['date_of_birth'] : null,
                'gender' => ! empty($row['gender']) ? $row['gender'] : null,
                'contact_phone' => ! empty($row['phone']) ? $row['phone'] : null,
                'address' => ! empty($row['address']) ? $row['address'] : '',
                'education_history' => ! empty($row['education']) ? json_encode([$row['education']]) : null,
                'employment_history' => ! empty($row['experience']) ? json_encode([$row['experience']]) : null,
            ]);

            $this->successCount++;
            Log::info('Successfully imported teacher:', ['user_id' => $user->id, 'utis_code' => $utisCode]);

            return $user;
        } catch (\Exception $e) {
            Log::error('Error importing teacher:', [
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
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date|before:today',
            'gender' => 'nullable|in:male,female',
            'position' => 'nullable|string|in:müəllim,muavin,ubr,psixoloq,tesarrufat',
            'department_name' => 'nullable|string',
            'address' => 'nullable|string|max:500',
            'education' => 'nullable|string',
            'experience' => 'nullable|string',
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

    public function batchSize(): int
    {
        return 50;
    }

    public function chunkSize(): int
    {
        return 50;
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
