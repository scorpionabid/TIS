<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\ConfigController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

// NOT: config/constants və test/websocket/info auth arxasına köçürüldü (routes/api/auth.php)

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
|
| Routes that do not require authentication
|
*/

Route::middleware([\App\Http\Middleware\ForceCors::class])->group(function () {
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

    // Health check endpoints (no auth required)
    Route::get('health', [HealthController::class, 'health']);
    Route::get('ping', [HealthController::class, 'ping']);
    Route::get('version', [HealthController::class, 'version']);

    // Application configuration endpoint (public — yalnız UI config, həssas məlumat yox)
    Route::get('config/app', [ConfigController::class, 'getAppConfig']);
    // config/constants və test/websocket/info → auth arxasına köçürüldü (auth.php)
});
