<?php

use App\Http\Controllers\AcademicYearTransitionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Academic Year Transition Routes
|--------------------------------------------------------------------------
|
| Routes for managing academic year transitions including grade copying,
| student promotion, and teacher assignment migration.
|
*/

Route::prefix('academic-year-transitions')->group(function () {

    // Preview endpoints (read-only)
    Route::post('/preview', [AcademicYearTransitionController::class, 'preview'])
        ->name('academic-year-transitions.preview');

    Route::get('/grades-preview', [AcademicYearTransitionController::class, 'gradesPreview'])
        ->name('academic-year-transitions.grades-preview');

    Route::get('/students-preview', [AcademicYearTransitionController::class, 'studentsPreview'])
        ->name('academic-year-transitions.students-preview');

    // Execute transition
    Route::post('/initiate', [AcademicYearTransitionController::class, 'initiate'])
        ->name('academic-year-transitions.initiate');

    // Transition management
    Route::get('/{transition}', [AcademicYearTransitionController::class, 'show'])
        ->name('academic-year-transitions.show');

    Route::get('/{transition}/progress', [AcademicYearTransitionController::class, 'progress'])
        ->name('academic-year-transitions.progress');

    Route::get('/{transition}/details', [AcademicYearTransitionController::class, 'details'])
        ->name('academic-year-transitions.details');

    // Rollback
    Route::post('/{transition}/rollback', [AcademicYearTransitionController::class, 'rollback'])
        ->name('academic-year-transitions.rollback');

    // History
    Route::get('/institution/{institution}/history', [AcademicYearTransitionController::class, 'history'])
        ->name('academic-year-transitions.history');

});
