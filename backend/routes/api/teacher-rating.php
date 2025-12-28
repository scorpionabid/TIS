<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TeacherRating\TeacherRatingController;
use App\Http\Controllers\TeacherRating\TeacherProfileController;

/*
|--------------------------------------------------------------------------
| Teacher Rating System API Routes
|--------------------------------------------------------------------------
|
| Routes for Teacher Rating System (Müəllim Reytinq Sistemi)
| Based on PRD: /Users/home/Desktop/ATİS/Muellim_Reytinq_Sistemi_PRD.pdf
|
| Access Control:
| - RegionAdmin: Full access to all teachers in their region
| - SektorAdmin: Access to teachers in their sector schools
| - SchoolAdmin: Access to teachers in their school
| - Teachers: View their own rating results only
|
*/

Route::prefix('teacher-rating')->group(function () {
    /*
    |--------------------------------------------------------------------------
    | Teacher Profile Management
    |--------------------------------------------------------------------------
    */
    Route::prefix('teachers')->group(function () {
        // List teachers (with filters)
        Route::get('/', [TeacherProfileController::class, 'index'])
            ->middleware('permission:teacher_rating.view')
            ->name('teacher-rating.teachers.index');

        // Get single teacher profile
        Route::get('/{id}', [TeacherProfileController::class, 'show'])
            ->middleware('permission:teacher_rating.view')
            ->name('teacher-rating.teachers.show');

        // Create new teacher profile
        Route::post('/', [TeacherProfileController::class, 'store'])
            ->middleware('permission:teacher_rating.manage')
            ->name('teacher-rating.teachers.store');

        // Update teacher profile
        Route::put('/{id}', [TeacherProfileController::class, 'update'])
            ->middleware('permission:teacher_rating.manage')
            ->name('teacher-rating.teachers.update');

        // Delete teacher profile (soft delete)
        Route::delete('/{id}', [TeacherProfileController::class, 'destroy'])
            ->middleware('permission:teacher_rating.manage')
            ->name('teacher-rating.teachers.destroy');

        // Restore soft-deleted teacher profile
        Route::post('/{id}/restore', [TeacherProfileController::class, 'restore'])
            ->middleware('permission:teacher_rating.manage')
            ->name('teacher-rating.teachers.restore');

        // Bulk update teacher status
        Route::post('/bulk-update-status', [TeacherProfileController::class, 'bulkUpdateStatus'])
            ->middleware('permission:teacher_rating.manage')
            ->name('teacher-rating.teachers.bulk-update-status');
    });

    /*
    |--------------------------------------------------------------------------
    | Rating Calculation & Results
    |--------------------------------------------------------------------------
    */

    // Calculate rating for single teacher
    Route::post('/calculate/{teacherId}', [TeacherRatingController::class, 'calculateTeacherRating'])
        ->middleware('permission:teacher_rating.calculate')
        ->name('teacher-rating.calculate');

    // Calculate ratings for all active teachers
    Route::post('/calculate-all', [TeacherRatingController::class, 'calculateAllRatings'])
        ->middleware('permission:teacher_rating.calculate')
        ->name('teacher-rating.calculate-all');

    // Get rating result for a teacher
    Route::get('/result/{teacherId}', [TeacherRatingController::class, 'getRatingResult'])
        ->middleware('permission:teacher_rating.view')
        ->name('teacher-rating.result');

    // Get leaderboard (top 20)
    Route::get('/leaderboard', [TeacherRatingController::class, 'getLeaderboard'])
        ->middleware('permission:teacher_rating.view')
        ->name('teacher-rating.leaderboard');

    // Get statistics for academic year
    Route::get('/statistics', [TeacherRatingController::class, 'getStatistics'])
        ->middleware('permission:teacher_rating.view')
        ->name('teacher-rating.statistics');

    // Compare teacher ratings across years
    Route::get('/compare/{teacherId}', [TeacherRatingController::class, 'compareYears'])
        ->middleware('permission:teacher_rating.view')
        ->name('teacher-rating.compare');
});
