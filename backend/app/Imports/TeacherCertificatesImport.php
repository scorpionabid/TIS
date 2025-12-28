<?php

namespace App\Imports;

use App\Models\TeacherProfile;
use App\Models\Certificate;
use App\Models\CertificateType;
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
 * Teacher Certificates Import
 * Imports teacher certificates from Excel file
 * Columns: utis_code, certificate_type, issue_date, institution, description, is_verified
 */
class TeacherCertificatesImport implements ToCollection, WithHeadingRow, WithBatchInserts, WithChunkReading, SkipsOnError, SkipsOnFailure
{
    protected $successCount = 0;
    protected $errorCount = 0;
    protected $details = [
        'success' => [],
        'errors' => [],
    ];

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
                    'certificate_type' => 'required|string',
                    'issue_date' => 'required|date',
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

                $certType = CertificateType::where('name', $row['certificate_type'])->active()->first();
                if (!$certType) {
                    $this->details['errors'][] = "Sətir {$rowNumber}: Sertifikat növü tapılmadı ({$row['certificate_type']})";
                    $this->errorCount++;
                    continue;
                }

                Certificate::create([
                    'teacher_id' => $teacher->id,
                    'certificate_type_id' => $certType->id,
                    'issue_date' => $row['issue_date'],
                    'institution' => $row['institution'] ?? null,
                    'description' => $row['description'] ?? null,
                    'is_verified' => filter_var($row['is_verified'] ?? true, FILTER_VALIDATE_BOOLEAN),
                ]);

                $this->successCount++;
                $this->details['success'][] = "Sətir {$rowNumber}: {$teacher->utis_code} üçün sertifikat əlavə edildi";

            } catch (\Exception $e) {
                Log::error('TeacherCertificatesImport - Error', [
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
        Log::error('TeacherCertificatesImport - Processing error', [
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
