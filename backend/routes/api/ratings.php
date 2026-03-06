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
    Route::get('/', [App\Http\Controllers\API\RatingController::class, 'index'])
        ->middleware('permission:ratings.read');

    Route::post('/', [App\Http\Controllers\API\RatingController::class, 'store'])
        ->middleware('permission:ratings.write');

    Route::get('/{rating}', [App\Http\Controllers\API\RatingController::class, 'show'])
        ->middleware('permission:ratings.read');

    Route::put('/{rating}', [App\Http\Controllers\API\RatingController::class, 'update'])
        ->middleware('permission:ratings.write');

    Route::delete('/{rating}', [App\Http\Controllers\API\RatingController::class, 'destroy'])
        ->middleware('permission:ratings.delete');

    // Rating calculation
    Route::post('/calculate/{user}', [App\Http\Controllers\API\RatingController::class, 'calculate'])
        ->middleware('permission:ratings.calculate');

    Route::post('/calculate-all', [App\Http\Controllers\API\RatingController::class, 'calculateAll'])
        ->middleware('permission:ratings.calculate');
});
