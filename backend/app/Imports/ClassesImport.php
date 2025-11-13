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
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class ClassesImport implements ToModel, WithHeadingRow, WithValidation, WithBatchInserts, WithChunkReading
{
    protected $region;
    protected $allowedInstitutionIds;
    protected $errors = [];
    protected $successCount = 0;
    protected $institutionCache = [];
    protected $academicYearCache = [];
    protected $teacherCache = [];

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
     * Prepare data before running the validator so localized headers get normalized.
     */
    public function prepareForValidation($row, $index)
    {
        $normalized = $this->normalizeRowKeys($row);
        $normalized['_row_index'] = $index + 2; // +2 to account for heading row (row 1)
        return $normalized;
    }

    /**
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        try {
            $row = $this->normalizeRowKeys($row);
            Log::info('Processing class import row:', $row);

            // Validate class identifiers (either combined "Sinif adı" or level + letter)
            $classIdentifiers = $this->parseClassIdentifiers($row);
            if (!$classIdentifiers) {
                $this->addError('Sinif səviyyəsi və ya sinif adı düzgün doldurulmayıb', $row);
                return null;
            }
            [$classLevel, $className] = $classIdentifiers;

            if ($classLevel < 0 || $classLevel > 12) {
                Log::warning("Invalid class level: {$classLevel}");
                $this->addError("Sinif səviyyəsi düzgün deyil: {$classLevel} (0-12 intervalında olmalıdır)", $row);
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
                    $this->addError("UTIS kod '{$utisCode}' tapılmadı və ya bu regiona aid deyil", $row);
                    return null;
                }
                $identifierUsed = "UTIS: {$utisCode}";
            }

            // 2. FALLBACK: Find by institution code
            if (!$institution && !empty($row['institution_code'])) {
                $instCode = trim($row['institution_code']);
                $institution = $this->institutionCache['code:' . $instCode] ?? null;

                if (!$institution) {
                    $this->addError("Müəssisə kodu '{$instCode}' tapılmadı və ya bu regiona aid deyil", $row);
                    return null;
                }
                $identifierUsed = "Code: {$instCode}";
            }

            // 3. LAST RESORT: Find by name (with warning)
            if (!$institution && !empty($row['institution_name'])) {
                $instName = trim($row['institution_name']);
                $institution = $this->institutionCache['name:' . $instName] ?? null;

                if (!$institution) {
                    $this->addError("Müəssisə '{$instName}' tapılmadı və ya bu regiona aid deyil", $row);
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
                Log::warning("Gender counts don't match total: {$studentCount} != {$maleCount} + {$femaleCount}");
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
                    $this->addError("Sinif rəhbəri '{$homeroomTeacherName}' {$institution->name} üçün tapılmadı", $row);
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

            $slug = Str::slug($key, '_');
            if ($slug && !array_key_exists($slug, $normalized)) {
                $normalized[$slug] = $value;
            }

            if (!array_key_exists('class_level', $normalized) && Str::contains($slug, 'sinif_seviy')) {
                $normalized['class_level'] = $value;
            }

            if (!array_key_exists('class_name', $normalized) && Str::contains($slug, 'sinif_herf')) {
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
            'sinif_herfi_a_b_c_c' => 'class_name',
            'sinif_letter' => 'class_name',
            'sinif' => 'homeroom_teacher',
            'sinif_rehberi' => 'homeroom_teacher',
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
            'novbe' => 'teaching_shift',
            'sinfin_tipi' => 'class_type',
            'profil' => 'class_profile',
            'akademik_il' => 'academic_year',
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
     * Append a formatted error message.
     */
    protected function addError(string $message, array $row = []): void
    {
        $context = $this->formatRowContext($row);
        $this->errors[] = $context ? "{$message} ({$context})" : $message;
    }

    /**
     * Resolve class level and letter from either combined or separated columns.
     */
    protected function parseClassIdentifiers(array $row): ?array
    {
        if (isset($row['class_level']) && $row['class_level'] !== '' && !empty($row['class_name'])) {
            return [
                (int) $row['class_level'],
                trim($row['class_name']),
            ];
        }

        return null;
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
     * Validation rules for each row
     */
    public function rules(): array
    {
        return [
            // At least one institution identifier required (handled in model())
            'utis_code' => ['nullable', 'string', 'size:9'],
            'institution_code' => ['nullable', 'string', 'max:20'],
            'institution_name' => ['nullable', 'string', 'max:200'],

            // Required fields
            'class_level' => ['required', 'integer', 'min:0', 'max:12'],
            'class_name' => ['required', 'string', 'max:20'],

            // Optional fields with validation
            'student_count' => ['nullable', 'integer', 'min:0', 'max:100'],
            'male_count' => ['nullable', 'integer', 'min:0', 'max:100'],
            'female_count' => ['nullable', 'integer', 'min:0', 'max:100'],
            'specialty' => ['nullable', 'string', 'max:100'],
            'grade_category' => ['nullable', 'string', 'max:50'],
            'grade_type' => ['nullable', 'string', Rule::in(['ümumi', 'ixtisaslaşdırılmış', 'xüsusi'])],
            'education_program' => ['nullable', 'string', 'max:50'],
            'teaching_language' => ['nullable', 'string', Rule::in(['azərbaycan', 'rus', 'gürcü', 'ingilis'])],
            'teaching_week' => ['nullable', 'string', Rule::in(['4_günlük', '5_günlük', '6_günlük'])],
            'teaching_shift' => ['nullable', 'string', 'max:50'],
            'class_type' => ['nullable', 'string', 'max:120'],
            'class_profile' => ['nullable', 'string', 'max:120'],
            'homeroom_teacher' => ['nullable', 'string', 'max:150'],
            'academic_year' => ['nullable', 'string', 'max:20'],
        ];
    }

    /**
     * Custom validation messages
     */
    public function customValidationMessages(): array
    {
        return [
            'utis_code.size' => 'UTIS kod 9 simvol (rəqəm) olmalıdır',
            'class_level.required' => 'Sinif səviyyəsi mütləqdir',
            'class_level.min' => 'Sinif səviyyəsi ən az 0 ola bilər',
            'class_level.max' => 'Sinif səviyyəsi ən çox 12 ola bilər',
            'class_name.required' => 'Sinif index-i (hərf və ya sərbəst kod) mütləqdir',
            'class_name.max' => 'Sinif index-i maksimum 20 simvol ola bilər',
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
