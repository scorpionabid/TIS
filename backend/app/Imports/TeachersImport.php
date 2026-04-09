<?php

namespace App\Imports;

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Row;
use Maatwebsite\Excel\Validators\Failure;

class TeachersImport implements OnEachRow, SkipsEmptyRows, SkipsOnFailure, WithBatchInserts, WithChunkReading, WithHeadingRow, WithValidation
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
            // Find existing user by UTIS code (via Profile) or Email
            $utisCode = ! empty($data['utis_code']) ? trim($data['utis_code']) : null;

            if (! $utisCode) {
                // This shouldn't happen due to validation rules, but safe check
                throw new \Exception('UTİS kod daxil edilməyib');
            }

            $user = User::whereHas('profile', function ($q) use ($utisCode) {
                $q->where('utis_code', $utisCode);
            })
                ->orWhere('email', $data['email'])
                ->first();

            $isUpdate = (bool) $user;

            // Find department if specified
            $departmentId = null;
            if (! empty($data['department_name'])) {
                $department = Department::where('name', $data['department_name'])
                    ->where('institution_id', $this->institution->id)
                    ->first();
                $departmentId = $department ? $department->id : null;
            }

            // Validate and map position to role
            $position = ! empty($data['position']) ? $data['position'] : 'müəllim';
            $validPositions = ['müəllim', 'muavin', 'təşkilatçı', 'psixoloq', 'tesarrufat'];
            if (! in_array($position, $validPositions)) {
                $position = 'müəllim';
            }

            if ($isUpdate) {
                // Update existing user
                $user->update([
                    'institution_id' => $this->institution->id,
                    'department_id' => $departmentId ?? $user->department_id,
                ]);
                $this->updatedCount++;
            } else {
                // Create new user (check if username exists handled by generateUniqueUsername)
                $baseUsername = explode('@', $data['email'])[0];
                $username = $this->generateUniqueUsername($baseUsername);

                $user = User::create([
                    'username' => $username,
                    'email' => $data['email'],
                    'password' => Hash::make('temp123'),
                    'institution_id' => $this->institution->id,
                    'department_id' => $departmentId,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);
                $this->successCount++;
            }

            // Sync Role (Always keep it up to date with file)
            $user->syncRoles([$position]);

            // Handle Profile
            $profileData = [
                'first_name' => trim($data['first_name']),
                'last_name' => trim($data['last_name']),
                'birth_date' => ! empty($data['date_of_birth']) ? $data['date_of_birth'] : null,
                'gender' => ! empty($data['gender']) ? $data['gender'] : null,
                'contact_phone' => ! empty($data['phone']) ? $data['phone'] : null,
                'address' => ! empty($data['address']) ? $data['address'] : '',
                'utis_code' => $utisCode,
            ];

            if ($user->profile) {
                // Update profile
                $user->profile->update($profileData);
            } else {
                // Create profile
                $user->profile()->create($profileData);
            }
        } catch (\Exception $e) {
            Log::error("Error at row {$rowIndex}: " . $e->getMessage());
            $this->errors[] = [
                'row' => $rowIndex,
                'errors' => ['Sistem xətası: ' . $e->getMessage()],
            ];
        }
    }

    /**
     * Validation rules
     */
    public function rules(): array
    {
        return [
            '*.first_name' => 'required|string|max:255',
            '*.last_name' => 'required|string|max:255',
            '*.email' => 'required|email|max:255',
            '*.phone' => 'nullable|max:20',
            '*.date_of_birth' => 'nullable|date|before:today',
            '*.gender' => 'nullable|in:male,female',
            '*.position' => 'nullable|string',
            '*.department_name' => 'nullable|string',
            '*.utis_code' => 'required|digits:7',
        ];
    }

    /**
     * Custom validation messages in Azerbaijani
     * Detected automatically by RowValidator via method_exists()
     */
    public function customValidationMessages(): array
    {
        return [
            '*.first_name.required' => 'Ad daxil edilməlidir',
            '*.last_name.required' => 'Soyad daxil edilməlidir',
            '*.email.required' => 'E-poçt daxil edilməlidir',
            '*.email.email' => 'E-poçt düzgün formatda deyil',
            '*.utis_code.required' => 'UTİS kodu daxil edilməlidir (7 rəqəm)',
            '*.utis_code.size' => 'UTİS kodu tam 7 simvol olmalıdır',
            '*.date_of_birth.date' => 'Doğum tarixi düzgün formatda deyil (YYYY-MM-DD)',
            '*.date_of_birth.before' => 'Doğum tarixi bu günün tarixindən əvvəl olmalıdır',
            '*.gender.in' => 'Cins yalnız "male" və ya "female" ola bilər',
        ];
    }

    /**
     * Human-readable attribute names in Azerbaijani
     * Detected automatically by RowValidator via method_exists()
     */
    public function customValidationAttributes(): array
    {
        return [
            '*.first_name' => 'Ad',
            '*.last_name' => 'Soyad',
            '*.email' => 'E-poçt',
            '*.phone' => 'Telefon',
            '*.date_of_birth' => 'Doğum tarixi',
            '*.gender' => 'Cins',
            '*.position' => 'Vəzifə',
            '*.department_name' => 'Şöbə adı',
            '*.utis_code' => 'UTİS kodu',
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
                'values' => $failure->values(),
            ];
        }
    }

    /**
     * Generate unique username from email prefix
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
