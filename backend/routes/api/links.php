<?php

use App\Http\Controllers\LinkShareControllerRefactored as LinkShareController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Link Share Management Routes
|--------------------------------------------------------------------------
|
| Routes for link sharing, management, and tracking
|
*/

// Link Share Management Routes
Route::prefix('links')->group(function () {
    Route::get('/', [LinkShareController::class, 'index'])->middleware('permission:links.read');
    Route::get('/stats', [LinkShareController::class, 'getStats'])->middleware('permission:links.read');
    Route::post('/', [LinkShareController::class, 'store'])->middleware('permission:links.create');
    Route::get('/{linkShare}', [LinkShareController::class, 'show'])->middleware('permission:links.read');
    Route::put('/{linkShare}', [LinkShareController::class, 'update'])->middleware('permission:links.update');
    Route::delete('/{linkShare}', [LinkShareController::class, 'destroy'])->middleware('permission:links.delete');
    Route::post('/{linkShare}/access', [LinkShareController::class, 'access'])->middleware('permission:links.read');
    Route::post('/{linkShare}/click', [LinkShareController::class, 'recordClick'])->middleware('permission:links.read');
    Route::get('/popular/list', [LinkShareController::class, 'getPopularLinks'])->middleware('permission:links.read');
    Route::get('/featured/list', [LinkShareController::class, 'getFeaturedLinks'])->middleware('permission:links.read');
    Route::post('/bulk-create', [LinkShareController::class, 'bulkCreate'])->middleware('permission:links.bulk');
    Route::post('/bulk-delete', [LinkShareController::class, 'bulkDelete'])->middleware('permission:links.bulk');
    Route::get('/tracking/activity', [LinkShareController::class, 'getTrackingActivity'])->middleware('permission:links.tracking');
    Route::get('/{linkShare}/tracking/history', [LinkShareController::class, 'getLinkHistory'])->middleware('permission:links.tracking');
});