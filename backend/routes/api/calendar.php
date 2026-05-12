<?php

use App\Http\Controllers\UserCalendarController;
use Illuminate\Support\Facades\Route;

Route::prefix('calendar')->controller(UserCalendarController::class)->group(function () {
    // Events
    Route::get('/events', 'indexEvents');
    Route::post('/events', 'storeEvent');
    Route::put('/events/{event}', 'updateEvent');
    Route::delete('/events/{event}', 'destroyEvent');

    // Notes
    Route::get('/notes', 'indexNotes');
    Route::post('/notes', 'storeNote');
    Route::put('/notes/{note}', 'updateNote');
    Route::delete('/notes/{note}', 'destroyNote');
});
