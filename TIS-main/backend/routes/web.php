<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CsrfController;
use App\Http\Middleware\ForceCors;

// Apply CORS middleware to all web routes
Route::middleware([ForceCors::class])->group(function () {
    Route::get('/', function () {
        return view('welcome');
    });

    // Custom CSRF cookie endpoint
    Route::get('/sanctum/csrf-cookie', [CsrfController::class, 'getCookie']);
    Route::options('/sanctum/csrf-cookie', [CsrfController::class, 'options']);
});
