<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\TeacherRatingController;

/*
|--------------------------------------------------------------------------
| PRD: Müəllim Reytinq Sistemi API Routes
|--------------------------------------------------------------------------
|
| Bu route-lar müəllim reytinq sisteminin funksionallığını təmin edir:
| - Reytinq hesablanması
| - Liderbord (Top 20)
| - Statistika və müqayisə
| - Konfiqurasiya idarəetməsi
|
*/

Route::prefix('teacher-rating')->middleware(['auth:sanctum'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Rating Calculation
    |--------------------------------------------------------------------------
    */

    // Calculate rating for a single teacher
    Route::post('/calculate/{teacherId}', [TeacherRatingController::class, 'calculate'])
        ->middleware('permission:teacher-ratings.calculate')
        ->where('teacherId', '[0-9]+')
        ->name('teacher-rating.calculate');

    // Calculate ratings for all teachers in scope
    Route::post('/calculate-all', [TeacherRatingController::class, 'calculateAll'])
        ->middleware('permission:teacher-ratings.calculate')
        ->name('teacher-rating.calculate-all');

    /*
    |--------------------------------------------------------------------------
    | Rating Results
    |--------------------------------------------------------------------------
    */

    // Get rating result for a teacher
    Route::get('/result/{teacherId}', [TeacherRatingController::class, 'getResult'])
        ->middleware('permission:teacher-ratings.read')
        ->where('teacherId', '[0-9]+')
        ->name('teacher-rating.result');

    // Compare teacher ratings across years
    Route::get('/compare/{teacherId}', [TeacherRatingController::class, 'compareYears'])
        ->middleware('permission:teacher-ratings.read')
        ->where('teacherId', '[0-9]+')
        ->name('teacher-rating.compare');

    /*
    |--------------------------------------------------------------------------
    | Leaderboard & Statistics
    |--------------------------------------------------------------------------
    */

    // Get leaderboard (Top 20)
    Route::get('/leaderboard', [TeacherRatingController::class, 'leaderboard'])
        ->middleware('permission:teacher-ratings.read')
        ->name('teacher-rating.leaderboard');

    // Get statistics
    Route::get('/statistics', [TeacherRatingController::class, 'statistics'])
        ->middleware('permission:teacher-ratings.read')
        ->name('teacher-rating.statistics');

    // District (rayon) comparison
    Route::get('/district-comparison', [TeacherRatingController::class, 'districtComparison'])
        ->middleware('permission:teacher-ratings.read')
        ->name('teacher-rating.district-comparison');

    // Subject comparison
    Route::get('/subject-comparison', [TeacherRatingController::class, 'subjectComparison'])
        ->middleware('permission:teacher-ratings.read')
        ->name('teacher-rating.subject-comparison');

    /*
    |--------------------------------------------------------------------------
    | Configuration
    |--------------------------------------------------------------------------
    */

    // Get rating configuration
    Route::get('/config', [TeacherRatingController::class, 'getConfig'])
        ->middleware('permission:teacher-ratings.config.read')
        ->name('teacher-rating.config.get');

    // Update rating configuration
    Route::put('/config', [TeacherRatingController::class, 'updateConfig'])
        ->middleware('permission:teacher-ratings.config.write')
        ->name('teacher-rating.config.update');

});
