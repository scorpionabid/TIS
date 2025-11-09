<?php

namespace App\Imports;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\AcademicYear;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ClassesImport implements ToModel, WithHeadingRow, WithValidation, WithBatchInserts, WithChunkReading
{
    protected $region;
    protected $allowedInstitutionIds;
    protected $errors = [];
    protected $successCount = 0;
    protected $institutionCache = [];
    protected $academicYearCache = [];

    public function __construct($region)
    {
        $this->region = $region;
        // Get all institutions in this region
        $this->allowedInstitutionIds = $region->getAllChildrenIds();
        $this->allowedInstitutionIds[] = $region->id;

        // Pre-cache institutions for performance
        $this->cacheInstitutions();
        $this->cacheAcademicYears();
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
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        try {
            Log::info('Processing class import row:', $row);

            // Validate required fields
            if (empty($row['class_level']) || empty($row['class_name'])) {
                Log::warning('Skipping row due to missing required fields:', $row);
                $this->errors[] = 'Sinif səviyyəsi və sinif adı mütləqdir: ' . json_encode($row);
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
                    $this->errors[] = "UTIS kod '{$utisCode}' tapılmadı və ya bu regiona aid deyil";
                    return null;
                }
                $identifierUsed = "UTIS: {$utisCode}";
            }

            // 2. FALLBACK: Find by institution code
            if (!$institution && !empty($row['institution_code'])) {
                $instCode = trim($row['institution_code']);
                $institution = $this->institutionCache['code:' . $instCode] ?? null;

                if (!$institution) {
                    $this->errors[] = "Müəssisə kodu '{$instCode}' tapılmadı və ya bu regiona aid deyil";
                    return null;
                }
                $identifierUsed = "Code: {$instCode}";
            }

            // 3. LAST RESORT: Find by name (with warning)
            if (!$institution && !empty($row['institution_name'])) {
                $instName = trim($row['institution_name']);
                $institution = $this->institutionCache['name:' . $instName] ?? null;

                if (!$institution) {
                    $this->errors[] = "Müəssisə '{$instName}' tapılmadı və ya bu regiona aid deyil";
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
                $this->errors[] = 'Müəssisə müəyyən edilmədi. UTIS kod, müəssisə kodu və ya ad lazımdır';
                return null;
            }

            // Validate institution is in region (double check)
            if (!in_array($institution->id, $this->allowedInstitutionIds)) {
                Log::warning("Institution {$institution->name} is not in region {$this->region->name}");
                $this->errors[] = "Müəssisə '{$institution->name}' sizin regionunuzda deyil";
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
                $academicYear = AcademicYear::where('is_current', true)->first();
                if (!$academicYear) {
                    // Create default academic year if none exists
                    $currentYear = date('Y');
                    $nextYear = $currentYear + 1;
                    $academicYear = AcademicYear::firstOrCreate([
                        'year' => "{$currentYear}-{$nextYear}",
                    ], [
                        'is_current' => true,
                        'start_date' => "{$currentYear}-09-15",
                        'end_date' => "{$nextYear}-06-15",
                    ]);
                    $this->academicYearCache[$academicYear->year] = $academicYear;
                }
            }

            // Parse class level
            $classLevel = (int) $row['class_level'];
            if ($classLevel < 1 || $classLevel > 12) {
                Log::warning("Invalid class level: {$classLevel}");
                $this->errors[] = "Invalid class level: {$classLevel} (must be 1-12)";
                return null;
            }

            // Parse class name
            $className = trim($row['class_name']);

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
                    'student_count' => !empty($row['student_count']) ? (int) $row['student_count'] : $existingClass->student_count,
                    'male_student_count' => !empty($row['male_count']) ? (int) $row['male_count'] : 0,
                    'female_student_count' => !empty($row['female_count']) ? (int) $row['female_count'] : 0,
                    'specialty' => !empty($row['specialty']) ? trim($row['specialty']) : $existingClass->specialty,
                    'grade_type' => !empty($row['grade_type']) ? trim($row['grade_type']) : $existingClass->grade_type,
                    'teaching_language' => !empty($row['teaching_language']) ? trim($row['teaching_language']) : $existingClass->teaching_language,
                    'teaching_week' => !empty($row['teaching_week']) ? trim($row['teaching_week']) : $existingClass->teaching_week,
                    'is_active' => true,
                ]);
                $this->successCount++;
                return null; // Return null to avoid creating duplicate
            }

            // Parse student counts
            $studentCount = !empty($row['student_count']) ? (int) $row['student_count'] : 0;
            $maleCount = !empty($row['male_count']) ? (int) $row['male_count'] : 0;
            $femaleCount = !empty($row['female_count']) ? (int) $row['female_count'] : 0;

            // Auto-calculate student count if not provided
            if ($studentCount === 0 && ($maleCount > 0 || $femaleCount > 0)) {
                $studentCount = $maleCount + $femaleCount;
            }

            // Validate gender counts match total
            if ($maleCount + $femaleCount > 0 && $studentCount !== $maleCount + $femaleCount) {
                Log::warning("Gender counts don't match total: {$studentCount} != {$maleCount} + {$femaleCount}");
            }

            // Parse specialty
            $specialty = !empty($row['specialty']) ? trim($row['specialty']) : null;

            // Parse grade_type (sinif növü)
            $gradeType = !empty($row['grade_type']) ? trim($row['grade_type']) : 'ümumi';

            // Parse teaching_language (tədris dili)
            $teachingLanguage = !empty($row['teaching_language']) ? trim($row['teaching_language']) : 'azərbaycan';

            // Parse teaching_week (tədris həftəsi)
            $teachingWeek = !empty($row['teaching_week']) ? trim($row['teaching_week']) : '6_günlük';

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
                'grade_category' => !empty($row['grade_category']) ? trim($row['grade_category']) : 'ümumi',
                'grade_type' => $gradeType,
                'education_program' => !empty($row['education_program']) ? trim($row['education_program']) : 'umumi',
                'teaching_language' => $teachingLanguage,
                'teaching_week' => $teachingWeek,
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
            $this->errors[] = 'Error: ' . $e->getMessage();
            return null;
        }
    }

    /**
     * Validation rules for each row
     */
    public function rules(): array
    {
        return [
            // At least one institution identifier required (handled in model())
            'utis_code' => ['nullable', 'string', 'size:8'],
            'institution_code' => ['nullable', 'string', 'max:20'],
            'institution_name' => ['nullable', 'string', 'max:200'],

            // Required fields
            'class_level' => ['required', 'integer', 'min:1', 'max:12'],
            'class_name' => ['required', 'string', 'max:10'],

            // Optional fields with validation
            'student_count' => ['nullable', 'integer', 'min:0', 'max:100'],
            'male_count' => ['nullable', 'integer', 'min:0', 'max:100'],
            'female_count' => ['nullable', 'integer', 'min:0', 'max:100'],
            'specialty' => ['nullable', 'string', 'max:100'],
            'grade_category' => ['nullable', 'string', 'max:50'],
            'grade_type' => ['nullable', 'string', Rule::in(['ümumi', 'ixtisaslaşdırılmış', 'xüsusi'])],
            'education_program' => ['nullable', 'string', 'max:50'],
            'teaching_language' => ['nullable', 'string', Rule::in(['azərbaycan', 'rus', 'gürcü', 'ingilis'])],
            'teaching_week' => ['nullable', 'string', Rule::in(['5_günlük', '6_günlük'])],
            'academic_year' => ['nullable', 'string', 'max:20'],
        ];
    }

    /**
     * Custom validation messages
     */
    public function customValidationMessages(): array
    {
        return [
            'utis_code.size' => 'UTIS kod 8 simvol olmalıdır',
            'class_level.required' => 'Sinif səviyyəsi mütləqdir',
            'class_level.min' => 'Sinif səviyyəsi ən az 1 olmalıdır',
            'class_level.max' => 'Sinif səviyyəsi ən çox 12 ola bilər',
            'class_name.required' => 'Sinif adı mütləqdir',
            'class_name.max' => 'Sinif adı maksimum 10 simvol ola bilər',
            'student_count.max' => 'Şagird sayı maksimum 100 ola bilər',
            'male_count.max' => 'Oğlan sayı maksimum 100 ola bilər',
            'female_count.max' => 'Qız sayı maksimum 100 ola bilər',
        ];
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
     * Get import statistics
     */
    public function getStatistics(): array
    {
        return [
            'success_count' => $this->successCount,
            'error_count' => count($this->errors),
            'errors' => $this->errors,
        ];
    }
}
