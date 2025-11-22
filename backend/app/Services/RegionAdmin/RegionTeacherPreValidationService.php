<?php

namespace App\Services\RegionAdmin;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\HeadingRowImport;
use Illuminate\Support\Facades\Log;

/**
 * RegionTeacher Pre-Validation Service
 *
 * Validates entire Excel file BEFORE starting import
 * Provides detailed error analysis with suggestions
 */
class RegionTeacherPreValidationService
{
    protected array $validRows = [];
    protected array $invalidRows = [];
    protected array $errors = [];
    protected array $warnings = [];
    protected array $errorGroups = [];
    protected array $suggestions = [];

    // Cache for performance
    protected array $existingEmails = [];
    protected array $existingUsernames = [];
    protected array $institutionCache = [];

    /**
     * Validate entire Excel file before import
     *
     * @param UploadedFile $file
     * @param Institution $region
     * @return array Comprehensive validation report
     */
    public function validateFile(UploadedFile $file, Institution $region): array
    {
        Log::info('🔍 Pre-validation started', [
            'filename' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'region_id' => $region->id,
        ]);

        $startTime = microtime(true);

        try {
            // Step 1: Validate file structure
            $this->validateFileStructure($file);

            // Step 2: Load data
            $rows = $this->loadExcelData($file);

            if (empty($rows)) {
                return $this->buildErrorResponse('Fayl boşdur və ya düzgün formatda deyil');
            }

            // Step 3: Pre-load caches for performance
            $this->preloadCaches($rows, $region);

            // Step 4: Validate each row
            $rowNumber = 1; // Start from 1 (excluding header)
            foreach ($rows as $row) {
                $rowNumber++;
                $this->validateRow($row, $rowNumber, $region);
            }

            // Step 5: Generate suggestions
            $this->generateSuggestions();

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            Log::info('✅ Pre-validation completed', [
                'total_rows' => count($rows),
                'valid_rows' => count($this->validRows),
                'invalid_rows' => count($this->invalidRows),
                'execution_time_ms' => $executionTime,
            ]);

            return $this->buildSuccessResponse($executionTime);

        } catch (\Exception $e) {
            Log::error('❌ Pre-validation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->buildErrorResponse($e->getMessage());
        }
    }

    /**
     * Validate file structure and format
     */
    protected function validateFileStructure(UploadedFile $file): void
    {
        // Check file extension
        $allowedExtensions = ['xlsx', 'xls'];
        $extension = strtolower($file->getClientOriginalExtension());

        if (!in_array($extension, $allowedExtensions)) {
            throw new \Exception('Yalnız .xlsx və .xls faylları qəbul edilir');
        }

        // Check file size (10MB limit)
        $maxSize = 10 * 1024 * 1024;
        if ($file->getSize() > $maxSize) {
            throw new \Exception('Fayl ölçüsü 10MB-dan çox ola bilməz');
        }

        // Validate headers
        $headings = Excel::toArray(new HeadingRowImport, $file)[0] ?? [];

        if (empty($headings)) {
            throw new \Exception('Excel faylında başlıq sətri tapılmadı');
        }

        $requiredColumns = [
            'email',
            'username',
            'first_name',
            'last_name',
            'patronymic',
            'position_type',
            'workplace_type',
            'password',
        ];

        $missingColumns = [];
        foreach ($requiredColumns as $column) {
            if (!in_array($column, $headings)) {
                $missingColumns[] = $column;
            }
        }

        if (!empty($missingColumns)) {
            throw new \Exception(
                'Tələb olunan sütunlar tapılmadı: ' . implode(', ', $missingColumns)
            );
        }
    }

    /**
     * Load Excel data
     */
    protected function loadExcelData(UploadedFile $file): array
    {
        $data = Excel::toArray([], $file);

        if (empty($data) || empty($data[0])) {
            return [];
        }

        // Get headers and rows
        $headers = $data[0][0]; // First row
        $rows = array_slice($data[0], 1); // Skip header

        // Convert to associative arrays
        $result = [];
        foreach ($rows as $row) {
            $rowData = [];
            foreach ($headers as $index => $header) {
                $rowData[$header] = $row[$index] ?? null;
            }

            // Skip empty rows
            if (!empty(trim($rowData['email'] ?? ''))) {
                $result[] = $rowData;
            }
        }

        return $result;
    }

    /**
     * Pre-load caches for performance optimization
     */
    protected function preloadCaches(array $rows, Institution $region): void
    {
        // Load existing emails in bulk
        $emails = array_filter(array_column($rows, 'email'));
        if (!empty($emails)) {
            $this->existingEmails = User::whereIn('email', $emails)
                ->pluck('email')
                ->flip()
                ->toArray();
        }

        // Load existing usernames in bulk
        $usernames = array_filter(array_column($rows, 'username'));
        if (!empty($usernames)) {
            $this->existingUsernames = User::whereIn('username', $usernames)
                ->pluck('username')
                ->flip()
                ->toArray();
        }

        // Load institutions for this region
        $childrenIds = $region->getAllChildrenIds();
        $institutions = Institution::whereIn('id', $childrenIds)
            ->get(['id', 'utis_code', 'institution_code', 'name', 'level']);

        foreach ($institutions as $inst) {
            // Index by ID
            $this->institutionCache['id'][$inst->id] = $inst;

            // Index by UTIS code
            if ($inst->utis_code) {
                $this->institutionCache['utis'][$inst->utis_code] = $inst;
            }

            // Index by institution code
            if ($inst->institution_code) {
                $this->institutionCache['code'][$inst->institution_code] = $inst;
            }
        }

        Log::info('📦 Caches preloaded', [
            'existing_emails' => count($this->existingEmails),
            'existing_usernames' => count($this->existingUsernames),
            'institutions' => count($institutions),
        ]);
    }

    /**
     * Validate single row
     */
    protected function validateRow(array $row, int $rowNumber, Institution $region): void
    {
        $rowErrors = [];
        $rowWarnings = [];

        // Prepare row data
        $data = $this->prepareRowData($row);

        // VALIDATION 1: Institution lookup
        $institution = $this->findInstitution($data);
        if (!$institution) {
            $identifier = $data['institution_utis_code'] ?:
                         ($data['institution_code'] ?: $data['institution_id']);

            $rowErrors[] = [
                'field' => 'institution',
                'value' => $identifier ?: '(boş)',
                'severity' => 'critical',
                'message' => 'Müəssisə tapılmadı',
                'suggestion' => '2-ci vərəqdə (Institutions) müəssisə siyahısına baxın. UTİS kod və ya institution_code istifadə edin.',
            ];

            $this->incrementErrorGroup('missing_institution');
        } else {
            $data['institution_id'] = $institution->id;
        }

        // VALIDATION 2: Field validation
        $validator = $this->validateRowFields($data);

        if ($validator->fails()) {
            foreach ($validator->errors()->messages() as $field => $messages) {
                $currentValue = $data[$field] ?? null;

                foreach ($messages as $message) {
                    $error = [
                        'field' => $field,
                        'value' => $currentValue,
                        'severity' => 'critical',
                        'message' => $message,
                        'suggestion' => $this->getSuggestionForField($field, $currentValue),
                    ];

                    $rowErrors[] = $error;
                    $this->incrementErrorGroup($this->categorizeError($field, $message));
                }
            }
        }

        // VALIDATION 3: Duplicate checks
        $duplicateChecks = $this->checkDuplicates($data, $rowNumber);
        $rowErrors = array_merge($rowErrors, $duplicateChecks);

        // VALIDATION 4: Warnings for optional fields
        $optionalWarnings = $this->checkOptionalFields($data);
        $rowWarnings = array_merge($rowWarnings, $optionalWarnings);

        // Store results
        if (empty($rowErrors)) {
            $this->validRows[] = [
                'row_number' => $rowNumber,
                'data' => $data,
            ];
        } else {
            $this->invalidRows[] = [
                'row_number' => $rowNumber,
                'data' => $data,
                'errors' => $rowErrors,
            ];

            // Add to global errors list
            foreach ($rowErrors as $error) {
                $this->errors[] = array_merge($error, [
                    'row_number' => $rowNumber,
                ]);
            }
        }

        // Store warnings
        if (!empty($rowWarnings)) {
            foreach ($rowWarnings as $warning) {
                $this->warnings[] = array_merge($warning, [
                    'row_number' => $rowNumber,
                ]);
            }
        }
    }

    /**
     * Prepare row data
     */
    protected function prepareRowData(array $row): array
    {
        return [
            // Institution lookup fields
            'institution_utis_code' => trim($row['institution_utis_code'] ?? ''),
            'institution_code' => trim($row['institution_code'] ?? ''),
            'institution_id' => trim($row['institution_id'] ?? ''),

            // Required fields
            'email' => trim($row['email'] ?? ''),
            'username' => trim($row['username'] ?? ''),
            'first_name' => trim($row['first_name'] ?? ''),
            'last_name' => trim($row['last_name'] ?? ''),
            'patronymic' => trim($row['patronymic'] ?? ''),
            'position_type' => trim($row['position_type'] ?? ''),
            'workplace_type' => trim($row['workplace_type'] ?? ''),
            'password' => trim($row['password'] ?? ''),

            // Optional fields
            'specialty' => trim($row['specialty'] ?? ''),
            'main_subject' => trim($row['main_subject'] ?? ''),
            'assessment_type' => trim($row['assessment_type'] ?? ''),
            'assessment_score' => trim($row['assessment_score'] ?? ''),
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
     * Find institution using hybrid lookup
     */
    protected function findInstitution(array $data): ?Institution
    {
        $utisCode = $data['institution_utis_code'];
        $instCode = $data['institution_code'];
        $instId = $data['institution_id'];

        // Priority 1: UTIS code
        if (!empty($utisCode) && isset($this->institutionCache['utis'][$utisCode])) {
            return $this->institutionCache['utis'][$utisCode];
        }

        // Priority 2: Institution code
        if (!empty($instCode) && isset($this->institutionCache['code'][$instCode])) {
            return $this->institutionCache['code'][$instCode];
        }

        // Priority 3: ID
        if (!empty($instId) && is_numeric($instId) && isset($this->institutionCache['id'][$instId])) {
            return $this->institutionCache['id'][$instId];
        }

        return null;
    }

    /**
     * Validate row fields
     */
    protected function validateRowFields(array $data): \Illuminate\Validation\Validator
    {
        $rules = [
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
            'assessment_type' => 'nullable|string|in:sertifikasiya,miq_100,miq_60,diaqnostik',
            'assessment_score' => 'nullable|numeric|min:0|max:100',
            'password' => 'required|string|min:8',
            'contact_phone' => 'nullable|string|max:20',
            'contract_start_date' => 'nullable|date',
            'contract_end_date' => 'nullable|date|after_or_equal:contract_start_date',
            'education_level' => 'nullable|string|in:bachelor,master,phd',
            'graduation_year' => 'nullable|integer|min:1950|max:' . date('Y'),
        ];

        return Validator::make($data, $rules);
    }

    /**
     * Check for duplicates
     */
    protected function checkDuplicates(array $data, int $rowNumber): array
    {
        $errors = [];

        // Check email
        if (isset($this->existingEmails[$data['email']])) {
            $errors[] = [
                'field' => 'email',
                'value' => $data['email'],
                'severity' => 'critical',
                'message' => 'Email artıq sistemdə mövcuddur',
                'suggestion' => 'Fərqli email istifadə edin və ya "Mövcudları yenilə" seçimini aktivləşdirin',
            ];
            $this->incrementErrorGroup('duplicate_email');
        }

        // Check username
        if (isset($this->existingUsernames[$data['username']])) {
            $errors[] = [
                'field' => 'username',
                'value' => $data['username'],
                'severity' => 'critical',
                'message' => 'Username artıq sistemdə mövcuddur',
                'suggestion' => 'Fərqli username istifadə edin',
            ];
            $this->incrementErrorGroup('duplicate_username');
        }

        return $errors;
    }

    /**
     * Check optional fields for warnings
     */
    protected function checkOptionalFields(array $data): array
    {
        $warnings = [];

        // Warn if specialty is empty for teachers
        if ($data['position_type'] === 'muəllim' && empty($data['specialty'])) {
            $warnings[] = [
                'field' => 'specialty',
                'value' => null,
                'severity' => 'warning',
                'message' => 'Müəllim üçün ixtisas göstərilməyib',
                'suggestion' => 'İxtisas sahəsini doldurmaq tövsiyyə olunur',
            ];
        }

        // Warn if assessment info is missing
        if (empty($data['assessment_type']) && !empty($data['assessment_score'])) {
            $warnings[] = [
                'field' => 'assessment_type',
                'value' => null,
                'severity' => 'warning',
                'message' => 'Qiymətləndirmə balı var, amma növü göstərilməyib',
                'suggestion' => 'assessment_type sahəsini doldurun',
            ];
        }

        return $warnings;
    }

    /**
     * Get suggestion for specific field error
     */
    protected function getSuggestionForField(string $field, $value): ?string
    {
        $suggestions = [
            'position_type' => 'Düzgün dəyərlər: muəllim, direktor, psixoloq, kitabxanaçı və s. (3-cü vərəqdə tam siyahı)',
            'workplace_type' => 'İstifadə edin: "primary" (1-4 siniflər) və ya "secondary" (5-11 siniflər)',
            'email' => 'Düzgün email formatı: example@domain.com',
            'password' => 'Minimum 8 simvol tələb olunur',
            'assessment_type' => 'Qəbul edilən dəyərlər: sertifikasiya, miq_100, miq_60, diaqnostik',
            'education_level' => 'Qəbul edilən dəyərlər: bachelor, master, phd',
        ];

        return $suggestions[$field] ?? null;
    }

    /**
     * Categorize error for grouping
     */
    protected function categorizeError(string $field, string $message): string
    {
        if (str_contains($field, 'institution')) {
            return 'invalid_institution';
        }

        if ($field === 'position_type') {
            return 'invalid_position_type';
        }

        if ($field === 'email') {
            return 'invalid_email';
        }

        if (str_contains($message, 'format')) {
            return 'invalid_format';
        }

        if (str_contains($message, 'required')) {
            return 'missing_required_field';
        }

        return 'other';
    }

    /**
     * Increment error group counter
     */
    protected function incrementErrorGroup(string $group): void
    {
        if (!isset($this->errorGroups[$group])) {
            $this->errorGroups[$group] = 0;
        }
        $this->errorGroups[$group]++;
    }

    /**
     * Generate helpful suggestions
     */
    protected function generateSuggestions(): void
    {
        // Suggestion based on error groups
        if (isset($this->errorGroups['missing_institution']) && $this->errorGroups['missing_institution'] > 0) {
            $this->suggestions[] = '📌 ' . $this->errorGroups['missing_institution'] . ' sətirdə müəssisə məlumatı yoxdur. 2-ci vərəqdə (Institutions) müəssisə siyahısına baxın və UTİS kod və ya institution_code istifadə edin.';
        }

        if (isset($this->errorGroups['invalid_position_type']) && $this->errorGroups['invalid_position_type'] > 0) {
            $this->suggestions[] = '📌 Vəzifə növləri düzgün yazılmalıdır. Məsələn: "muəllim" (e ilə), "müəllim" yox! 3-cü vərəqdə tam siyahıya baxın.';
        }

        if (isset($this->errorGroups['duplicate_email']) && $this->errorGroups['duplicate_email'] > 0) {
            $this->suggestions[] = '📌 ' . $this->errorGroups['duplicate_email'] . ' email artıq sistemdə mövcuddur. Fərqli email istifadə edin və ya "Mövcudları yenilə" seçimini aktivləşdirin.';
        }

        if (count($this->validRows) > 0 && count($this->invalidRows) > 0) {
            $this->suggestions[] = '✅ Seçim: ' . count($this->validRows) . ' düzgün sətri indi import edə, xətalı sətirlər üçün Excel faylı yükləyə bilərsiniz.';
        }

        if (count($this->invalidRows) > 100) {
            $this->suggestions[] = '⚠️ Çox sayda xəta var (' . count($this->invalidRows) . '). Template faylı yenidən yükləyin və nümunələrə baxın.';
        }
    }

    /**
     * Build success response
     */
    protected function buildSuccessResponse(float $executionTime): array
    {
        $totalRows = count($this->validRows) + count($this->invalidRows);
        $validPercentage = $totalRows > 0 ? round((count($this->validRows) / $totalRows) * 100, 2) : 0;

        return [
            'success' => true,
            'summary' => [
                'total_rows' => $totalRows,
                'valid_rows' => count($this->validRows),
                'invalid_rows' => count($this->invalidRows),
                'warnings' => count($this->warnings),
                'critical_errors' => count($this->errors),
                'valid_percentage' => $validPercentage,
                'can_proceed_with_skip' => count($this->validRows) > 0,
                'execution_time_ms' => $executionTime,
            ],
            'valid_rows' => $this->validRows,
            'invalid_rows' => $this->invalidRows,
            'errors' => array_slice($this->errors, 0, 100), // First 100 errors
            'warnings' => array_slice($this->warnings, 0, 50), // First 50 warnings
            'error_groups' => $this->errorGroups,
            'suggestions' => $this->suggestions,
            'message' => count($this->invalidRows) === 0
                ? '✅ Bütün sətirlər düzgündür. Import edə bilərsiniz!'
                : '⚠️ ' . count($this->invalidRows) . ' sətirdə xəta tapıldı. Düzəldin və ya xətaları ötürərək davam edin.',
        ];
    }

    /**
     * Build error response
     */
    protected function buildErrorResponse(string $message): array
    {
        return [
            'success' => false,
            'message' => $message,
            'summary' => [
                'total_rows' => 0,
                'valid_rows' => 0,
                'invalid_rows' => 0,
                'warnings' => 0,
                'critical_errors' => 1,
                'can_proceed_with_skip' => false,
            ],
            'errors' => [
                [
                    'row_number' => 0,
                    'field' => 'file',
                    'value' => null,
                    'severity' => 'critical',
                    'message' => $message,
                    'suggestion' => 'Faylın formatını və strukturunu yoxlayın',
                ]
            ],
            'suggestions' => [
                '📥 Template faylı yenidən yükləyin və nümunələrə baxın',
            ],
        ];
    }
}
