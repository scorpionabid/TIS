<?php

use App\Http\Controllers\StaffRating\DirectorManagementController;
use App\Http\Controllers\StaffRating\MyRatingController;
use App\Http\Controllers\StaffRating\RatingAuditController;
use App\Http\Controllers\StaffRating\RatingConfigurationController;
use App\Http\Controllers\StaffRating\RatingDashboardController;
use App\Http\Controllers\StaffRating\StaffRatingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Staff Rating API Routes
|--------------------------------------------------------------------------
|
| Routes for staff rating system including:
| - Director management
| - Manual and automatic ratings
| - Configuration
| - Dashboards and analytics
| - Audit logs
|
*/

Route::middleware(['auth:sanctum'])->prefix('staff-rating')->group(function () {
    // ============================================
    // Director Management (RegionAdmin, SuperAdmin)
    // ============================================
    Route::prefix('directors')->group(function () {
        Route::get('/', [DirectorManagementController::class, 'index'])->middleware('permission:view_directors');
        Route::get('/{institution}', [DirectorManagementController::class, 'show'])->middleware('permission:view_directors');
        Route::post('/', [DirectorManagementController::class, 'store'])->middleware('permission:create_directors');
        Route::put('/{institution}', [DirectorManagementController::class, 'update'])->middleware('permission:edit_directors');
        Route::delete('/{institution}', [DirectorManagementController::class, 'destroy'])->middleware('permission:delete_directors');
        Route::post('/bulk-assign', [DirectorManagementController::class, 'bulkAssign'])->middleware('permission:create_directors');
    });

    // ============================================
    // Staff Ratings (CRUD)
    // ============================================
    Route::prefix('ratings')->group(function () {
        // Get all ratings for a staff member
        Route::get('/staff/{staff}', [StaffRatingController::class, 'index'])->middleware('permission:view_staff_ratings');

        // Get specific rating
        Route::get('/{rating}', [StaffRatingController::class, 'show'])->middleware('permission:view_staff_ratings');

        // Create new manual rating
        Route::post('/', [StaffRatingController::class, 'store'])->middleware('permission:give_staff_ratings');

        // Update existing rating
        Route::put('/{rating}', [StaffRatingController::class, 'update'])->middleware('permission:edit_staff_ratings');

        // Delete rating
        Route::delete('/{rating}', [StaffRatingController::class, 'destroy'])->middleware('permission:delete_staff_ratings');

        // Get automatic rating breakdown
        Route::get('/staff/{staff}/breakdown', [StaffRatingController::class, 'breakdown'])->middleware('permission:view_staff_ratings');

        // Get rateable users
        Route::get('/rateable-users', [StaffRatingController::class, 'getRateableUsers'])->middleware('permission:give_staff_ratings');

        // Get statistics for multiple staff
        Route::post('/statistics', [StaffRatingController::class, 'statistics'])->middleware('permission:view_staff_ratings');
    });

    // ============================================
    // Rating Configuration (SuperAdmin, RegionAdmin)
    // ============================================
    Route::prefix('configuration')->middleware('permission:configure_staff_ratings')->group(function () {
        Route::get('/', [RatingConfigurationController::class, 'index']);
        Route::get('/{configuration}', [RatingConfigurationController::class, 'show']);
        Route::put('/{configuration}', [RatingConfigurationController::class, 'update']);
        Route::post('/bulk-update', [RatingConfigurationController::class, 'bulkUpdate']);
        Route::post('/reset', [RatingConfigurationController::class, 'reset']);
        Route::get('/history', [RatingConfigurationController::class, 'history']);
        Route::post('/validate', [RatingConfigurationController::class, 'validate']);
    });

    // ============================================
    // Dashboard & Analytics
    // ============================================
    Route::prefix('dashboard')->middleware('permission:view_staff_ratings')->group(function () {
        // Overview statistics
        Route::get('/overview', [RatingDashboardController::class, 'overview']);

        // Leaderboard
        Route::get('/leaderboard', [RatingDashboardController::class, 'leaderboard']);

        // Trend analysis
        Route::get('/trend', [RatingDashboardController::class, 'trend']);

        // Compare multiple staff
        Route::post('/compare', [RatingDashboardController::class, 'compare']);

        // Institution statistics
        Route::get('/institution/{institution}', [RatingDashboardController::class, 'institutionStats']);

        // Export data
        Route::get('/export', [RatingDashboardController::class, 'export']);
    });

    // ============================================
    // My Ratings (All staff can view their own)
    // ============================================
    Route::prefix('my-rating')->group(function () {
        // Get my ratings
        Route::get('/', [MyRatingController::class, 'index']);

        // Get my automatic rating breakdown
        Route::get('/breakdown', [MyRatingController::class, 'breakdown']);

        // Get my rating history
        Route::get('/history', [MyRatingController::class, 'history']);

        // Compare with peer average
        Route::get('/peer-comparison', [MyRatingController::class, 'peerComparison']);

        // Get my rank in leaderboard
        Route::get('/rank', [MyRatingController::class, 'myRank']);

        // Get summary
        Route::get('/summary', [MyRatingController::class, 'summary']);
    });

    // ============================================
    // Audit Logs (SuperAdmin, RegionAdmin)
    // ============================================
    Route::prefix('audit')->middleware('permission:view_staff_ratings')->group(function () {
        // Get all logs
        Route::get('/', [RatingAuditController::class, 'index']);

        // Get specific log
        Route::get('/{log}', [RatingAuditController::class, 'show']);

        // Logs for specific staff
        Route::get('/staff/{staff}', [RatingAuditController::class, 'forStaff']);

        // Logs by specific actor
        Route::get('/actor/{actor}', [RatingAuditController::class, 'byActor']);

        // Recent activity
        Route::get('/recent', [RatingAuditController::class, 'recent']);

        // Statistics
        Route::get('/statistics', [RatingAuditController::class, 'statistics']);

        // Export logs
        Route::get('/export', [RatingAuditController::class, 'export']);
    });
});
