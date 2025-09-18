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

            // Validate parsed data
            $this->validateImportData($data, $institutionType);

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
            $importedCount = $this->executeImport($data, $institutionType);

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
     * Execute the import process within a database transaction
     */
    protected function executeImport(array $data, InstitutionType $institutionType): int
    {
        return DB::transaction(function () use ($data, $institutionType) {
            $importedCount = 0;
            $institutionLevel = $institutionType->level ?? $institutionType->default_level;

            foreach ($data as $rowData) {
                try {
                    // Create institution
                    $institution = $this->createInstitution($rowData, $institutionType);

                    // Create SchoolAdmin user if level 4
                    if ($institutionLevel == 4 && isset($rowData['schooladmin'])) {
                        $this->createSchoolAdmin($rowData['schooladmin'], $institution);
                    }

                    $importedCount++;
                    $this->importResults[] = "Sətir {$rowData['row']}: {$institution->name} uğurla əlavə edildi";

                } catch (\Exception $e) {
                    Log::error("Institution import row error", [
                        'row' => $rowData['row'],
                        'error' => $e->getMessage()
                    ]);

                    $this->importResults[] = "Sətir {$rowData['row']}: Səhv - " . $e->getMessage();
                }
            }

            return $importedCount;
        });
    }

    /**
     * Create institution from row data
     */
    protected function createInstitution(array $rowData, InstitutionType $institutionType): Institution
    {
        $institutionData = [
            'name' => $rowData['name'],
            'short_name' => $rowData['short_name'],
            'institution_code' => $rowData['institution_code'],
            'utis_code' => $rowData['utis_code'],
            'region_code' => $rowData['region_code'],
            'contact_info' => $rowData['contact_info'] ? json_decode($rowData['contact_info'], true) : null,
            'location' => $rowData['location'] ? json_decode($rowData['location'], true) : null,
            'established_date' => $rowData['established_date'],
            'is_active' => $rowData['is_active'],
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
        $userData = [
            'username' => $schoolAdminData['username'],
            'email' => $schoolAdminData['email'],
            'password' => Hash::make($schoolAdminData['password']),
            'first_name' => $schoolAdminData['first_name'],
            'last_name' => $schoolAdminData['last_name'],
            'phone' => $schoolAdminData['phone'],
            'department' => $schoolAdminData['department'],
            'institution_id' => $institution->id,
            'is_active' => true,
        ];

        $user = User::create($userData);
        $user->assignRole('schooladmin');

        return $user;
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
     * Reset import state for new operation
     */
    protected function resetImportState(): void
    {
        $this->importResults = [];
        $this->validationErrors = [];
    }

    /**
     * Build success response
     */
    protected function buildSuccessResponse(int $importedCount): array
    {
        return [
            'success' => true,
            'message' => "{$importedCount} müəssisə uğurla idxal edildi",
            'imported_count' => $importedCount,
            'details' => $this->importResults
        ];
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