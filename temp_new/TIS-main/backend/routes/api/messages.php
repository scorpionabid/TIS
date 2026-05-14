<?php

declare(strict_types=1);

use App\Http\Controllers\API\MessageController;
use Illuminate\Support\Facades\Route;

Route::prefix('messages')->group(function () {
    Route::get('/', [MessageController::class, 'index']);
    Route::get('/sent', [MessageController::class, 'sent']);
    Route::get('/unread-count', [MessageController::class, 'unreadCount']);
    Route::get('/recipients', [MessageController::class, 'recipients']);
    Route::get('/{id}', [MessageController::class, 'show']);
    Route::post('/', [MessageController::class, 'store']);
    Route::post('/{id}/read', [MessageController::class, 'markAsRead']);
    Route::delete('/{id}', [MessageController::class, 'destroy']);
});
