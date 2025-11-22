<?php

namespace App\Imports;

use App\Models\User;
use App\Models\UserProfile;
use App\Models\Institution;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Validators\Failure;

/**
 * RegionAdmin Teachers Import
 * Imports teachers from Excel file with all required fields
 * Optimized for importing 1000+ teachers efficiently
 */
class RegionTeachersImport implements
    ToCollection,
    WithHeadingRow,
    WithBatchInserts,
    WithChunkReading,
    SkipsOnError,
    SkipsOnFailure
{
    protected $region;
    protected $skipDuplicates;
    protected $updateExisting;
    protected $successCount = 0;
    protected $errorCount = 0;
    protected $skippedCount = 0;
    protected $details = [
        'success' => [],
        'errors' => [],
        'skipped' => [],
    ];

    // Cache for bulk operations
    protected $existingEmails = [];
    protected $existingUsernames = [];
    protected $processedRows = 0;
    protected $totalRows = 0;

    public function __construct(
        Institution $region,
        bool $skipDuplicates = true,
        bool $updateExisting = false
    ) {
        $this->region = $region;
        $this->skipDuplicates = $skipDuplicates;
        $this->updateExisting = $updateExisting;
    }

    /**
     * Process collection of rows
     * Optimized with bulk validation for better performance
     */
    public function collection(Collection $rows): void
    {
        // Bulk load existing emails and usernames for this chunk
        $this->loadExistingData($rows);

        $rowNumber = $this->processedRows + 1; // Continue from last processed

        foreach ($rows as $row) {
            $rowNumber++;
            $this->processedRows++;

            try {
                // Convert row to array and trim values
                $data = $this->prepareRowData($row);

                // Skip empty rows
                if (empty($data['email'])) {
                    continue;
                }

                // STEP 1: HYBRID INSTITUTION LOOKUP (NEW)
                $institution = $this->findInstitution($data);
                if (!$institution) {
                    $utisCode = $data['institution_utis_code'];
                    $instCode = $data['institution_code'];
                    $instId = $data['institution_id'];
                    $identifier = $utisCode ?: ($instCode ?: $instId);
                    $this->details['errors'][] = "Sətir {$rowNumber}: Müəssisə tapılmadı (kod/ID: {$identifier})";
                    $this->errorCount++;
                    continue;
                }

                // STEP 2: Verify institution belongs to region
                if (!$this->isInstitutionInRegion($institution)) {
                    $this->details['errors'][] = "Sətir {$rowNumber}: Müəssisə (ID:{$institution->id}, Kod:{$institution->institution_code}) sizin regionunuza aid deyil";
                    $this->errorCount++;
                    continue;
                }

                // STEP 3: Set resolved institution_id for validation
                $data['institution_id'] = $institution->id;

                // STEP 4: Validate row data
                $validator = $this->validateRow($data);

                if ($validator->fails()) {
                    $errors = implode(', ', $validator->errors()->all());
                    $this->details['errors'][] = "Sətir {$rowNumber}: {$errors}";
                    $this->errorCount++;
                    continue;
                }

                // STEP 5: Check for duplicates
                $existingTeacher = User::where('email', $data['email'])->first();

                if ($existingTeacher) {
                    if ($this->skipDuplicates) {
                        $this->details['errors'][] = "Sətir {$rowNumber}: {$data['email']} artıq mövcuddur (keçildi)";
                        continue;
                    } elseif ($this->updateExisting) {
                        $this->updateTeacher($existingTeacher, $data);
                        $this->details['success'][] = "Yeniləndi: {$data['first_name']} {$data['last_name']} ({$data['email']})";
                        $this->successCount++;
                        continue;
                    } else {
                        $this->details['errors'][] = "Sətir {$rowNumber}: {$data['email']} artıq mövcuddur";
                        $this->errorCount++;
                        continue;
                    }
                }

                // Create new teacher
                $this->createTeacher($data);
                $this->details['success'][] = "Yaradıldı: {$data['first_name']} {$data['last_name']} ({$data['email']})";
                $this->successCount++;

            } catch (\Exception $e) {
                Log::error('RegionTeachersImport - Error processing row', [
                    'row_number' => $rowNumber,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);

                $this->details['errors'][] = "Sətir {$rowNumber}: {$e->getMessage()}";
                $this->errorCount++;
            }
        }
    }

    /**
     * Bulk load existing emails and usernames for this chunk
     * Performance optimization: One query instead of N queries
     */
    private function loadExistingData(Collection $rows): void
    {
        // Extract emails and usernames from this chunk
        $emails = $rows->map(function ($row) {
            return trim($row['email'] ?? '');
        })->filter()->unique()->toArray();

        $usernames = $rows->map(function ($row) {
            return trim($row['username'] ?? '');
        })->filter()->unique()->toArray();

        // Bulk query existing users
        if (!empty($emails)) {
            $this->existingEmails = User::whereIn('email', $emails)
                ->pluck('email')
                ->flip()
                ->toArray();
        }

        if (!empty($usernames)) {
            $this->existingUsernames = User::whereIn('username', $usernames)
                ->pluck('username')
                ->flip()
                ->toArray();
        }

        Log::info('RegionTeachersImport - Bulk validation loaded', [
            'chunk_size' => $rows->count(),
            'existing_emails' => count($this->existingEmails),
            'existing_usernames' => count($this->existingUsernames),
        ]);
    }

    /**
     * Prepare row data
     */
    private function prepareRowData($row): array
    {
        return [
            // Institution lookup fields (NEW)
            'institution_utis_code' => trim($row['institution_utis_code'] ?? ''),
            'institution_code' => trim($row['institution_code'] ?? ''),
            'institution_id' => trim($row['institution_id'] ?? ''),

            'email' => trim($row['email'] ?? ''),
            'username' => trim($row['username'] ?? ''),
            'first_name' => trim($row['first_name'] ?? ''),
            'last_name' => trim($row['last_name'] ?? ''),
            'patronymic' => trim($row['patronymic'] ?? ''),
            'position_type' => trim($row['position_type'] ?? ''),
            'workplace_type' => trim($row['workplace_type'] ?? ''),
            'specialty' => $this->normalizeOptionalField($row['specialty'] ?? null),
            'main_subject' => $this->normalizeOptionalField($row['main_subject'] ?? null),
            'assessment_type' => $this->normalizeOptionalField($row['assessment_type'] ?? null),
            'assessment_score' => $this->normalizeOptionalField($row['assessment_score'] ?? null),
            'password' => trim($row['password'] ?? ''),

            // Optional fields
            'contact_phone' => trim($row['contact_phone'] ?? ''),
            'contract_start_date' => trim($row['contract_start_date'] ?? ''),
            'contract_end_date' => trim($row['contract_end_date'] ?? ''),
            'education_level' => trim($row['education_level'] ?? ''),
            'graduation_university' => trim($row['graduation_university'] ?? ''),
            'graduation_year' => trim($row['graduation_year'] ?? ''),
            'notes' => trim($row['notes'] ?? ''),
        ];
    }

    /**
     * Normalize optional string fields so empty strings are treated as null
     */
    private function normalizeOptionalField($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * Validate row data
     * Uses bulk-loaded cache for better performance
     */
    private function validateRow(array $data): \Illuminate\Validation\Validator
    {
        // Custom validation rules using cached data
        $rules = [
            // Required fields
            'email' => 'required|email',
            'username' => 'required|string|min:3|max:50',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'patronymic' => 'required|string|max:100',
            'institution_id' => 'required|exists:institutions,id',
            'position_type' => [
                'required',
                'string',
                Rule::in([
                    'direktor',
                    'direktor_muavini_tedris',
                    'direktor_muavini_inzibati',
                    'terbiye_isi_uzre_direktor_muavini',
                    'metodik_birlesme_rəhbəri',
                    'muəllim_sinif_rəhbəri',
                    'muəllim',
                    'psixoloq',
                    'kitabxanaçı',
                    'laborant',
                    'tibb_işçisi',
                    'təsərrüfat_işçisi',
                ]),
            ],
            'workplace_type' => 'required|string|in:primary,secondary',
            'specialty' => 'nullable|string|max:255',
            'main_subject' => 'nullable|string|max:255',
            'assessment_type' => 'nullable|string|in:sertifikasiya,miq_100,miq_60,diaqnostik',
            'assessment_score' => 'nullable|numeric|min:0|max:100',
            'password' => 'required|string|min:8',

            // Optional fields
            'contact_phone' => 'nullable|string|max:20',
            'contract_start_date' => 'nullable|date',
            'contract_end_date' => 'nullable|date|after_or_equal:contract_start_date',
            'education_level' => 'nullable|string|in:bachelor,master,phd',
            'graduation_university' => 'nullable|string|max:255',
            'graduation_year' => 'nullable|integer|min:1950|max:' . date('Y'),
            'notes' => 'nullable|string|max:1000',
        ];

        $validator = Validator::make($data, $rules);

        // Custom validation: Check uniqueness using cached data
        $validator->after(function ($validator) use ($data) {
            // Check email uniqueness
            if (isset($this->existingEmails[$data['email']])) {
                $validator->errors()->add('email', 'Email artıq istifadə olunur');
            }

            // Check username uniqueness
            if (isset($this->existingUsernames[$data['username']])) {
                $validator->errors()->add('username', 'Username artıq istifadə olunur');
            }
        });

        return $validator;
    }

    /**
     * Hybrid Institution Lookup (NEW)
     * Priority: UTİS code → institution_code → ID
     *
     * @param array $data Row data with possible institution identifiers
     * @return Institution|null Found institution or null
     */
    private function findInstitution(array $data): ?Institution
    {
        $utisCode = $data['institution_utis_code'] ?? '';
        $instCode = $data['institution_code'] ?? '';
        $instId = $data['institution_id'] ?? '';

        // Priority 1: UTİS Code (most reliable, government standard)
        if (!empty($utisCode)) {
            $institution = Institution::where('utis_code', $utisCode)->first();
            if ($institution) {
                Log::info('RegionTeachersImport - Institution found by UTIS code', [
                    'utis_code' => $utisCode,
                    'institution_id' => $institution->id,
                    'name' => $institution->name
                ]);
                return $institution;
            }
        }

        // Priority 2: Institution Code (human-readable, unique)
        if (!empty($instCode)) {
            $institution = Institution::where('institution_code', $instCode)->first();
            if ($institution) {
                Log::info('RegionTeachersImport - Institution found by institution_code', [
                    'institution_code' => $instCode,
                    'institution_id' => $institution->id,
                    'name' => $institution->name
                ]);
                return $institution;
            }
        }

        // Priority 3: Direct ID (backward compatibility)
        if (!empty($instId) && is_numeric($instId)) {
            $institution = Institution::find((int)$instId);
            if ($institution) {
                Log::info('RegionTeachersImport - Institution found by ID', [
                    'institution_id' => $instId,
                    'name' => $institution->name
                ]);
                return $institution;
            }
        }

        // Not found with any method
        Log::warning('RegionTeachersImport - Institution not found', [
            'utis_code' => $utisCode,
            'institution_code' => $instCode,
            'institution_id' => $instId,
        ]);

        return null;
    }

    /**
     * Check if institution belongs to region
     */
    private function isInstitutionInRegion(Institution $institution): bool
    {
        $regionChildrenIds = $this->region->getAllChildrenIds();
        return in_array($institution->id, $regionChildrenIds);
    }

    /**
     * Create new teacher
     */
    private function createTeacher(array $data): User
    {
        // Create user
        $user = User::create([
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'institution_id' => $data['institution_id'],
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        // Assign teacher role
        $user->assignRole('müəllim');

        // Create user profile
        $user->profile()->create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'patronymic' => $data['patronymic'],
            'position_type' => $data['position_type'],
            'workplace_type' => $data['workplace_type'],
            'specialty' => $data['specialty'] ?? null,
            'subjects' => $data['main_subject'] ? [$data['main_subject']] : null,
            'assessment_type' => $data['assessment_type'] ?? null,
            'assessment_score' => $data['assessment_score'] ?? null,

            // Optional fields
            'contact_phone' => $data['contact_phone'] ?: null,
            'contract_start_date' => $data['contract_start_date'] ?: null,
            'contract_end_date' => $data['contract_end_date'] ?: null,
            'education_level' => $data['education_level'] ?: null,
            'graduation_university' => $data['graduation_university'] ?: null,
            'graduation_year' => $data['graduation_year'] ?: null,
            'notes' => $data['notes'] ?: null,
        ]);

        Log::info('RegionTeachersImport - Teacher created successfully', [
            'user_id' => $user->id,
            'email' => $user->email,
            'institution_id' => $data['institution_id'],
        ]);

        return $user;
    }

    /**
     * Update existing teacher
     */
    private function updateTeacher(User $user, array $data): void
    {
        // Update user
        $user->update([
            'username' => $data['username'],
            'institution_id' => $data['institution_id'],
        ]);

        // Update password if provided
        if (!empty($data['password'])) {
            $user->update(['password' => Hash::make($data['password'])]);
        }

        // Update profile
        $user->profile()->update([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'patronymic' => $data['patronymic'],
            'position_type' => $data['position_type'],
            'workplace_type' => $data['workplace_type'],
            'specialty' => $data['specialty'] ?? null,
            'subjects' => $data['main_subject'] ? [$data['main_subject']] : null,
            'assessment_type' => $data['assessment_type'] ?? null,
            'assessment_score' => $data['assessment_score'] ?? null,

            // Optional fields
            'contact_phone' => $data['contact_phone'] ?: null,
            'contract_start_date' => $data['contract_start_date'] ?: null,
            'contract_end_date' => $data['contract_end_date'] ?: null,
            'education_level' => $data['education_level'] ?: null,
            'graduation_university' => $data['graduation_university'] ?: null,
            'graduation_year' => $data['graduation_year'] ?: null,
            'notes' => $data['notes'] ?: null,
        ]);

        Log::info('RegionTeachersImport - Teacher updated successfully', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);
    }

    /**
     * Batch size for processing
     * Increased for better performance with large imports
     */
    public function batchSize(): int
    {
        return 500; // Increased from 100 to 500
    }

    /**
     * Chunk size for reading
     * Increased for better performance with large imports
     */
    public function chunkSize(): int
    {
        return 500; // Increased from 100 to 500
    }

    /**
     * Handle errors during import
     * Implements SkipsOnError interface
     */
    public function onError(\Throwable $e): void
    {
        Log::error('RegionTeachersImport - Row processing error', [
            'error' => $e->getMessage(),
            'row' => $this->processedRows,
        ]);

        $this->errorCount++;
        $this->details['errors'][] = "Sətir {$this->processedRows}: {$e->getMessage()}";
    }

    /**
     * Handle validation failures
     * Implements SkipsOnFailure interface
     */
    public function onFailure(Failure ...$failures): void
    {
        foreach ($failures as $failure) {
            $row = $failure->row();
            $errors = implode(', ', $failure->errors());

            Log::warning('RegionTeachersImport - Validation failure', [
                'row' => $row,
                'errors' => $errors,
            ]);

            $this->errorCount++;
            $this->details['errors'][] = "Sətir {$row}: {$errors}";
        }
    }

    /**
     * Get import results
     */
    public function getResults(): array
    {
        return [
            'success_count' => $this->successCount,
            'error_count' => $this->errorCount,
            'skipped_count' => $this->skippedCount,
            'total_processed' => $this->processedRows,
            'details' => $this->details,
        ];
    }
}
