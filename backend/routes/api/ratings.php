<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rating System API Routes
|--------------------------------------------------------------------------
|
| Rating calculation and management endpoints
|
*/

Route::prefix('ratings')->group(function () {
    // Rating CRUD operations
    Route::get('/', [App\Http\Controllers\Api\RatingController::class, 'index'])
        ->middleware('permission:ratings.read');
    
    Route::post('/', [App\Http\Controllers\Api\RatingController::class, 'store'])
        ->middleware('permission:ratings.write');
    
    Route::get('/{rating}', [App\Http\Controllers\Api\RatingController::class, 'show'])
        ->middleware('permission:ratings.read');
    
    Route::put('/{rating}', [App\Http\Controllers\Api\RatingController::class, 'update'])
        ->middleware('permission:ratings.write');
    
    Route::delete('/{rating}', [App\Http\Controllers\Api\RatingController::class, 'destroy'])
        ->middleware('permission:ratings.delete');
    
    // Rating calculation
    Route::post('/calculate/{user}', [App\Http\Controllers\Api\RatingController::class, 'calculate'])
        ->middleware('permission:ratings.calculate');
    
    Route::post('/calculate-all', [App\Http\Controllers\Api\RatingController::class, 'calculateAll'])
        ->middleware('permission:ratings.calculate');
});
