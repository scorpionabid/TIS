<?php

namespace App\Imports;

use App\Models\Grade;
use App\Models\Institution;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class RegionStudentsImport implements ToCollection, WithBatchInserts, WithChunkReading, WithHeadingRow
{
    protected Institution $region;

    /** @var array<int, string> */
    protected array $errors = [];

    protected int $created = 0;
    protected int $updated = 0;
    protected int $skipped = 0;

    /** Cache of [utis_code => id] for schools under this region */
    protected array $validSchoolsMap = [];

    public function __construct(Institution $region)
    {
        $this->region = $region;

        // Cache valid schools upfront (level 4 under this region)
        $allChildIds = $region->getAllChildrenIds();
        $this->validSchoolsMap = Institution::whereIn('id', $allChildIds)
            ->where('level', 4)
            ->whereNotNull('utis_code')
            ->pluck('id', 'utis_code')
            ->toArray();
    }

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // +2 because row 1 is header

            try {
                $this->processRow($row->toArray(), $rowNum);
            } catch (\Throwable $e) {
                $this->errors[] = "Sətir {$rowNum}: " . $e->getMessage();
                $this->skipped++;
                Log::warning("RegionStudentsImport: row {$rowNum} failed", [
                    'error' => $e->getMessage(),
                    'row'   => $row->toArray(),
                ]);
            }
        }
    }

    protected function processRow(array $row, int $rowNum): void
    {
        // ── 1. Required field validation ─────────────────────────────────────
        $utisCode       = trim($row['utis_code']  ?? '');
        $firstName      = trim($row['first_name'] ?? '');
        $lastName       = trim($row['last_name']  ?? '');
        $schoolUtisCode = trim($row['school_utis_code'] ?? '');
        $gradeLevel     = (int) ($row['grade_level'] ?? 0);
        $className      = trim($row['class_name']  ?? '');

        $missing = [];
        if ($utisCode       === '') $missing[] = 'utis_code';
        if ($firstName      === '') $missing[] = 'first_name';
        if ($lastName       === '') $missing[] = 'last_name';
        if ($schoolUtisCode === '') $missing[] = 'school_utis_code';
        if ($gradeLevel     === 0)  $missing[] = 'grade_level';
        if ($className      === '') $missing[] = 'class_name';

        if (! empty($missing)) {
            $this->errors[] = "Sətir {$rowNum}: məcburi sahələr çatışmır — " . implode(', ', $missing);
            $this->skipped++;
            return;
        }

        // ── 2. Validate school belongs to this region ─────────────────────────
        if (! isset($this->validSchoolsMap[$schoolUtisCode])) {
            $this->errors[] = "Sətir {$rowNum}: Məktəb (UTİS: {$schoolUtisCode}) tapılmadı və ya bu regiona aid deyil.";
            $this->skipped++;
            return;
        }

        $schoolId = $this->validSchoolsMap[$schoolUtisCode];

        // ── 3. Find matching Grade (Sinif) ───────────────────────────────────
        // We match by class_level and normalized name
        $grade = Grade::where('institution_id', $schoolId)
            ->where('class_level', $gradeLevel)
            ->where('name', mb_strtoupper($className))
            ->first();

        // ── 4. Optional fields ───────────────────────────────────────────────
        $gender      = in_array($row['gender'] ?? '', ['male', 'female']) ? $row['gender'] : null;
        $birthDate   = ! empty($row['birth_date']) ? $this->parseDate($row['birth_date']) : null;
        $parentName  = trim($row['parent_name']  ?? '') ?: null;
        $parentPhone = trim($row['parent_phone'] ?? '') ?: null;

        // ── 5. Upsert by utis_code ──────────────────────────────────────────
        DB::transaction(function () use (
            $utisCode, $firstName, $lastName, $schoolId, $grade,
            $gradeLevel, $className, $gender, $birthDate, $parentName, $parentPhone
        ) {
            $existing = Student::where('utis_code', $utisCode)->first();

            $payload = [
                'first_name'     => $firstName,
                'last_name'      => $lastName,
                'institution_id' => $schoolId,
                'grade_id'       => $grade?->id,
                'grade_level'    => $gradeLevel,
                'class_name'     => $className,
                'gender'         => $gender,
                'birth_date'     => $birthDate,
                'parent_name'    => $parentName,
                'parent_phone'   => $parentPhone,
                'is_active'      => true,
            ];

            if ($existing) {
                $existing->update($payload);
                $this->updated++;
            } else {
                Student::create(array_merge($payload, [
                    'utis_code'      => $utisCode,
                    'student_number' => $utisCode, // use utis_code as student_number fallback
                ]));
                $this->created++;
            }
        });
    }

    protected function parseDate(string $value): ?string
    {
        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    // ── maatwebsite/excel config ─────────────────────────────────────────────

    public function batchSize(): int
    {
        return 200;
    }

    public function chunkSize(): int
    {
        return 500;
    }

    // ── Result accessors ─────────────────────────────────────────────────────

    public function getResult(): array
    {
        return [
            'created' => $this->created,
            'updated' => $this->updated,
            'skipped' => $this->skipped,
            'errors'  => $this->errors,
        ];
    }
}
