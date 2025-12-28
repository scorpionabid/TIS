<?php

namespace App\Imports;

use App\Models\TeacherProfile;
use App\Models\Award;
use App\Models\AwardType;
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
 * Teacher Awards Import
 * Imports teacher awards from Excel file
 * Columns: utis_code, award_type, award_date, description, is_verified
 */
class TeacherAwardsImport implements ToCollection, WithHeadingRow, WithBatchInserts, WithChunkReading, SkipsOnError, SkipsOnFailure
{
    protected $successCount = 0;
    protected $errorCount = 0;
    protected $details = [
        'success' => [],
        'errors' => [],
    ];

    public function collection(Collection $rows): void
    {
        $rowNumber = 1; // Header row is skipped automatically

        foreach ($rows as $row) {
            $rowNumber++;

            try {
                // Skip empty rows
                if (empty($row['utis_code'])) {
                    continue;
                }

                // Validate row
                $validator = Validator::make($row->toArray(), [
                    'utis_code' => 'required|string',
                    'award_type' => 'required|string',
                    'award_date' => 'required|date',
                ]);

                if ($validator->fails()) {
                    $errors = implode(', ', $validator->errors()->all());
                    $this->details['errors'][] = "Sətir {$rowNumber}: {$errors}";
                    $this->errorCount++;
                    continue;
                }

                // Find teacher
                $teacher = TeacherProfile::where('utis_code', $row['utis_code'])->first();
                if (!$teacher) {
                    $this->details['errors'][] = "Sətir {$rowNumber}: Müəllim tapılmadı (UTIS: {$row['utis_code']})";
                    $this->errorCount++;
                    continue;
                }

                // Find award type
                $awardType = AwardType::where('name', $row['award_type'])->active()->first();
                if (!$awardType) {
                    $this->details['errors'][] = "Sətir {$rowNumber}: Mükafat növü tapılmadı ({$row['award_type']})";
                    $this->errorCount++;
                    continue;
                }

                // Create award
                Award::create([
                    'teacher_id' => $teacher->id,
                    'award_type_id' => $awardType->id,
                    'award_date' => $row['award_date'],
                    'description' => $row['description'] ?? null,
                    'is_verified' => filter_var($row['is_verified'] ?? true, FILTER_VALIDATE_BOOLEAN),
                ]);

                $this->successCount++;
                $this->details['success'][] = "Sətir {$rowNumber}: {$teacher->utis_code} üçün mükafat əlavə edildi";

            } catch (\Exception $e) {
                Log::error('TeacherAwardsImport - Error', [
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
        Log::error('TeacherAwardsImport - Processing error', [
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
