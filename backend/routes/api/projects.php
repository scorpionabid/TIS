<?php

use App\Http\Controllers\API\ProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('projects')->group(function () {
    Route::get('/', [ProjectController::class, 'index']);
    Route::get('/my-activities', [ProjectController::class, 'myActivities']);
    Route::get('/urgent-activities', [ProjectController::class, 'urgentActivities']);
    Route::post('/', [ProjectController::class, 'store']);
    Route::get('/stats', [ProjectController::class, 'stats']);
    Route::get('/workload-stats', [ProjectController::class, 'workloadStats']);
    Route::post('/batch-update', [ProjectController::class, 'batchUpdate']);
    Route::get('/{id}', [ProjectController::class, 'show']);
    Route::get('/{id}/export', [ProjectController::class, 'export']);
    Route::put('/{id}', [ProjectController::class, 'update']);
    Route::post('/{id}/archive', [ProjectController::class, 'archive']);
    Route::post('/{id}/unarchive', [ProjectController::class, 'unarchive']);
    Route::delete('/{id}', [ProjectController::class, 'destroy']); // Placeholder if needed

    // Activity routes
    Route::post('/{projectId}/activities', [ProjectController::class, 'addActivity']);
    Route::put('/activities/{activityId}', [ProjectController::class, 'updateActivity']);
    Route::delete('/activities/{activityId}', [ProjectController::class, 'deleteActivity']);
    Route::post('/{projectId}/activities/reorder', [ProjectController::class, 'reorderActivities']);
    Route::get('/activities/{activityId}/logs', [ProjectController::class, 'getLogs']);
    Route::post('/activities/{activityId}/attachments', [ProjectController::class, 'uploadAttachment']);

    // Comment routes
    Route::get('/activities/{activityId}/comments', [ProjectController::class, 'getComments']);
    Route::post('/activities/{activityId}/comments', [ProjectController::class, 'addComment']);
});
