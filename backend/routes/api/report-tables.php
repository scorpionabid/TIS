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

    // Approval Queue — reviewer-in hüquqlu olduğu bütün gözləyən sətirləri
    Route::get('report-tables/approval-queue', [ReportTableResponseController::class, 'approvalQueue'])
        ->middleware('permission:report_table_responses.review');
});

// ─── Admin: Hesabat cədvəllərini idarə etmək (Read) ───────────────────────────

Route::middleware('permission:report_tables.read')->group(function () {
    Route::get('report-tables', [ReportTableController::class, 'index']);
    Route::get('report-tables/{table}', [ReportTableController::class, 'show']);
    Route::get('report-tables/{table}/responses', [ReportTableController::class, 'responses']);
    Route::get('report-tables/{table}/export', [ReportTableController::class, 'export']);
    // Yalnız təsdiqlənmiş sətirləri export etmək (Hazır tabı üçün)
    Route::get('report-tables/{table}/export/approved', [ReportTableController::class, 'exportApproved']);
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
