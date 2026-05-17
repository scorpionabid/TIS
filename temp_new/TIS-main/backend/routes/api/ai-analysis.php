<?php

use App\Http\Controllers\AI\AiAnalysisController;
use App\Http\Controllers\AI\AiSettingsController;
use App\Http\Middleware\AiRateLimitMiddleware;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AI Analysis Routes
|--------------------------------------------------------------------------
|
| AI-əsaslı məlumat analizi üçün endpoint-lər.
| Autentifikasiya və permission yoxlaması tətbiq edilir.
|
*/

Route::prefix('ai-analysis')->group(function () {
    Route::get('schema', [AiAnalysisController::class, 'schema'])
        ->middleware('permission:ai_analysis.view');

    Route::get('logs', [AiAnalysisController::class, 'logs'])
        ->middleware('permission:ai_analysis.view');

    // YENİ: tək API call ilə analiz (aydın prompt → SQL, qeyri-müəyyən → suallar)
    Route::post('analyze', [AiAnalysisController::class, 'analyze'])
        ->middleware(['permission:ai_analysis.execute', AiRateLimitMiddleware::class]);

    // Legacy: yalnız dəqiqləşdirici suallar (köhnə axın üçün saxlanılır)
    Route::post('enhance-prompt', [AiAnalysisController::class, 'enhancePrompt'])
        ->middleware(['permission:ai_analysis.execute', AiRateLimitMiddleware::class]);

    Route::post('execute', [AiAnalysisController::class, 'execute'])
        ->middleware(['permission:ai_analysis.execute', AiRateLimitMiddleware::class]);

    // AI Settings (AI İdarəetmə)
    Route::prefix('settings')->group(function () {
        Route::get('/', [AiSettingsController::class, 'index'])
            ->middleware('permission:ai_analysis.view');

        Route::post('/', [AiSettingsController::class, 'save'])
            ->middleware('permission:ai_analysis.view');

        Route::post('test', [AiSettingsController::class, 'test'])
            ->middleware('permission:ai_analysis.view');
    });
});
