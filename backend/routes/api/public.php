<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\ConfigController;
use App\Http\Controllers\HealthController;
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

// Password reset routes (no auth required)
Route::post('password/reset/request', [PasswordController::class, 'requestReset']);
Route::post('password/reset/confirm', [PasswordController::class, 'resetWithToken']);

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

// WebSocket configuration endpoint (no auth required)
Route::get('test/websocket/info', function () {
    // Check if broadcasting is enabled (not 'log' or 'null')
    $broadcastDriver = env('BROADCAST_CONNECTION', 'log');
    $isWebSocketEnabled = ! in_array($broadcastDriver, ['log', 'null']);

    if (! $isWebSocketEnabled) {
        return response()->json([
            'success' => false,
            'message' => 'WebSocket/Broadcasting is disabled. Using polling for updates.',
        ]);
    }

    return response()->json([
        'success' => true,
        'data' => [
            'app_key' => env('REVERB_APP_KEY', 'atis-notification-2024'),
            'reverb_host' => env('REVERB_HOST', 'localhost'),
            'reverb_port' => (int) env('REVERB_PORT', 8080),
            'reverb_scheme' => env('REVERB_PORT', 8080) == 443 ? 'https' : 'http',
        ],
    ]);
});
