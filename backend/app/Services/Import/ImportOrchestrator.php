<?php

namespace App\Services\Import;

use App\Models\Institution;
use App\Models\InstitutionType;
use App\Models\User;
use App\Services\Import\InstitutionExcelTemplateService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

/**
 * Central orchestrator for all import operations
 * Coordinates between different services and manages import workflows
 */
class ImportOrchestrator
{
    protected InstitutionExcelTemplateService $templateService;
    protected array $importResults = [];
    protected array $validationErrors = [];

    // Batch processing cache to avoid N+1 queries
    protected array $existingInstitutionsByUtis = [];
    protected array $existingInstitutionsByCode = [];
    protected array $existingUsersByUsername = [];
    protected array $existingUsersByEmail = [];

    public function __construct()
    {
        $this->templateService = new InstitutionExcelTemplateService();
    }

    /**
     * Main entry point for institution import by type
     */
    public function importInstitutionsByType(UploadedFile $file, string $institutionTypeKey): array
    {
        try {
            // Reset import results
            $this->resetImportState();

            // Get institution type
            $institutionType = InstitutionType::where('key', $institutionTypeKey)->firstOrFail();

            // Load and validate Excel file
            $spreadsheet = $this->loadExcelFile($file);

            // Parse Excel data
            $data = $this->parseExcelData($spreadsheet, $institutionType);

            Log::info('Excel data parsed', [
                'institution_type' => $institutionTypeKey,
                'parsed_rows' => count($data),
                'sample_data' => $data ? array_slice($data, 0, 2) : []
            ]);

            // Validate parsed data
            $this->validateImportData($data, $institutionType);

            Log::info('Validation completed', [
                'validation_errors_count' => count($this->validationErrors),
                'validation_errors' => $this->validationErrors
            ]);

            if (!empty($this->validationErrors)) {
                // Add helpful context for common errors
                $errorMessage = 'Excel faylında validasiya xətaları tapıldı. Zəhmət olmasa düzəltdikdən sonra yenidən cəhd edin.';

                // Check if parent_id errors are common and add specific help
                $parentIdErrors = 0;
                foreach ($this->validationErrors as $rowErrors) {
                    if (isset($rowErrors['parent_id'])) {
                        $parentIdErrors++;
                    }
                }

                if ($parentIdErrors > 0) {
                    $errorMessage .= "\n\n📋 KÖMƏK - ÜST MÜƏSSİSƏ ID PROBLEMİ:";
                    $errorMessage .= "\n1. Excel faylında 'Üst Müəssisələr' sheet-ini açın";
                    $errorMessage .= "\n2. Lazımi müəssisənin ID-sini (A sütunu) kopyalayın";
                    $errorMessage .= "\n3. Əsas sheet-də J sütununa yapışdırın";
                    $errorMessage .= "\n4. Həmçinin müəssisə adını da yaza bilərsiniz (sistem avtomatik tapacaq)";
                }

                return $this->buildErrorResponse($errorMessage, $this->validationErrors);
            }

            // Import institutions with transaction
            Log::info('Starting import execution', [
                'data_count' => count($data)
            ]);

            $importedCount = $this->executeImport($data, $institutionType);

            Log::info('Import execution completed', [
                'imported_count' => $importedCount,
                'import_results' => $this->importResults
            ]);

            return $this->buildSuccessResponse($importedCount);

        } catch (\Exception $e) {
            Log::error('Institution import error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'institution_type' => $institutionTypeKey
            ]);

            return $this->buildErrorResponse('İdxal zamanı səhv: ' . $e->getMessage());
        }
    }

    /**
     * Load and validate Excel file structure
     */
    protected function loadExcelFile(UploadedFile $file): \PhpOffice\PhpSpreadsheet\Spreadsheet
    {
        // Validate file
        if (!$file->isValid()) {
            throw new \Exception('Fayl yüklənmədi və ya zədələnib');
        }

        // Check file size (10MB limit)
        if ($file->getSize() > 10485760) {
            throw new \Exception('Fayl ölçüsü 10MB-dan böyük ola bilməz');
        }

        // Check file extension
        $allowedExtensions = ['xlsx', 'xls'];
        $extension = $file->getClientOriginalExtension();
        if (!in_array(strtolower($extension), $allowedExtensions)) {
            throw new \Exception('Yalnız Excel faylları (.xlsx, .xls) qəbul edilir');
        }

        // Load spreadsheet
        try {
            return IOFactory::load($file->getPathname());
        } catch (\Exception $e) {
            throw new \Exception('Excel faylı oxuna bilmədi: ' . $e->getMessage());
        }
    }

    /**
     * Parse Excel data into structured array
     */
    protected function parseExcelData(\PhpOffice\PhpSpreadsheet\Spreadsheet $spreadsheet, InstitutionType $institutionType): array
    {
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();
        $data = [];

        Log::info('Parsing Excel sheet', [
            'sheet_name' => $sheet->getTitle(),
            'highest_row' => $highestRow,
            'institution_type' => $institutionType->key
        ]);

        // Get institution level
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        // Skip header row and start from row 2
        for ($row = 2; $row <= $highestRow; $row++) {
            // Check if row has any data
            $hasData = false;
            for ($col = 'A'; $col <= 'T'; $col++) {
                if (!empty(trim($sheet->getCell($col . $row)->getCalculatedValue()))) {
                    $hasData = true;
                    break;
                }
            }

            if (!$hasData) {
                continue; // Skip empty rows
            }

            $rowData = [
                'row' => $row,
                'name' => trim($sheet->getCell('A' . $row)->getCalculatedValue()),
                'short_name' => trim($sheet->getCell('B' . $row)->getCalculatedValue()),
                'institution_code' => trim($sheet->getCell('C' . $row)->getCalculatedValue()),
                'utis_code' => trim($sheet->getCell('D' . $row)->getCalculatedValue()),
                'region_code' => trim($sheet->getCell('E' . $row)->getCalculatedValue()),
                'contact_info' => trim($sheet->getCell('F' . $row)->getCalculatedValue()),
                'location' => trim($sheet->getCell('G' . $row)->getCalculatedValue()),
                'established_date' => $this->parseDate($sheet->getCell('H' . $row)),
                'is_active' => $this->parseActiveStatus($sheet->getCell('I' . $row)->getCalculatedValue()),
            ];

            // Add parent_id for levels 2+
            if ($institutionLevel >= 2) {
                $parentIdRaw = trim($sheet->getCell('J' . $row)->getCalculatedValue());
                $rowData['parent_id'] = $this->parseParentId($parentIdRaw);
            }

            // Add school-specific fields
            if (in_array($institutionType->key, ['secondary_school', 'lyceum', 'gymnasium', 'tam_orta_mekteb'])) {
                $rowData['class_count'] = (int) $sheet->getCell('K' . $row)->getCalculatedValue();
                $rowData['student_count'] = (int) $sheet->getCell('L' . $row)->getCalculatedValue();
                $rowData['teacher_count'] = (int) $sheet->getCell('M' . $row)->getCalculatedValue();
            }

            // Add SchoolAdmin data for level 4 institutions
            if ($institutionLevel == 4) {
                $rowData['schooladmin'] = [
                    'username' => trim($sheet->getCell('N' . $row)->getCalculatedValue()),
                    'email' => trim($sheet->getCell('O' . $row)->getCalculatedValue()),
                    'password' => trim($sheet->getCell('P' . $row)->getCalculatedValue()),
                    'first_name' => trim($sheet->getCell('Q' . $row)->getCalculatedValue()),
                    'last_name' => trim($sheet->getCell('R' . $row)->getCalculatedValue()),
                    'phone' => trim($sheet->getCell('S' . $row)->getCalculatedValue()),
                    'department' => trim($sheet->getCell('T' . $row)->getCalculatedValue()),
                ];
            }

            $data[] = $rowData;
        }

        return $data;
    }

    /**
     * Validate import data
     */
    protected function validateImportData(array $data, InstitutionType $institutionType): void
    {
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        foreach ($data as $index => $rowData) {
            $rowErrors = [];

            // Basic validation rules
            $rules = [
                'name' => 'required|string|max:255',
                'short_name' => 'nullable|string|max:100',
                'institution_code' => 'nullable|string|max:50',
                'utis_code' => 'nullable|string|max:50',
                'region_code' => 'nullable|string|max:10',
                'contact_info' => 'nullable|json',
                'location' => 'nullable|json',
                'established_date' => 'nullable|date',
                'is_active' => 'required|boolean',
            ];

            // Add parent_id validation for levels 2+
            if ($institutionLevel >= 2) {
                $rules['parent_id'] = 'required|integer|exists:institutions,id';
            }

            // Custom validation messages
            $messages = [
                'name.required' => 'Müəssisə adı mütləqdir',
                'parent_id.required' => 'Üst müəssisə ID-si mütləqdir (J sütunu). "Üst Müəssisələr" sheet-indən ID kopyalayın və ya müəssisə adını yazın.',
                'parent_id.integer' => 'Üst müəssisə ID-si rəqəm olmalıdır və ya müəssisə adını yazın',
                'parent_id.exists' => 'Daxil edilən üst müəssisə tapılmadı. "Üst Müəssisələr" sheet-indən mövcud ID götürün və ya dəqiq ad yazın.',
                'is_active.required' => 'Status sahəsi mütləqdir (aktiv və ya qeyri-aktiv)',
                'schooladmin.username.required' => 'SchoolAdmin istifadəçi adı mütləqdir (N sütunu)',
                'schooladmin.email.required' => 'SchoolAdmin email mütləqdir (O sütunu)',
                'schooladmin.email.email' => 'SchoolAdmin email formatı düzgün deyil',
                'schooladmin.email.unique' => 'Bu email artıq istifadə olunur',
                'schooladmin.username.unique' => 'Bu istifadəçi adı artıq istifadə olunur',
                'schooladmin.password.required' => 'SchoolAdmin şifrəsi mütləqdir (P sütunu)',
                'schooladmin.password.min' => 'SchoolAdmin şifrəsi minimum 8 simvol olmalıdır',
            ];

            // Add SchoolAdmin validation for level 4
            if ($institutionLevel == 4) {
                $rules['schooladmin.username'] = 'required|string|max:255|unique:users,username';
                $rules['schooladmin.email'] = 'required|email|max:255|unique:users,email';
                $rules['schooladmin.password'] = 'required|string|min:8';
                $rules['schooladmin.first_name'] = 'nullable|string|max:255';
                $rules['schooladmin.last_name'] = 'nullable|string|max:255';
                $rules['schooladmin.phone'] = 'nullable|string|max:20';
                $rules['schooladmin.department'] = 'nullable|string|max:255';
            }

            $validator = Validator::make($rowData, $rules, $messages);

            if ($validator->fails()) {
                $rowErrors = $validator->errors()->toArray();
                $this->validationErrors["Sətir {$rowData['row']}"] = $rowErrors;
            }
        }
    }

    /**
     * Execute the import process with chunked processing for large datasets
     */
    protected function executeImport(array $data, InstitutionType $institutionType): int
    {
        $totalRows = count($data);

        // For large datasets (>50 rows), use chunked processing
        if ($totalRows > 50) {
            return $this->executeChunkedImport($data, $institutionType);
        }

        // For small datasets, use single transaction
        return DB::transaction(function () use ($data, $institutionType) {
            $importedCount = 0;
            $institutionLevel = $institutionType->level ?? $institutionType->default_level;

            foreach ($data as $rowData) {
                try {
                    // Skip sample data rows
                    if ($this->isSampleRow($rowData)) {
                        $this->importResults[] = $this->formatSkipMessage($rowData, "Nümunə sətri");
                        continue;
                    }

                    // Check for duplicate UTIS codes
                    if ($this->isDuplicateUtisCode($rowData['utis_code'])) {
                        $existingInstitution = $this->getInstitutionByUtisCode($rowData['utis_code']);
                        $this->importResults[] = $this->formatDuplicateMessage($rowData, $existingInstitution);
                        continue;
                    }

                    // Create institution
                    $institution = $this->createInstitution($rowData, $institutionType);

                    // Create SchoolAdmin user if level 4
                    $schoolAdminInfo = null;
                    if ($institutionLevel == 4 && isset($rowData['schooladmin'])) {
                        $schoolAdmin = $this->createSchoolAdmin($rowData['schooladmin'], $institution);
                        $schoolAdminInfo = [
                            'username' => $schoolAdmin->username,
                            'email' => $schoolAdmin->email,
                            'original_username' => $rowData['schooladmin']['username'] ?? '',
                            'original_email' => $rowData['schooladmin']['email'] ?? ''
                        ];
                    }

                    $importedCount++;
                    $this->importResults[] = $this->formatSuccessMessage($rowData, $institution, $schoolAdminInfo);

                } catch (\Exception $e) {
                    Log::error("Institution import row error", [
                        'row' => $rowData['row'],
                        'error' => $e->getMessage(),
                        'institution_name' => $rowData['name'] ?? 'N/A'
                    ]);

                    $this->importResults[] = $this->formatErrorMessage($rowData, $e);
                }
            }

            return $importedCount;
        });
    }

    /**
     * Execute chunked import for large datasets to prevent timeouts
     */
    protected function executeChunkedImport(array $data, InstitutionType $institutionType): int
    {
        $totalRows = count($data);
        $chunkSize = 25; // Process 25 records at a time
        $totalImported = 0;
        $chunks = array_chunk($data, $chunkSize);
        $totalChunks = count($chunks);

        Log::info('Starting chunked import', [
            'total_rows' => $totalRows,
            'chunk_size' => $chunkSize,
            'total_chunks' => $totalChunks,
            'institution_type' => $institutionType->key
        ]);

        foreach ($chunks as $chunkIndex => $chunk) {
            $chunkNumber = $chunkIndex + 1;

            try {
                Log::info("Processing chunk {$chunkNumber}/{$totalChunks}", [
                    'chunk_size' => count($chunk),
                    'rows' => array_column($chunk, 'row')
                ]);

                // Process each chunk in its own transaction
                $chunkImported = DB::transaction(function () use ($chunk, $institutionType) {
                    return $this->processChunk($chunk, $institutionType);
                });

                $totalImported += $chunkImported;

                Log::info("Chunk {$chunkNumber} completed", [
                    'imported_in_chunk' => $chunkImported,
                    'total_imported_so_far' => $totalImported
                ]);

                // Add a small delay between chunks to prevent resource exhaustion
                if ($chunkNumber < $totalChunks) {
                    usleep(100000); // 100ms delay
                }

            } catch (\Exception $e) {
                Log::error("Chunk {$chunkNumber} failed", [
                    'error' => $e->getMessage(),
                    'chunk_data' => array_column($chunk, 'name')
                ]);

                // Add error messages for this chunk
                foreach ($chunk as $rowData) {
                    $this->importResults[] = "❌ {$rowData['row']}: Chunk işleme xətası";
                }
            }
        }

        Log::info('Chunked import completed', [
            'total_imported' => $totalImported,
            'total_chunks_processed' => $totalChunks
        ]);

        return $totalImported;
    }

    /**
     * Process a single chunk of data with optimized batch queries
     */
    protected function processChunk(array $chunk, InstitutionType $institutionType): int
    {
        $importedCount = 0;
        $institutionLevel = $institutionType->level ?? $institutionType->default_level;

        // Pre-load existing data to avoid N+1 queries
        $this->preloadExistingData($chunk);

        foreach ($chunk as $rowData) {
            try {
                // Skip sample data rows
                if ($this->isSampleRow($rowData)) {
                    $this->importResults[] = $this->formatSkipMessage($rowData, "Nümunə sətri");
                    continue;
                }

                // Check for duplicate UTIS codes using pre-loaded data
                if ($this->isDuplicateUtisCodeBatch($rowData['utis_code'])) {
                    $existingInstitution = $this->getInstitutionByUtisCodeBatch($rowData['utis_code']);
                    $this->importResults[] = $this->formatDuplicateMessage($rowData, $existingInstitution);
                    continue;
                }

                // Create institution
                $institution = $this->createInstitution($rowData, $institutionType);

                // Create SchoolAdmin user if level 4
                $schoolAdminInfo = null;
                if ($institutionLevel == 4 && isset($rowData['schooladmin'])) {
                    $schoolAdmin = $this->createSchoolAdmin($rowData['schooladmin'], $institution);
                    $schoolAdminInfo = [
                        'username' => $schoolAdmin->username,
                        'email' => $schoolAdmin->email,
                        'original_username' => $rowData['schooladmin']['username'] ?? '',
                        'original_email' => $rowData['schooladmin']['email'] ?? ''
                    ];
                }

                $importedCount++;
                $this->importResults[] = $this->formatSuccessMessage($rowData, $institution, $schoolAdminInfo);

            } catch (\Exception $e) {
                Log::error("Institution import row error in chunk", [
                    'row' => $rowData['row'],
                    'error' => $e->getMessage(),
                    'institution_name' => $rowData['name'] ?? 'N/A'
                ]);

                $this->importResults[] = $this->formatErrorMessage($rowData, $e);
            }
        }

        return $importedCount;
    }

    /**
     * Pre-load existing data to avoid N+1 queries
     */
    protected function preloadExistingData(array $chunk): void
    {
        // Get all UTIS codes from chunk
        $utisCodes = array_filter(array_column($chunk, 'utis_code'));

        // Get all institution codes from chunk
        $institutionCodes = array_filter(array_column($chunk, 'institution_code'));

        // Get all usernames and emails from chunk
        $usernames = [];
        $emails = [];
        foreach ($chunk as $rowData) {
            if (isset($rowData['schooladmin']['username'])) {
                $usernames[] = $rowData['schooladmin']['username'];
            }
            if (isset($rowData['schooladmin']['email'])) {
                $emails[] = $rowData['schooladmin']['email'];
            }
        }

        // Batch load existing institutions
        if (!empty($utisCodes)) {
            $this->existingInstitutionsByUtis = Institution::whereIn('utis_code', $utisCodes)
                ->get()
                ->keyBy('utis_code')
                ->toArray();
        }

        if (!empty($institutionCodes)) {
            $this->existingInstitutionsByCode = Institution::whereIn('institution_code', $institutionCodes)
                ->get()
                ->keyBy('institution_code')
                ->toArray();
        }

        // Batch load existing users
        if (!empty($usernames)) {
            $this->existingUsersByUsername = User::whereIn('username', $usernames)
                ->get()
                ->keyBy('username')
                ->toArray();
        }

        if (!empty($emails)) {
            $this->existingUsersByEmail = User::whereIn('email', $emails)
                ->get()
                ->keyBy('email')
                ->toArray();
        }
    }

    /**
     * Batch check for duplicate UTIS codes
     */
    protected function isDuplicateUtisCodeBatch(string $utisCode): bool
    {
        if (empty($utisCode)) {
            return false;
        }

        return isset($this->existingInstitutionsByUtis[$utisCode]);
    }

    /**
     * Get institution by UTIS code from batch data
     */
    protected function getInstitutionByUtisCodeBatch(string $utisCode): ?Institution
    {
        if (empty($utisCode) || !isset($this->existingInstitutionsByUtis[$utisCode])) {
            return null;
        }

        $data = $this->existingInstitutionsByUtis[$utisCode];
        $institution = new Institution();
        $institution->fill($data);
        return $institution;
    }

    /**
     * Create institution from row data
     */
    protected function createInstitution(array $rowData, InstitutionType $institutionType): Institution
    {
        // Handle empty contact_info and location - ensure valid JSON
        $contactInfo = !empty($rowData['contact_info']) ? $rowData['contact_info'] : '{}';
        $location = !empty($rowData['location']) ? $rowData['location'] : '{}';

        // Decode JSON if it's a string, otherwise use as-is
        if (is_string($contactInfo)) {
            $contactInfoData = json_decode($contactInfo, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $contactInfoData = []; // Default to empty array if invalid JSON
            }
        } else {
            $contactInfoData = $contactInfo ?: [];
        }

        if (is_string($location)) {
            $locationData = json_decode($location, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $locationData = []; // Default to empty array if invalid JSON
            }
        } else {
            $locationData = $location ?: [];
        }

        $institutionData = [
            'name' => $rowData['name'],
            'short_name' => $rowData['short_name'],
            'institution_code' => $rowData['institution_code'],
            'utis_code' => $rowData['utis_code'],
            'region_code' => $rowData['region_code'] ?: '',
            'contact_info' => $contactInfoData,
            'location' => $locationData,
            'established_date' => $rowData['established_date'],
            'is_active' => $rowData['is_active'],
            'type' => $institutionType->key, // CRITICAL: Missing type field added!
            'institution_type_id' => $institutionType->id,
            'level' => $institutionType->level ?? $institutionType->default_level,
        ];

        // Add parent_id if provided
        if (isset($rowData['parent_id'])) {
            $institutionData['parent_id'] = $rowData['parent_id'];
        }

        // Add school-specific fields
        if (isset($rowData['class_count'])) {
            $institutionData['class_count'] = $rowData['class_count'];
            $institutionData['student_count'] = $rowData['student_count'];
            $institutionData['teacher_count'] = $rowData['teacher_count'];
        }

        return Institution::create($institutionData);
    }

    /**
     * Create SchoolAdmin user for institution
     */
    protected function createSchoolAdmin(array $schoolAdminData, Institution $institution): User
    {
        // Ensure unique username and email
        $username = $this->ensureUniqueUsername($schoolAdminData['username']);
        $email = $this->ensureUniqueEmail($schoolAdminData['email']);

        $userData = [
            'username' => $username,
            'email' => $email,
            'password' => Hash::make($schoolAdminData['password']),
            'first_name' => $schoolAdminData['first_name'],
            'last_name' => $schoolAdminData['last_name'],
            'phone' => $schoolAdminData['phone'] ?? '',
            'department' => $schoolAdminData['department'] ?? '',
            'institution_id' => $institution->id,
            'is_active' => true,
        ];

        $user = User::create($userData);
        $user->assignRole('schooladmin');

        return $user;
    }

    /**
     * Ensure username is unique by appending numbers if needed (optimized with batch data)
     */
    protected function ensureUniqueUsername(string $username): string
    {
        $originalUsername = $username;
        $counter = 1;

        // First check in our pre-loaded cache
        while (isset($this->existingUsersByUsername[$username])) {
            $username = $originalUsername . $counter;
            $counter++;
        }

        // Then check database for final verification (in case of concurrent imports)
        while (\App\Models\User::where('username', $username)->exists()) {
            $username = $originalUsername . $counter;
            $counter++;
        }

        // Add to cache to prevent duplicates within the same batch
        $this->existingUsersByUsername[$username] = true;

        return $username;
    }

    /**
     * Ensure email is unique by appending numbers if needed (optimized with batch data)
     */
    protected function ensureUniqueEmail(string $email): string
    {
        $originalEmail = $email;
        $counter = 1;

        // Split email into name and domain
        $parts = explode('@', $email);
        $emailName = $parts[0];
        $emailDomain = $parts[1] ?? 'atis.az';

        // First check in our pre-loaded cache
        while (isset($this->existingUsersByEmail[$email])) {
            $email = $emailName . $counter . '@' . $emailDomain;
            $counter++;
        }

        // Then check database for final verification (in case of concurrent imports)
        while (\App\Models\User::where('email', $email)->exists()) {
            $email = $emailName . $counter . '@' . $emailDomain;
            $counter++;
        }

        // Add to cache to prevent duplicates within the same batch
        $this->existingUsersByEmail[$email] = true;

        return $email;
    }

    /**
     * Parse date from Excel cell
     */
    protected function parseDate($cell): ?string
    {
        $value = $cell->getCalculatedValue();

        if (empty($value)) {
            return null;
        }

        // Check if it's an Excel date serial number
        if (Date::isDateTime($cell)) {
            return Date::excelToDateTimeObject($value)->format('Y-m-d');
        }

        // Try to parse as string date
        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Parse active status from text
     */
    protected function parseActiveStatus($value): bool
    {
        $value = strtolower(trim($value));
        return in_array($value, ['aktiv', 'active', '1', 'true', 'yes']);
    }

    /**
     * Extract parent ID from text (supports both ID and name)
     */
    protected function parseParentId(string $value): ?int
    {
        if (empty($value)) {
            return null;
        }

        // First, try to extract numeric ID (handles "73 // Sektor ID" format)
        preg_match('/\d+/', $value, $matches);
        if (isset($matches[0])) {
            $potentialId = (int) $matches[0];
            // Verify this ID exists
            if (\App\Models\Institution::where('id', $potentialId)->exists()) {
                return $potentialId;
            }
        }

        // If no valid ID found, try to find by name
        $cleanName = trim($value);
        $institution = \App\Models\Institution::where('name', 'LIKE', "%{$cleanName}%")
            ->orWhere('short_name', 'LIKE', "%{$cleanName}%")
            ->where('is_active', true)
            ->first();

        return $institution ? $institution->id : null;
    }

    /**
     * Check if row contains sample data
     */
    protected function isSampleRow(array $rowData): bool
    {
        // Check for common sample indicators
        $sampleIndicators = ['nümunə', 'sample', 'example', 'test', 'INST001'];

        $name = strtolower($rowData['name'] ?? '');
        $code = $rowData['institution_code'] ?? '';
        $utisCode = $rowData['utis_code'] ?? '';

        foreach ($sampleIndicators as $indicator) {
            if (stripos($name, $indicator) !== false ||
                stripos($code, $indicator) !== false ||
                $utisCode === '12345678') { // Common sample UTIS code
                return true;
            }
        }

        return false;
    }

    /**
     * Check if UTIS code already exists
     */
    protected function isDuplicateUtisCode(string $utisCode): bool
    {
        if (empty($utisCode)) {
            return false;
        }

        return \App\Models\Institution::where('utis_code', $utisCode)->exists();
    }

    /**
     * Get institution by UTIS code
     */
    protected function getInstitutionByUtisCode(string $utisCode): ?Institution
    {
        return \App\Models\Institution::where('utis_code', $utisCode)->first();
    }

    /**
     * Format skip message with detailed reason
     */
    protected function formatSkipMessage(array $rowData, string $reason): string
    {
        return "⏭️ {$rowData['row']}: Keçildi ({$reason})";
    }

    /**
     * Format duplicate message with existing institution info
     */
    protected function formatDuplicateMessage(array $rowData, ?Institution $existingInstitution): string
    {
        return "⚠️ {$rowData['row']}: Dublikat UTIS kodu";
    }

    /**
     * Format success message with detailed information
     */
    protected function formatSuccessMessage(array $rowData, Institution $institution, ?array $schoolAdminInfo = null): string
    {
        $message = "✅ {$rowData['row']}: {$institution->name}";

        if ($schoolAdminInfo && $schoolAdminInfo['username'] !== $schoolAdminInfo['original_username']) {
            $message .= " + Admin({$schoolAdminInfo['username']})";
        } elseif ($schoolAdminInfo) {
            $message .= " + Admin";
        }

        return $message;
    }

    /**
     * Format error message with user-friendly explanation
     */
    protected function formatErrorMessage(array $rowData, \Exception $e): string
    {
        $errorMessage = $e->getMessage();

        if (strpos($errorMessage, 'UNIQUE constraint failed: institutions.utis_code') !== false) {
            return "❌ {$rowData['row']}: UTIS kodu dublkatı";
        }

        if (strpos($errorMessage, 'UNIQUE constraint failed: institutions.institution_code') !== false) {
            return "❌ {$rowData['row']}: Müəssisə kodu dublkatı";
        }

        if (strpos($errorMessage, 'NOT NULL constraint failed: institutions.contact_info') !== false) {
            return "❌ {$rowData['row']}: Əlaqə məlumatı tələb olunur";
        }

        if (strpos($errorMessage, 'There is no role named') !== false) {
            return "❌ {$rowData['row']}: Admin rol problemi";
        }

        if (strpos($errorMessage, 'UNIQUE constraint failed: users.username') !== false) {
            return "❌ {$rowData['row']}: İstifadəçi adı dublkatı";
        }

        if (strpos($errorMessage, 'UNIQUE constraint failed: users.email') !== false) {
            return "❌ {$rowData['row']}: Email dublkatı";
        }

        return "❌ {$rowData['row']}: Xəta";
    }

    /**
     * Reset import state for new operation
     */
    protected function resetImportState(): void
    {
        $this->importResults = [];
        $this->validationErrors = [];

        // Reset batch processing cache
        $this->existingInstitutionsByUtis = [];
        $this->existingInstitutionsByCode = [];
        $this->existingUsersByUsername = [];
        $this->existingUsersByEmail = [];
    }

    /**
     * Build success response with detailed statistics
     */
    protected function buildSuccessResponse(int $importedCount): array
    {
        $statistics = $this->analyzeImportResults();

        $summaryMessage = $this->buildSummaryMessage($importedCount, $statistics);

        return [
            'success' => true,
            'message' => $summaryMessage,
            'imported_count' => $importedCount,
            'statistics' => $statistics,
            'details' => $this->importResults
        ];
    }

    /**
     * Analyze import results to generate statistics
     */
    protected function analyzeImportResults(): array
    {
        $successCount = 0;
        $skipCount = 0;
        $errorCount = 0;
        $schoolAdminCount = 0;
        $skipReasons = [];
        $errorTypes = [];

        foreach ($this->importResults as $result) {
            if (strpos($result, '✅') === 0) {
                $successCount++;
                // Check if school admin was created
                if (strpos($result, '👤 Məktəb Administratoru:') !== false) {
                    $schoolAdminCount++;
                }
            } elseif (strpos($result, '✋') === 0 || strpos($result, '⏭️') === 0 || strpos($result, '⚠️') === 0) {
                $skipCount++;
                // Extract skip reason
                if (strpos($result, 'Nümunə məlumat') !== false) {
                    $skipReasons['sample'] = ($skipReasons['sample'] ?? 0) + 1;
                } elseif (strpos($result, 'UTIS kodu') !== false && strpos($result, 'artıq') !== false) {
                    $skipReasons['duplicate_utis'] = ($skipReasons['duplicate_utis'] ?? 0) + 1;
                } else {
                    $skipReasons['other'] = ($skipReasons['other'] ?? 0) + 1;
                }
            } elseif (strpos($result, '❌') === 0) {
                $errorCount++;
                // Extract error types
                if (strpos($result, 'UTIS kodu') !== false) {
                    $errorTypes['utis_duplicate'] = ($errorTypes['utis_duplicate'] ?? 0) + 1;
                } elseif (strpos($result, 'Müəssisə kodu') !== false) {
                    $errorTypes['code_duplicate'] = ($errorTypes['code_duplicate'] ?? 0) + 1;
                } elseif (strpos($result, 'İstifadəçi adı') !== false) {
                    $errorTypes['username_duplicate'] = ($errorTypes['username_duplicate'] ?? 0) + 1;
                } elseif (strpos($result, 'Email') !== false) {
                    $errorTypes['email_duplicate'] = ($errorTypes['email_duplicate'] ?? 0) + 1;
                } else {
                    $errorTypes['other'] = ($errorTypes['other'] ?? 0) + 1;
                }
            }
        }

        return [
            'total_processed' => count($this->importResults),
            'success_count' => $successCount,
            'skip_count' => $skipCount,
            'error_count' => $errorCount,
            'school_admin_count' => $schoolAdminCount,
            'skip_reasons' => $skipReasons,
            'error_types' => $errorTypes
        ];
    }

    /**
     * Build comprehensive summary message
     */
    protected function buildSummaryMessage(int $importedCount, array $statistics): string
    {
        $totalProcessed = $statistics['total_processed'];

        if ($totalProcessed > 50) {
            $chunkCount = ceil($totalProcessed / 25);
            $message = "🚀 Böyük idxal tamamlandı ({$chunkCount} chunk): {$importedCount} müəssisə əlavə edildi";
        } else {
            $message = "📊 İdxal tamamlandı: {$importedCount} müəssisə əlavə edildi";
        }

        if ($statistics['school_admin_count'] > 0) {
            $message .= " ({$statistics['school_admin_count']} admin)";
        }

        if ($statistics['skip_count'] > 0) {
            $message .= ", {$statistics['skip_count']} keçildi";
        }

        if ($statistics['error_count'] > 0) {
            $message .= ", {$statistics['error_count']} xəta";
        }

        // Add performance note for large imports
        if ($totalProcessed > 50) {
            $message .= "\n💡 Böyük dataset chunk məntiqilə işləndi (25 sətir/chunk)";
        }

        return $message;
    }

    /**
     * Build error response
     */
    protected function buildErrorResponse(string $message, array $errors = []): array
    {
        // Convert associative validation errors to simple array for frontend
        $simpleErrors = [];
        if (!empty($errors)) {
            foreach ($errors as $key => $errorList) {
                if (is_array($errorList)) {
                    // Nested validation errors (like from Validator)
                    foreach ($errorList as $field => $messages) {
                        if (is_array($messages)) {
                            $simpleErrors[] = "{$key} - {$field}: " . implode(', ', $messages);
                        } else {
                            $simpleErrors[] = "{$key} - {$field}: {$messages}";
                        }
                    }
                } else {
                    // Simple error messages
                    $simpleErrors[] = is_string($key) ? "{$key}: {$errorList}" : $errorList;
                }
            }
        }

        return [
            'success' => false,
            'message' => $message,
            'errors' => $simpleErrors,
            'details' => $this->importResults
        ];
    }
}