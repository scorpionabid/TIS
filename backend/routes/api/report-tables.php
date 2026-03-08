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

    // Analytics summary endpoint
    // Admin: full analytics (report_tables.read)
    // School: only own institution analytics (report_table_responses.write)
    Route::get('report-tables/{table}/analytics', [ReportTableController::class, 'analyticsSummary'])
        ->middleware('permission:report_tables.read|report_table_responses.write');

    // Approval Queue — reviewer-in hüquqlu olduğu bütün gözləyən sətirləri
    Route::get('report-tables/approval-queue', [ReportTableResponseController::class, 'approvalQueue'])
        ->middleware('permission:report_table_responses.review');

     // Grouped Approval Queue — Cədvəl -> Sektor -> Məktəb qruplaması
     Route::get('report-tables/approval-queue/grouped', [ReportTableResponseController::class, 'approvalQueueGrouped'])
         ->middleware('permission:report_table_responses.review');

     // Grouped Ready (Approved) — Cədvəl -> Sektor -> Məktəb qruplaması
     Route::get('report-tables/ready/grouped', [ReportTableResponseController::class, 'readyGrouped'])
         ->middleware('permission:report_table_responses.review');

     // School Fill Statistics — Bütün məktəblərin cədvəl doldurma statistikası
     Route::get('report-tables/school-fill-statistics', [ReportTableResponseController::class, 'schoolFillStatistics'])
         ->middleware('permission:report_tables.read');

     // Table Fill Statistics — Bir cədvəl üçün bütün məktəblərin doldurma statistikası
     Route::get('report-tables/{table}/fill-statistics', [ReportTableResponseController::class, 'tableFillStatistics'])
         ->middleware('permission:report_tables.read');

     // Table Fill Statistics Export — Statistikaları Excel formatında export etmək
     Route::get('report-tables/{table}/statistics/export', [ReportTableResponseController::class, 'exportStatistics'])
         ->middleware('permission:report_tables.read');

     // Toplu əməliyyat tarixçəsi — MUST be before {table} dynamic routes to avoid route conflict
     Route::get('report-tables/bulk-action-logs', [ReportTableResponseController::class, 'bulkActionLogs'])
         ->middleware('permission:report_table_responses.review');
});

// ─── Admin: Hesabat cədvəllərini idarə etmək (Read) ───────────────────────────

// show: schooladmin cədvəl detallarını (notes, columns, fixed_rows) görmək üçün
// report_table_responses.write də kifayətdir — analytics ilə eyni pattern
Route::get('report-tables/{table}', [ReportTableController::class, 'show'])
    ->middleware('permission:report_tables.read|report_table_responses.write');

Route::middleware('permission:report_tables.read')->group(function () {
    Route::get('report-tables', [ReportTableController::class, 'index']);
    Route::get('report-tables/{table}/responses', [ReportTableController::class, 'responses']);
    // Analytics üçün bütün cavablar (paginasyon olmadan)
    Route::get('report-tables/{table}/responses/all', [ReportTableController::class, 'getAllResponses']);
    Route::get('report-tables/{table}/export', [ReportTableController::class, 'export']);
    // Yalnız təsdiqlənmiş sətirləri export etmək (Hazır tabı üçün)
    Route::get('report-tables/{table}/export/approved', [ReportTableController::class, 'exportApproved']);
    // Doldurmayan məktəbləri əldə etmək (export üçün)
    Route::get('report-tables/{table}/non-responding-schools', [ReportTableController::class, 'nonRespondingSchools']);
});

// ─── Admin: Hesabat cədvəllərini idarə etmək (Write) ──────────────────────────

Route::middleware('permission:report_tables.write')->group(function () {
    Route::post('report-tables', [ReportTableController::class, 'store']);
    Route::put('report-tables/{table}', [ReportTableController::class, 'update']);
    Route::delete('report-tables/{table}', [ReportTableController::class, 'destroy']);
    Route::post('report-tables/{table}/publish', [ReportTableController::class, 'publish']);
    Route::post('report-tables/{table}/archive', [ReportTableController::class, 'archive']);
    Route::post('report-tables/{table}/unarchive', [ReportTableController::class, 'unarchive']);

    // Template routes
    Route::post('report-tables/{table}/save-as-template', [ReportTableController::class, 'saveAsTemplate']);
    Route::post('report-tables/templates', [ReportTableController::class, 'createFromTemplate']);
    Route::post('report-tables/{table}/remove-template', [ReportTableController::class, 'removeTemplateStatus']);

    // RegionAdmin: Təsdiqləndikdən sonra əlavə sətir əlavə etmə icazəsini aç/bağla
    Route::post('report-tables/{table}/toggle-additional-rows', [ReportTableController::class, 'toggleAllowAdditionalRows']);

});

// ─── Admin: Template siyahısı (Read) ─────────────────────────────────────────

Route::middleware('permission:report_tables.read')->group(function () {
    Route::get('report-tables/templates/list', [ReportTableController::class, 'getTemplates']);
});

// ─── School: Cavab əməliyyatları ──────────────────────────────────────────────

Route::middleware('permission:report_table_responses.write')->group(function () {
    // Cavab başlatmaq / mövcud cavabı almaq
    Route::post('report-tables/{table}/response/start', [ReportTableResponseController::class, 'start']);

    // Mənim cavabım (school öz cavabını oxumaq üçün)
    Route::get('report-tables/{table}/response/my', [ReportTableResponseController::class, 'my']);

    // Cavab saxlamaq (auto-save)
    Route::put('report-table-responses/{response}', [ReportTableResponseController::class, 'save']);

    // Cavab göndərmək (bütün cavabı)
    Route::post('report-table-responses/{response}/submit', [ReportTableResponseController::class, 'submit']);

    // Tək sətiri göndərmək
    Route::post('report-tables/{table}/responses/{response}/rows/submit', [ReportTableResponseController::class, 'submitRow']);

    // School: öz cavabını export etmək
    Route::get('report-tables/{table}/export/my', [ReportTableController::class, 'exportMyResponse']);
});

// ─── Admin: Sətir action-ları (review) ───────────────────────────────────────

Route::middleware('permission:report_table_responses.review')->group(function () {
    Route::post('report-tables/{table}/responses/{response}/rows/approve', [ReportTableResponseController::class, 'approveRow']);
    Route::post('report-tables/{table}/responses/{response}/rows/reject',  [ReportTableResponseController::class, 'rejectRow']);
    Route::post('report-tables/{table}/responses/{response}/rows/return',  [ReportTableResponseController::class, 'returnRow']);
    // Sətiri tamamilə silmək (məktəbin cədvəlindən sətir silinir)
    Route::delete('report-tables/{table}/responses/{response}/rows/delete', [ReportTableResponseController::class, 'deleteRow']);
    // Toplu sətir əməliyyatı (approval queue-dən)
    Route::post('report-tables/{table}/responses/bulk-row-action',         [ReportTableResponseController::class, 'bulkRowAction']);
});

// ─── Admin: Tək cavab baxışı ──────────────────────────────────────────────────

Route::middleware('permission:report_tables.read')->group(function () {
    Route::get('report-table-responses/{response}', [ReportTableResponseController::class, 'show']);
});

// ─── SuperAdmin: Soft delete bərpası və birdəfəlik silmə ─────────────────────

Route::middleware('role:superadmin')->group(function () {
    // Raw int params — Route Model Binding soft-deleted cədvəlləri göstərmir
    Route::post('report-tables/{tableId}/restore',  [ReportTableController::class, 'restore']);
    Route::delete('report-tables/{tableId}/force',  [ReportTableController::class, 'forceDestroy']);
});
