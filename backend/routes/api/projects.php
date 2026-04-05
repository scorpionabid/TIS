<?php

use App\Http\Controllers\Api\ProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('projects')->group(function () {
    Route::get('/', [ProjectController::class, 'index']);
    Route::post('/', [ProjectController::class, 'store']);
    Route::get('/stats', [ProjectController::class, 'stats']);
    Route::get('/{id}', [ProjectController::class, 'show']);

    // Activity routes
    Route::post('/{projectId}/activities', [ProjectController::class, 'addActivity']);
    Route::put('/activities/{activityId}', [ProjectController::class, 'updateActivity']);

    // Comment routes
    Route::get('/activities/{activityId}/comments', [ProjectController::class, 'getComments']);
    Route::post('/activities/{activityId}/comments', [ProjectController::class, 'addComment']);
});
