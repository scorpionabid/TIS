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
        $table->load(['responses.institution.parent']);

        $responses = $this->responseService->getAllResponsesForExport($table);

        $safeTitle = mb_substr(
            trim(preg_replace('/\s+/', '_', preg_replace('/[^\w\s-]/u', '', $table->title ?? 'Hesabat'))),
            0,
            30
        );

        $filename = "ATIS_HesabatCedveli_{$safeTitle}_" . date('Y-m-d') . '.xlsx';
        $filePath = storage_path("app/private/exports/{$filename}");

        // Qovluğu yarat (yoxdursa)
        if (! file_exists(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }

        $export = new ReportTableExport($table, $responses);

        Excel::store($export, "private/exports/{$filename}", 'local');

        return response()->download($filePath, $filename, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ])->deleteFileAfterSend(true);
    }
}
