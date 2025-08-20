<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ConfigController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
|
| Routes that do not require authentication
|
*/

// Test route
Route::get('test', function () {
    return response()->json(['message' => 'ATİS API works!', 'timestamp' => now()]);
});

// Authentication routes
Route::post('login', [AuthController::class, 'login'])->name('login');
Route::post('register', [PasswordController::class, 'register']);

// Setup wizard routes (public for initial setup)
Route::prefix('setup')->group(function () {
    Route::get('status', [App\Http\Controllers\SetupWizardController::class, 'checkSetupStatus']);
    Route::post('initialize', [App\Http\Controllers\SetupWizardController::class, 'initializeSystem']);
    Route::post('sample-structure', [App\Http\Controllers\SetupWizardController::class, 'createSampleStructure']);
    Route::get('validate', [App\Http\Controllers\SetupWizardController::class, 'validateSystemData']);
});

// Health check endpoints (no auth required)
Route::get('health', [HealthController::class, 'health']);
Route::get('ping', [HealthController::class, 'ping']);
Route::get('version', [HealthController::class, 'version']);

// Application configuration endpoints (no auth required)
Route::get('config/app', [ConfigController::class, 'getAppConfig']);
Route::get('config/constants', [ConfigController::class, 'getConstants']);