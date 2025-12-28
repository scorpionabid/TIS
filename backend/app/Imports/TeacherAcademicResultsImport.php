<?php

namespace App\Imports;

use App\Models\TeacherProfile;
use App\Models\ClassAcademicResult;
use App\Models\Subject;
use App\Models\AcademicYear;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Validators\Failure;

/**
 * Teacher Academic Results Import
 * Imports class academic results from Excel file
 * Columns: utis_code, academic_year, subject, class_name, quality_rate, success_rate
 */
class TeacherAcademicResultsImport implements ToCollection, WithHeadingRow, WithBatchInserts, WithChunkReading, SkipsOnError, SkipsOnFailure
{
    protected $successCount = 0;
    protected $errorCount = 0;
    protected $details = [
        'success' => [],
        'errors' => [],
    ];

    // Cache for performance
    protected $academicYears = [];
    protected $subjects = [];

    public function __construct()
    {
        // Preload academic years and subjects
        $this->academicYears = AcademicYear::all()->keyBy('name');
        $this->subjects = Subject::all()->keyBy('name');
    }

    public function collection(Collection $rows): void
    {
        $rowNumber = 1;

        foreach ($rows as $row) {
            $rowNumber++;

            try {
                if (empty($row['utis_code'])) {
                    continue;
                }

                $validator = Validator::make($row->toArray(), [
                    'utis_code' => 'required|string',
                    'academic_year' => 'required|string',
                    'subject' => 'required|string',
                    'quality_rate' => 'required|numeric|min:0|max:100',
                    'success_rate' => 'required|numeric|min:0|max:100',
                ]);

                if ($validator->fails()) {
                    $errors = implode(', ', $validator->errors()->all());
                    $this->details['errors'][] = "Sətir {$rowNumber}: {$errors}";
                    $this->errorCount++;
                    continue;
                }

                $teacher = TeacherProfile::where('utis_code', $row['utis_code'])->first();
                if (!$teacher) {
                    $this->details['errors'][] = "Sətir {$rowNumber}: Müəllim tapılmadı (UTIS: {$row['utis_code']})";
                    $this->errorCount++;
                    continue;
                }

                $academicYear = $this->academicYears->get($row['academic_year']);
                if (!$academicYear) {
                    $this->details['errors'][] = "Sətir {$rowNumber}: Tədris ili tapılmadı ({$row['academic_year']})";
                    $this->errorCount++;
                    continue;
                }

                $subject = $this->subjects->get($row['subject']);
                if (!$subject) {
                    $this->details['errors'][] = "Sətir {$rowNumber}: Fənn tapılmadı ({$row['subject']})";
                    $this->errorCount++;
                    continue;
                }

                ClassAcademicResult::create([
                    'teacher_id' => $teacher->id,
                    'academic_year_id' => $academicYear->id,
                    'subject_id' => $subject->id,
                    'class_name' => $row['class_name'] ?? null,
                    'quality_rate' => $row['quality_rate'],
                    'success_rate' => $row['success_rate'],
                ]);

                $this->successCount++;
                $this->details['success'][] = "Sətir {$rowNumber}: {$teacher->utis_code} üçün akademik nəticə əlavə edildi";

            } catch (\Exception $e) {
                Log::error('TeacherAcademicResultsImport - Error', [
                    'row' => $rowNumber,
                    'error' => $e->getMessage(),
                ]);
                $this->details['errors'][] = "Sətir {$rowNumber}: {$e->getMessage()}";
                $this->errorCount++;
            }
        }
    }

    public function batchSize(): int
    {
        return 500;
    }

    public function chunkSize(): int
    {
        return 500;
    }

    public function onError(\Throwable $e): void
    {
        Log::error('TeacherAcademicResultsImport - Processing error', [
            'error' => $e->getMessage(),
        ]);
        $this->errorCount++;
    }

    public function onFailure(Failure ...$failures): void
    {
        foreach ($failures as $failure) {
            $row = $failure->row();
            $errors = implode(', ', $failure->errors());
            $this->details['errors'][] = "Sətir {$row}: {$errors}";
            $this->errorCount++;
        }
    }

    public function getResults(): array
    {
        return [
            'success_count' => $this->successCount,
            'error_count' => $this->errorCount,
            'details' => $this->details,
        ];
    }
}
