<?php

namespace App\Services;

use App\Exports\ReportTableExport;
use App\Models\ReportTable;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportTableExportService
{
    public function __construct(
        private readonly ReportTableResponseService $responseService,
    ) {}

    /**
     * Cədvəlin bütün submitted cavablarını Excel formatında qaytarır.
     */
    public function export(ReportTable $table): BinaryFileResponse
    {
        try {
            $table->load(['responses.institution.parent']);

            $responses = $this->responseService->getAllResponsesForExport($table);

            // Əgər cavab yoxdursa, boş fayl yaratmaq əvəzinə xəta qaytar
            if ($responses->isEmpty()) {
                throw new \Exception('Export üçün cavab tapılmadı. Məktəblər hələ cavab göndərməyib.');
            }

            $safeTitle = mb_substr(
                trim(preg_replace('/\s+/', '_', preg_replace('/[^\w\s-]/u', '', $table->title ?? 'Hesabat'))),
                0,
                30
            );

            $filename = "ATIS_HesabatCedveli_{$safeTitle}_" . date('Y-m-d') . '.xlsx';

            // Storage disk istifadə et - private/exports qovluğu avtomatik yaradılacaq
            $export = new ReportTableExport($table, $responses);

            // Excel faylını yadda saxla və download et
            return Excel::download($export, $filename);
        } catch (\Exception $e) {
            \Log::error('Export error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Yalnız bir müəssisənin cavabını Excel formatında qaytarır (school özü üçün).
     */
    public function exportSingleInstitution(ReportTable $table, int $institutionId): BinaryFileResponse
    {
        try {
            $table->load(['responses.institution']);

            // Yalnız bu müəssisənin cavabını al
            $response = $table->responses()
                ->where('institution_id', $institutionId)
                ->with('institution')
                ->first();

            // Əgər cavab yoxdursa xəta qaytar
            if (! $response) {
                throw new \Exception('Bu cədvəl üçün hələ heç bir məlumat daxil edilməyib.');
            }

            // Əgər data sətirləri boşdursa xəta qaytar
            if (empty($response->rows)) {
                throw new \Exception('Cədvəldə export ediləcək məlumat yoxdur. Zəhmət olmasa əvvəlcə məlumat daxil edin.');
            }

            $responses = collect([$response]);

            $safeTitle = mb_substr(
                trim(preg_replace('/\s+/', '_', preg_replace('/[^\w\s-]/u', '', $table->title ?? 'Hesabat'))),
                0,
                30
            );

            $institutionName = $response?->institution?->name ?? 'Mekteb';
            $safeInstitution = mb_substr(trim(preg_replace('/\s+/', '_', preg_replace('/[^\w\s-]/u', '', $institutionName))), 0, 20);

            $filename = "ATIS_Cedvel_{$safeTitle}_{$safeInstitution}_" . date('Y-m-d') . '.xlsx';

            // Məktəbin öz export-unda bütün sətirləri göstər (draft daxil).
            $export = new ReportTableExport($table, $responses, filterByStatus: false);

            return Excel::download($export, $filename);
        } catch (\Exception $e) {
            \Log::error('Single institution export error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Yalnız təsdiqlənmiş (approved) sətirləri Excel formatında qaytarır (Hazır tabı üçün).
     */
    public function exportApprovedRows(ReportTable $table): BinaryFileResponse
    {
        try {
            $table->load(['responses.institution.parent']);

            // Bütün cavabları al və yalnız təsdiqlənmiş sətirləri olanları saxla
            $allResponses = $this->responseService->getAllResponsesForExport($table);

            $filteredResponses = $allResponses->filter(function ($response) {
                // Response-un row_statuses-ini yoxla
                $rowStatuses = $response->row_statuses ?? [];

                // Ən azı bir sətir təsdiqlənmiş olmalıdır
                foreach ($rowStatuses as $idx => $meta) {
                    if (($meta['status'] ?? null) === 'approved') {
                        return true;
                    }
                }

                return false;
            });

            // Əgər təsdiqlənmiş cavab yoxdursa, xəta qaytar
            if ($filteredResponses->isEmpty()) {
                throw new \Exception('Export üçün təsdiqlənmiş cavab tapılmadı.');
            }

            $safeTitle = mb_substr(
                trim(preg_replace('/\s+/', '_', preg_replace('/[^\w\s-]/u', '', $table->title ?? 'Hesabat'))),
                0,
                30
            );

            $filename = "ATIS_HazirCedvel_{$safeTitle}_" . date('Y-m-d') . '.xlsx';

            $export = new ReportTableExport($table, $filteredResponses);

            return Excel::download($export, $filename);
        } catch (\Exception $e) {
            \Log::error('Export approved rows error: ' . $e->getMessage());
            throw $e;
        }
    }
}
