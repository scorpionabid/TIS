<?php

namespace App\Imports;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\AcademicYear;
use App\Models\User;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class ClassesImport implements ToModel, WithHeadingRow, WithBatchInserts, WithChunkReading
{
    protected $region;
    protected $allowedInstitutionIds;
    protected $errors = [];
    protected $structuredErrors = []; // New: structured error format
    protected $successCount = 0;
    protected $institutionCache = [];
    protected $academicYearCache = [];
    protected $teacherCache = [];

    // Progress tracking
    protected $importSessionId;
    protected $totalRows = 0;
    protected $processedRows = 0;
    protected $currentInstitution = null;
    protected $startTime;

    /**
     * Specify which row contains the headings.
     * Row 1 is instruction row, Row 2 is actual headers.
     */
    public function headingRow(): int
    {
        return 2;
    }

    public function __construct($region, $sessionId = null)
    {
        $this->region = $region;
        // Get all institutions in this region
        $this->allowedInstitutionIds = $region->getAllChildrenIds();
        $this->allowedInstitutionIds[] = $region->id;

        // Initialize progress tracking
        $this->importSessionId = $sessionId ?? Str::uuid()->toString();
        $this->startTime = microtime(true);

        // Pre-cache institutions for performance
        $this->cacheInstitutions();
        $this->cacheAcademicYears();

        // Initialize progress in cache
        $this->updateProgress('initializing', 0, 0);
    }

    /**
     * Pre-cache institutions for faster lookup
     * Priority: UTIS code > Institution code > Name
     */
    protected function cacheInstitutions(): void
    {
        $institutions = Institution::whereIn('id', $this->allowedInstitutionIds)
            ->select('id', 'name', 'utis_code', 'institution_code', 'type')
            ->get();

        foreach ($institutions as $institution) {
            // Cache by ID
            $this->institutionCache[$institution->id] = $institution;

            // Cache by UTIS code (PRIORITY)
            if ($institution->utis_code) {
                $this->institutionCache['utis:' . trim($institution->utis_code)] = $institution;
            }

            // Cache by institution code (FALLBACK)
            if ($institution->institution_code) {
                $this->institutionCache['code:' . trim($institution->institution_code)] = $institution;
            }

            // Cache by name (LAST RESORT)
            $this->institutionCache['name:' . trim($institution->name)] = $institution;
        }
    }

    /**
     * Pre-cache academic years
     */
    protected function cacheAcademicYears(): void
    {
        $years = AcademicYear::all();
        foreach ($years as $year) {
            $this->academicYearCache[$year->year] = $year;
            $this->academicYearCache[$year->id] = $year;
        }
    }

    /**
     * Prepare data before running the validator so localized headers get normalized.
     */
    public function prepareForValidation($row, $index)
    {
        $normalized = $this->normalizeRowKeys($row);
        // Laravel Excel passes $index starting from 0 for first data row after headingRow
        // headingRow = 2, so first data row is Excel Row 3
        // We want to display Excel row numbers, so: Excel Row = headingRow + 1 + $index
        $normalized['_row_index'] = 3 + $index; // Row 3 is first data row (after instruction + headers)

        // DIAGNOSTIC: Log first 5 rows to help debug column structure
        if ($index < 5) {
            Log::info("Excel Row " . (3 + $index) . " - Original columns:", array_keys($row));
            Log::info("Excel Row " . (3 + $index) . " - Normalized data:", [
                'class_level' => $normalized['class_level'] ?? 'MISSING',
                'class_name' => $normalized['class_name'] ?? 'MISSING',
                'class_full_name' => $normalized['class_full_name'] ?? 'MISSING',
                'institution_name' => $normalized['institution_name'] ?? 'MISSING',
            ]);
        }

        // CRITICAL: Mark empty rows with a special flag for conditional validation
        // This prevents "required field" errors for blank Excel rows
        $normalized['_is_empty_row'] = $this->isRowEmpty($normalized);

        // Convert UTIS code to string (Excel reads numbers as integers)
        if (array_key_exists('utis_code', $normalized) && $normalized['utis_code'] !== null && $normalized['utis_code'] !== '') {
            $digits = preg_replace('/\D+/', '', (string) $normalized['utis_code']);
            $normalized['utis_code'] = $digits !== '' ? $digits : null;
        }

        // Convert institution_code to string (Excel may read as number)
        if (array_key_exists('institution_code', $normalized) && $normalized['institution_code'] !== null && $normalized['institution_code'] !== '') {
            $normalized['institution_code'] = (string) $normalized['institution_code'];
        }

        // Convert class_level to integer (Excel may read as string)
        // STRICT: Only accept pure numbers - no combined format like "9 a"
        $levelValue = $normalized['class_level'] ?? null;
        if ($levelValue !== null && $levelValue !== '') {
            $normalized['class_level'] = (int) $levelValue;
        }

        $classIndex = $normalized['class_name'] ?? null;

        // If class_full_name column exists and class_level is still empty, try parsing it
        if (($levelValue === null || $levelValue === '') && !empty($normalized['class_full_name'])) {
            $parsed = $this->parseCombinedClassName($normalized['class_full_name']);
            if ($parsed) {
                [$normalized['class_level'], $normalized['class_name']] = $parsed;
            }
        }

        // If class_name column has combined format and class_level is empty, parse it
        if (($levelValue === null || $levelValue === '') && !empty($classIndex)) {
            $parsed = $this->parseCombinedClassName($classIndex);
            if ($parsed) {
                [$normalized['class_level'], $normalized['class_name']] = $parsed;
            }
        }

        return $normalized;
    }

    /**
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        try {
            // Skip completely empty rows (double-check from prepareForValidation)
            if (!empty($row['_is_empty_row'])) {
                Log::debug('Skipping empty row at index: ' . ($row['_row_index'] ?? 'unknown'));
                return null;
            }

            // Update progress tracking
            $this->processedRows++;
            if ($this->processedRows % 10 === 0 || $this->processedRows === 1) {
                // Update progress every 10 rows to avoid excessive cache writes
                $this->updateProgress('importing', $this->processedRows, $this->totalRows);
            }

            // NOTE: Do NOT call normalizeRowKeys() here - already done in prepareForValidation()
            // Calling it again would lose the parsed class_level and class_name values
            Log::info('Processing class import row:', $row);

            // Validate class identifiers (either combined "Sinif adı" or level + letter)
            $classIdentifiers = $this->parseClassIdentifiers($row);
            if (!$classIdentifiers) {
                // Check which fields are missing for better error message
                $classLevel = $row['class_level'] ?? null;
                $className = $row['class_name'] ?? null;

                if (empty($classLevel) && empty($className)) {
                    $this->addError(
                        'Sinif səviyyəsi VƏ Sinif index-i hər ikisi boşdur',
                        $row,
                        'class_level',
                        null,
                        '⚠️ DİQQƏT: D və E sütunları AYRILIQDADIR! D sütununa YALNIZ rəqəm (məs: 5), E sütununa YALNIZ hərf/kod (məs: A) yazın. "9 a" kimi birləşdirməyin!',
                        'error'
                    );
                } elseif (empty($classLevel)) {
                    $this->addError(
                        'Sinif səviyyəsi boşdur',
                        $row,
                        'class_level',
                        $classLevel,
                        '📋 D sütunu "Sinif Səviyyəsi (1-12)" → YALNIZ rəqəm yazın: 0, 1, 2...12 (hərf YAZA BİLMƏZSİNİZ)',
                        'error'
                    );
                } elseif (empty($className)) {
                    $this->addError(
                        'Sinif index-i boşdur',
                        $row,
                        'class_name',
                        $className,
                        '📋 E sütunu "Sinif index-i" → YALNIZ hərf/kod yazın: A, B, C, ə, r2 (rəqəm ƏLAVƏ ETMƏYİN)',
                        'error'
                    );
                }
                return null;
            }
            [$classLevel, $className] = $classIdentifiers;

            if ($classLevel < 0 || $classLevel > 12) {
                Log::warning("Invalid class level: {$classLevel}");
                $this->addError(
                    "Sinif səviyyəsi düzgün deyil: {$classLevel}",
                    $row,
                    'class_level',
                    $classLevel,
                    '0-12 arası rəqəm daxil edin'
                );
                return null;
            }

            // Find institution by priority: UTIS code > Institution code > Name
            $institution = null;
            $identifierUsed = null;

            // 1. PRIORITY: Find by UTIS code
            if (!empty($row['utis_code'])) {
                $utisCode = trim($row['utis_code']);
                $institution = $this->institutionCache['utis:' . $utisCode] ?? null;

                if (!$institution) {
                    // Try to find similar UTIS codes for suggestion
                    $suggestion = $this->findSimilarUTISCode($utisCode);
                    $this->addError(
                        "UTIS kod '{$utisCode}' tapılmadı və ya bu regiona aid deyil",
                        $row,
                        'utis_code',
                        $utisCode,
                        $suggestion
                    );
                    return null;
                }
                $identifierUsed = "UTIS: {$utisCode}";

                // Update current institution for progress tracking
                $this->currentInstitution = $institution->name;
            }

            // 2. FALLBACK: Find by institution code
            if (!$institution && !empty($row['institution_code'])) {
                $instCode = trim($row['institution_code']);
                $institution = $this->institutionCache['code:' . $instCode] ?? null;

                if (!$institution) {
                    $this->addError(
                        "Müəssisə kodu '{$instCode}' tapılmadı və ya bu regiona aid deyil",
                        $row,
                        'institution_code',
                        $instCode,
                        'Müəssisə kodunu yoxlayın və ya UTIS kod istifadə edin'
                    );
                    return null;
                }
                $identifierUsed = "Code: {$instCode}";
            }

            // 3. LAST RESORT: Find by name (with warning)
            if (!$institution && !empty($row['institution_name'])) {
                $instName = trim($row['institution_name']);
                $institution = $this->institutionCache['name:' . $instName] ?? null;

                if (!$institution) {
                    // Try fuzzy matching for institution name
                    $suggestion = $this->findSimilarInstitutionName($instName);
                    $this->addError(
                        "Müəssisə '{$instName}' tapılmadı və ya bu regiona aid deyil",
                        $row,
                        'institution_name',
                        $instName,
                        $suggestion
                    );
                    return null;
                }

                // Warning: should use UTIS or institution code
                Log::warning("Class import using institution name instead of code", [
                    'institution_name' => $instName,
                    'class' => $row['class_name']
                ]);
                $identifierUsed = "Name: {$instName} (XƏBƏRDARLIQ: UTIS kod istifadə edin)";
            }

            // If still no institution found
            if (!$institution) {
                $this->addError('Müəssisə müəyyən edilmədi. UTIS kod, müəssisə kodu və ya ad lazımdır', $row);
                return null;
            }

            // Validate institution is in region (double check)
            if (!in_array($institution->id, $this->allowedInstitutionIds)) {
                Log::warning("Institution {$institution->name} is not in region {$this->region->name}");
                $this->addError("Müəssisə '{$institution->name}' sizin regionunuzda deyil", $row);
                return null;
            }

            // Find or create academic year
            $academicYearName = !empty($row['academic_year']) ? trim($row['academic_year']) : null;
            $academicYear = null;

            if ($academicYearName) {
                $academicYear = $this->academicYearCache[$academicYearName] ?? null;
            }

            // If not found, use current academic year
            if (!$academicYear) {
                $academicYear = AcademicYear::where('is_active', true)->first();
                if (!$academicYear) {
                    // Create default academic year if none exists
                    $currentYear = date('Y');
                    $nextYear = $currentYear + 1;
                    $yearName = "{$currentYear}-{$nextYear}";
                    $academicYear = AcademicYear::firstOrCreate([
                        'name' => $yearName,
                    ], [
                        'is_active' => true,
                        'start_date' => "{$currentYear}-09-15",
                        'end_date' => "{$nextYear}-06-15",
                    ]);
                    $this->academicYearCache[$academicYear->name] = $academicYear;
                }
            }

            // Check for duplicate
            $existingClass = Grade::where('institution_id', $institution->id)
                ->where('academic_year_id', $academicYear->id)
                ->where('class_level', $classLevel)
                ->where('name', $className)
                ->first();

            if ($existingClass) {
                Log::info("Class already exists, updating: {$institution->name} - {$classLevel}{$className}");
                // Update existing class
                $existingClass->update([
                    'student_count' => $studentCount > 0 ? $studentCount : $existingClass->student_count,
                    'male_student_count' => $maleCount,
                    'female_student_count' => $femaleCount,
                    'specialty' => $specialty ?? $existingClass->specialty,
                    'grade_type' => $gradeType ?? $existingClass->grade_type,
                    'grade_category' => $gradeCategory ?? $existingClass->grade_category,
                    'class_type' => $classType ?? $existingClass->class_type,
                    'class_profile' => $classProfile ?? $existingClass->class_profile,
                    'education_program' => $educationProgram ?? $existingClass->education_program,
                    'teaching_language' => $teachingLanguage ?? $existingClass->teaching_language,
                    'teaching_week' => $teachingWeek ?? $existingClass->teaching_week,
                    'teaching_shift' => $teachingShift ?? $existingClass->teaching_shift,
                    'homeroom_teacher_id' => $homeroomTeacher ? $homeroomTeacher->id : $existingClass->homeroom_teacher_id,
                    'is_active' => true,
                ]);
                $this->successCount++;
                return null; // Return null to avoid creating duplicate
            }

            // Parse student counts
            $studentCount = isset($row['student_count']) && $row['student_count'] !== ''
                ? (int) $row['student_count']
                : 0;
            $maleCount = isset($row['male_count']) && $row['male_count'] !== ''
                ? (int) $row['male_count']
                : 0;
            $femaleCount = isset($row['female_count']) && $row['female_count'] !== ''
                ? (int) $row['female_count']
                : 0;

            if ($studentCount === 0 && ($maleCount > 0 || $femaleCount > 0)) {
                $studentCount = $maleCount + $femaleCount;
            }

            if ($maleCount + $femaleCount > 0 && $studentCount !== $maleCount + $femaleCount) {
                $this->addError(
                    "Şagird sayı uyğunsuzluğu: Ümumi ({$studentCount}) ≠ Oğlan ({$maleCount}) + Qız ({$femaleCount})",
                    $row,
                    'student_count',
                    $studentCount,
                    "Avtomatik düzəldildi: " . ($maleCount + $femaleCount) . " (oğlan + qız)",
                    'warning' // This is a warning, not an error
                );
                // Don't return - just warning, auto-correct the value
                $studentCount = $maleCount + $femaleCount;
                Log::warning("Auto-corrected student count: {$studentCount}");
            }

            $specialty = $this->sanitizeString($row['specialty'] ?? $row['ixtisas'] ?? null);
            $gradeType = $this->sanitizeString($row['grade_type'] ?? null);
            $classType = $this->sanitizeString($row['class_type'] ?? null);
            $classProfile = $this->sanitizeString($row['class_profile'] ?? null);
            $gradeCategory = $this->sanitizeString($row['grade_category'] ?? null) ?? $classType ?? 'ümumi';

            $teachingLanguage = $this->sanitizeString($row['teaching_language'] ?? null) ?? 'azərbaycan';
            $teachingWeek = $this->normalizeTeachingWeek($row['teaching_week'] ?? null) ?? '6_günlük';
            $teachingShift = $this->normalizeTeachingShift($row['teaching_shift'] ?? null);

            $educationProgram = $this->sanitizeString($row['education_program'] ?? null) ?? 'umumi';
            $homeroomTeacherName = $this->sanitizeString($row['homeroom_teacher'] ?? null);
            $homeroomTeacher = null;

            if ($homeroomTeacherName) {
                $homeroomTeacher = $this->findTeacherByFullName($homeroomTeacherName, $institution->id);

                if (!$homeroomTeacher) {
                    // Try to suggest similar teacher names
                    $suggestion = $this->findSimilarTeacherName($homeroomTeacherName, $institution->id);
                    $this->addError(
                        "Sinif rəhbəri '{$homeroomTeacherName}' {$institution->name} üçün tapılmadı",
                        $row,
                        'homeroom_teacher',
                        $homeroomTeacherName,
                        $suggestion
                    );
                    return null;
                }

                if ($this->teacherAlreadyAssigned($homeroomTeacher->id, $academicYear->id, $existingClass?->id)) {
                    $this->addError("Müəllim '{$homeroomTeacherName}' artıq digər sinifə təyin edilib", $row);
                    return null;
                }
            }

            // Create new class
            $class = Grade::create([
                'institution_id' => $institution->id,
                'academic_year_id' => $academicYear->id,
                'name' => $className,
                'class_level' => $classLevel,
                'student_count' => $studentCount,
                'male_student_count' => $maleCount,
                'female_student_count' => $femaleCount,
                'specialty' => $specialty,
                'grade_category' => $gradeCategory,
                'grade_type' => $gradeType ?? $classType,
                'class_type' => $classType,
                'class_profile' => $classProfile,
                'education_program' => $educationProgram,
                'teaching_language' => $teachingLanguage,
                'teaching_week' => $teachingWeek,
                'teaching_shift' => $teachingShift,
                'homeroom_teacher_id' => $homeroomTeacher?->id,
                'is_active' => true,
            ]);

            $this->successCount++;
            Log::info("Successfully created class via {$identifierUsed}: {$institution->name} - {$classLevel}{$className}");

            return $class;

        } catch (\Exception $e) {
            Log::error('Error importing class row: ' . $e->getMessage(), [
                'row' => $row,
                'exception' => $e->getTraceAsString()
            ]);
            $this->addError('Gözlənilməz xəta baş verdi: ' . $e->getMessage(), $row);
            return null;
        }
    }

    /**
     * Normalize row keys and map localized headers to internal names.
     */
    protected function normalizeRowKeys(array $row): array
    {
        $normalized = $row;

        foreach ($row as $key => $value) {
            if (!is_string($key)) {
                continue;
            }

            $asciiKey = Str::lower(Str::ascii($key));
            $normalizedKey = trim(preg_replace('/[^a-z0-9]+/', '_', $asciiKey), '_');

            if ($normalizedKey && !array_key_exists($normalizedKey, $normalized)) {
                $normalized[$normalizedKey] = $value;
            }

            if (!array_key_exists('class_level', $normalized) && Str::contains($normalizedKey, 'sinif_seviy')) {
                $normalized['class_level'] = $value;
            }

            if (!array_key_exists('class_name', $normalized) && (Str::contains($normalizedKey, 'sinif_index') || Str::contains($normalizedKey, 'sinif_herf'))) {
                $normalized['class_name'] = $value;
            }
        }

        $aliases = [
            'utis_kod' => 'utis_code',
            'utis_kodu' => 'utis_code',
            'mektebin_adi' => 'institution_name',
            'mekteb_adi' => 'institution_name',
            'muessise_adi' => 'institution_name',
            'muessise_kodu' => 'institution_code',
            'mekteb_kodu' => 'institution_code',
            'sinif_seviyyəsi' => 'class_level',
            'sinif_seviyyesi' => 'class_level',
            'sinif_seviyyəsi_1_12' => 'class_level',
            'sinif_seviyyesi_1_12' => 'class_level',
            'sinif_level' => 'class_level',
            'sinif_hərfi' => 'class_name',
            'sinif_harfi' => 'class_name',
            'sinif_index' => 'class_name',
            'sinif_indexi' => 'class_name',
            'sinif_index_i' => 'class_name',
            'sinif_index_i_mes_a_r2_11' => 'class_name', // NEW: Template header alias
            'sinif_herfi_a_b_c_c' => 'class_name',
            'sinif_letter' => 'class_name',
            'sinif_full' => 'class_full_name',
            'sinif_adi' => 'class_full_name',
            'sinfin_adi' => 'class_full_name',
            'sinif' => 'homeroom_teacher',
            'sinif_rehberi' => 'homeroom_teacher',
            'sinif_rehberi_tam_ad' => 'homeroom_teacher', // NEW: Template header alias
            'sinif_muellimi' => 'homeroom_teacher',
            'sinif_müəllimi' => 'homeroom_teacher',
            'ixtisas' => 'specialty',
            'sagird_sayi' => 'student_count',
            'sagird_say' => 'student_count',
            'oglan_sayi' => 'male_count',
            'oglanlarin_sayi' => 'male_count',
            'qiz_sayi' => 'female_count',
            'qizlarin_sayi' => 'female_count',
            'tedris_dili' => 'teaching_language',
            'tedris' => 'teaching_week',
            'tedris_heftesi' => 'teaching_week', // NEW: Template header alias
            'novbe' => 'teaching_shift',
            'sinfin_tipi' => 'class_type',
            'profil' => 'class_profile',
            'akademik_il' => 'academic_year',
            'tedris_ili' => 'academic_year', // NEW: Template header alias
            'tehsil_proqrami' => 'education_program',
            'sinif_kateqoriyasi' => 'grade_category',
        ];

        foreach ($aliases as $from => $to) {
            if (array_key_exists($from, $normalized) && !array_key_exists($to, $normalized)) {
                $normalized[$to] = $normalized[$from];
            }
        }

        return $normalized;
    }

    /**
     * Build a human-readable identifier to append to error messages.
     */
    protected function formatRowContext(array $row): string
    {
        $parts = [];

        $rowIndex = $row['_row_index'] ?? $row['row_index'] ?? null;
        if ($rowIndex) {
            $parts[] = "Sətir {$rowIndex}";
        }

        if (!empty($row['utis_code'])) {
            $parts[] = "UTIS {$row['utis_code']}";
        } elseif (!empty($row['institution_code'])) {
            $parts[] = "Kod {$row['institution_code']}";
        }

        if (!empty($row['institution_name'])) {
            $parts[] = $row['institution_name'];
        }

        if (!empty($row['class_level']) && !empty($row['class_name'])) {
            $parts[] = "Sinif {$row['class_level']}{$row['class_name']}";
        }

        return implode(' | ', $parts);
    }

    /**
     * Append a formatted error message with structured data.
     */
    protected function addError(string $message, array $row = [], string $field = null, $value = null, string $suggestion = null, string $severity = 'error'): void
    {
        $context = $this->formatRowContext($row);
        $errorMessage = $context ? "{$message} ({$context})" : $message;
        $this->errors[] = $errorMessage;

        // Add structured error for better frontend handling
        $rowIndex = $row['_row_index'] ?? $row['row_index'] ?? null;

        $structuredError = [
            'row' => $rowIndex,
            'field' => $field,
            'value' => $value,
            'error' => $message,
            'suggestion' => $suggestion,
            'severity' => $severity, // 'error', 'warning', or 'info'
            'context' => [
                'utis_code' => $row['utis_code'] ?? null,
                'institution_code' => $row['institution_code'] ?? null,
                'institution_name' => $row['institution_name'] ?? null,
                'class_level' => $row['class_level'] ?? null,
                'class_name' => $row['class_name'] ?? null,
            ]
        ];

        $this->structuredErrors[] = $structuredError;
    }

    /**
     * Resolve class level and letter from either combined or separated columns.
     */
    protected function parseClassIdentifiers(array $row): ?array
    {
        if (isset($row['class_level']) && $row['class_level'] !== '' && isset($row['class_name']) && $row['class_name'] !== '') {
            return [
                (int) $row['class_level'],
                $this->sanitizeClassIndex($row['class_name']),
            ];
        }

        return null;
    }

    /**
     * Parse combined class name formats (e.g., "5A", "10 B", "8-r2").
     */
    protected function parseCombinedClassName(string $value): ?array
    {
        $clean = trim(str_replace(['-', '_'], ' ', $value));
        if ($clean === '') {
            return null;
        }

        if (preg_match('/^(?<level>\d{1,2})\s*(?<index>.+)$/u', $clean, $matches)) {
            $level = (int) $matches['level'];
            $index = $this->sanitizeClassIndex($matches['index']);
            if ($index === '') {
                return null;
            }
            return [$level, $index];
        }

        if (preg_match('/^(?<level>\d{1,2})$/', $clean, $matches)) {
            return [(int) $matches['level'], ''];
        }

        return null;
    }

    protected function sanitizeClassIndex(string $value): string
    {
        return mb_substr(trim($value), 0, 3);
    }

    /**
     * Trim and sanitize optional strings.
     */
    protected function sanitizeString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * Normalize teaching week values (4/5/6 günlük).
     */
    protected function normalizeTeachingWeek(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        $clean = Str::lower(Str::squish($value));
        $clean = str_replace('gunluk', 'günlük', $clean);

        return match ($clean) {
            '4 günlük', '4günlük', '4_günlük' => '4_günlük',
            '5 günlük', '5günlük', '5_günlük' => '5_günlük',
            '6 günlük', '6günlük', '6_günlük' => '6_günlük',
            default => null,
        };
    }

    /**
     * Normalize shift / "Növbə" column.
     */
    protected function normalizeTeachingShift(?string $value): ?string
    {
        $value = $this->sanitizeString($value);
        if (!$value) {
            return null;
        }

        $clean = Str::lower($value);
        if (preg_match('/(\d+)/', $clean, $matches)) {
            return trim($matches[1] . ' növbə');
        }

        return Str::title($clean);
    }

    /**
     * Attempt to find homeroom teacher by full name within institution.
     */
    protected function findTeacherByFullName(?string $fullName, int $institutionId): ?User
    {
        $normalized = $this->normalizeFullName($fullName);
        if (!$normalized) {
            return null;
        }

        $cacheKey = "{$institutionId}|{$normalized}";
        if (array_key_exists($cacheKey, $this->teacherCache)) {
            return $this->teacherCache[$cacheKey] ?: null;
        }

        $usersForward = "LOWER(TRIM(users.first_name || ' ' || users.last_name))";
        $usersReverse = "LOWER(TRIM(users.last_name || ' ' || users.first_name))";
        $profileForward = "LOWER(TRIM(user_profiles.first_name || ' ' || user_profiles.last_name || ' ' || COALESCE(user_profiles.patronymic, '')))";
        $profileReverse = "LOWER(TRIM(user_profiles.last_name || ' ' || user_profiles.first_name || ' ' || COALESCE(user_profiles.patronymic, '')))";

        $teacher = User::query()
            ->where('institution_id', $institutionId)
            ->whereHas('roles', function ($query) {
                $query->whereIn('name', ['müəllim', 'muellim', 'teacher', 'müavin']);
            })
            ->where(function ($query) use ($normalized, $usersForward, $usersReverse, $profileForward, $profileReverse) {
                $query->whereRaw("{$usersForward} = ?", [$normalized])
                      ->orWhereRaw("{$usersReverse} = ?", [$normalized])
                      ->orWhereHas('profile', function ($profileQuery) use ($normalized, $profileForward, $profileReverse) {
                          $profileQuery->whereRaw("{$profileForward} = ?", [$normalized])
                                       ->orWhereRaw("{$profileReverse} = ?", [$normalized]);
                      });
            })
            ->first();

        $this->teacherCache[$cacheKey] = $teacher ?: false;

        return $teacher;
    }

    /**
     * Normalize teacher full name for comparisons.
     */
    protected function normalizeFullName(?string $fullName): ?string
    {
        if (!$fullName) {
            return null;
        }

        $normalized = Str::of($fullName)->lower()->replaceMatches('/\s+/u', ' ')->trim()->toString();
        return $normalized === '' ? null : $normalized;
    }

    /**
     * Check if teacher is already assigned to another class in the same academic year.
     */
    protected function teacherAlreadyAssigned(int $teacherId, int $academicYearId, ?int $ignoreGradeId = null): bool
    {
        return Grade::where('homeroom_teacher_id', $teacherId)
            ->where('academic_year_id', $academicYearId)
            ->when($ignoreGradeId, function ($query) use ($ignoreGradeId) {
                $query->where('id', '!=', $ignoreGradeId);
            })
            ->exists();
    }

    /**
     * Batch insert size
     */
    public function batchSize(): int
    {
        return 100;
    }

    /**
     * Chunk reading size
     */
    public function chunkSize(): int
    {
        return 100;
    }

    /**
     * Get import errors
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    /**
     * Get success count
     */
    public function getSuccessCount(): int
    {
        return $this->successCount;
    }

    /**
     * Get import statistics with structured errors
     */
    public function getStatistics(): array
    {
        return [
            'success_count' => $this->successCount,
            'error_count' => count($this->errors),
            'errors' => $this->errors,
            'structured_errors' => $this->structuredErrors, // Enhanced error format
            'total_processed' => $this->successCount + count($this->errors),
        ];
    }

    /**
     * Find similar UTIS code for smart suggestions
     */
    protected function findSimilarUTISCode(string $utisCode): ?string
    {
        // Search for UTIS codes with similar patterns (e.g., one digit off)
        $searchPattern = substr($utisCode, 0, 6); // First 6 digits

        foreach ($this->institutionCache as $key => $institution) {
            if (str_starts_with($key, 'utis:')) {
                $cachedCode = substr($key, 5); // Remove 'utis:' prefix
                if (str_starts_with($cachedCode, $searchPattern)) {
                    return "Demək istədiniz: {$cachedCode}? (Müəssisə: {$institution->name})";
                }
            }
        }

        return 'Regionunuzdakı UTIS kod siyahısını yoxlayın';
    }

    /**
     * Find similar institution name using fuzzy matching (Levenshtein distance)
     */
    protected function findSimilarInstitutionName(string $searchName): ?string
    {
        $searchName = mb_strtolower(trim($searchName));
        $bestMatch = null;
        $bestDistance = PHP_INT_MAX;
        $threshold = 5; // Maximum acceptable Levenshtein distance

        foreach ($this->institutionCache as $key => $institution) {
            if (str_starts_with($key, 'name:')) {
                $cachedName = mb_strtolower($institution->name);
                $distance = levenshtein(
                    substr($searchName, 0, 255), // Levenshtein has 255 char limit
                    substr($cachedName, 0, 255)
                );

                if ($distance < $bestDistance && $distance <= $threshold) {
                    $bestDistance = $distance;
                    $bestMatch = $institution;
                }
            }
        }

        if ($bestMatch) {
            $suggestion = "Demək istədiniz: '{$bestMatch->name}'?";
            if ($bestMatch->utis_code) {
                $suggestion .= " (UTIS: {$bestMatch->utis_code})";
            }
            return $suggestion;
        }

        // If no close match, suggest available institutions
        $availableInstitutions = array_filter($this->institutionCache, function($key) {
            return str_starts_with($key, 'name:');
        }, ARRAY_FILTER_USE_KEY);

        if (count($availableInstitutions) <= 5) {
            $names = array_map(fn($inst) => $inst->name, array_slice($availableInstitutions, 0, 5));
            return 'Mövcud müəssisələr: ' . implode(', ', $names);
        }

        return 'Excel template-dən müəssisə adını dəqiq kopyalayın və ya UTIS kod istifadə edin';
    }

    /**
     * Find similar teacher name using fuzzy matching
     */
    protected function findSimilarTeacherName(string $searchName, int $institutionId): ?string
    {
        $searchName = mb_strtolower(trim($searchName));

        // Get teachers from this institution
        $teachers = User::where('institution_id', $institutionId)
            ->whereHas('roles', function ($query) {
                $query->whereIn('name', ['müəllim', 'muellim', 'teacher', 'müavin']);
            })
            ->select('id', 'first_name', 'last_name')
            ->get();

        if ($teachers->isEmpty()) {
            return "Bu müəssisədə müəllim tapılmadı. Əvvəlcə müəllimləri sistemə əlavə edin.";
        }

        $bestMatch = null;
        $bestDistance = PHP_INT_MAX;
        $threshold = 5;

        foreach ($teachers as $teacher) {
            $fullName = mb_strtolower(trim($teacher->first_name . ' ' . $teacher->last_name));
            $reverseName = mb_strtolower(trim($teacher->last_name . ' ' . $teacher->first_name));

            $distance1 = levenshtein(
                substr($searchName, 0, 255),
                substr($fullName, 0, 255)
            );

            $distance2 = levenshtein(
                substr($searchName, 0, 255),
                substr($reverseName, 0, 255)
            );

            $distance = min($distance1, $distance2);

            if ($distance < $bestDistance && $distance <= $threshold) {
                $bestDistance = $distance;
                $bestMatch = $teacher;
            }
        }

        if ($bestMatch) {
            return "Demək istədiniz: '{$bestMatch->first_name} {$bestMatch->last_name}'?";
        }

        // Show first 3 available teachers
        $availableTeachers = $teachers->take(3)->map(function($t) {
            return $t->first_name . ' ' . $t->last_name;
        })->toArray();

        if (count($availableTeachers) > 0) {
            return 'Mövcud müəllimlər: ' . implode(', ', $availableTeachers) .
                   (count($teachers) > 3 ? ' və s.' : '');
        }

        return 'Müəllim adını sistemdəki adla eyni yazın (Tam ad: Ad Soyad)';
    }

    /**
     * Get structured errors for detailed frontend display
     */
    public function getStructuredErrors(): array
    {
        return $this->structuredErrors;
    }

    /**
     * Check if a row is completely empty (skip blank rows in Excel)
     *
     * @param array $row
     * @return bool
     */
    private function isRowEmpty(array $row): bool
    {
        // Remove internal tracking fields before checking
        $checkableFields = array_diff_key($row, array_flip(['_row_index', '_is_empty_row']));

        // Check if all values are null, empty string, or whitespace-only
        foreach ($checkableFields as $value) {
            if ($value !== null && $value !== '' && trim((string) $value) !== '') {
                return false; // Found a non-empty value
            }
        }

        return true; // All fields are empty
    }

    /**
     * Update progress in cache for frontend polling
     */
    protected function updateProgress(string $status, int $processed, int $total): void
    {
        $elapsed = microtime(true) - $this->startTime;
        $estimatedTotal = $processed > 0 ? ($elapsed / $processed) * $total : 0;
        $remaining = max(0, $estimatedTotal - $elapsed);

        $progress = [
            'status' => $status, // 'initializing', 'parsing', 'validating', 'importing', 'complete'
            'processed_rows' => $processed,
            'total_rows' => $total,
            'success_count' => $this->successCount,
            'error_count' => count($this->errors),
            'current_institution' => $this->currentInstitution,
            'elapsed_seconds' => round($elapsed, 2),
            'estimated_remaining_seconds' => round($remaining, 2),
            'percentage' => $total > 0 ? round(($processed / $total) * 100, 2) : 0,
            'timestamp' => now()->toISOString(),
        ];

        // Store in cache for 10 minutes (progress will be polled by frontend)
        Cache::put("import_progress:{$this->importSessionId}", $progress, 600);
    }

    /**
     * Get the import session ID for progress tracking
     */
    public function getSessionId(): string
    {
        return $this->importSessionId;
    }

    /**
     * Set total rows for progress calculation
     */
    public function setTotalRows(int $total): void
    {
        $this->totalRows = $total;
        $this->updateProgress('parsing', 0, $total);
    }
}
