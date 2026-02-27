<?php

use App\Http\Controllers\ReportTableController;
use App\Http\Controllers\ReportTableResponseController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Hesabat Cədvəlləri Routes
|--------------------------------------------------------------------------
|
| Admin: cədvəl yaratmaq, redaktə etmək, dərc etmək, arxivləmək, cavab görmək
| School: cavab başlatmaq, saxlamaq, göndərmək
|
*/

// ─── Statik Marşrutlar (ID-li marşrutlardan əvvəl gəlməlidir) ─────────────────

Route::middleware('auth:sanctum')->group(function () {
    Route::get('report-tables/my', [ReportTableController::class, 'my'])
        ->middleware('permission:report_table_responses.write');
});

// ─── Admin: Hesabat cədvəllərini idarə etmək (Read) ───────────────────────────

Route::middleware('permission:report_tables.read')->group(function () {
    Route::get('report-tables', [ReportTableController::class, 'index']);
    Route::get('report-tables/{table}', [ReportTableController::class, 'show']);
    Route::get('report-tables/{table}/responses', [ReportTableController::class, 'responses']);
    Route::get('report-tables/{table}/export', [ReportTableController::class, 'export']);
});

// ─── Admin: Hesabat cədvəllərini idarə etmək (Write) ──────────────────────────

Route::middleware('permission:report_tables.write')->group(function () {
    Route::post('report-tables', [ReportTableController::class, 'store']);
    Route::put('report-tables/{table}', [ReportTableController::class, 'update']);
    Route::delete('report-tables/{table}', [ReportTableController::class, 'destroy']);
    Route::post('report-tables/{table}/publish', [ReportTableController::class, 'publish']);
    Route::post('report-tables/{table}/archive', [ReportTableController::class, 'archive']);
});

// ─── School: Cavab əməliyyatları ──────────────────────────────────────────────

Route::middleware('permission:report_table_responses.write')->group(function () {
    // Cavab başlatmaq / mövcud cavabı almaq
    Route::post('report-tables/{table}/response/start', [ReportTableResponseController::class, 'start']);

    // Mənim cavabım (school öz cavabını oxumaq üçün)
    Route::get('report-tables/{table}/response/my', [ReportTableResponseController::class, 'my']);

    // Cavab saxlamaq (auto-save)
    Route::put('report-table-responses/{response}', [ReportTableResponseController::class, 'save']);

    // Cavab göndərmək
    Route::post('report-table-responses/{response}/submit', [ReportTableResponseController::class, 'submit']);
});

// ─── Admin: Tək cavab baxışı ──────────────────────────────────────────────────

Route::middleware('permission:report_tables.read')->group(function () {
    Route::get('report-table-responses/{response}', [ReportTableResponseController::class, 'show']);
});
