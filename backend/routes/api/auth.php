<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Auth\DeviceController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\NavigationController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Authentication & Profile Routes
|--------------------------------------------------------------------------
|
| Routes for user authentication, profile management, and session handling
|
*/

// Profile management endpoints
Route::prefix('profile')->group(function () {
    Route::get('/', [ProfileController::class, 'show']);
    Route::put('/', [ProfileController::class, 'update']);
    Route::post('/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::delete('/avatar', [ProfileController::class, 'removeAvatar']);
    Route::get('/activity', [ProfileController::class, 'getActivity']);
    Route::put('/password', [ProfileController::class, 'updatePassword']);
});

// System stats (authenticated)
Route::get('stats', [HealthController::class, 'stats']);

// Auth routes
Route::post('logout', [AuthController::class, 'logout']);
Route::get('me', [AuthController::class, 'me']);

// User Preferences Management
Route::prefix('user')->group(function () {
    Route::put('preferences', [UserController::class, 'updatePreferences']);
    Route::get('preferences', [UserController::class, 'getPreferences']);
    Route::post('theme', [UserController::class, 'setTheme']);
    Route::post('language', [UserController::class, 'setLanguage']);
    Route::get('dashboard-config', [UserController::class, 'getDashboardConfig']);
    Route::put('dashboard-config', [UserController::class, 'updateDashboardConfig']);
});

// Password management
Route::put('password/change', [PasswordController::class, 'change']);
Route::post('password/reset/request', [PasswordController::class, 'requestReset']);

// Session management
Route::prefix('sessions')->group(function () {
    Route::get('/', [SessionController::class, 'index']);
    Route::delete('/{sessionId}', [SessionController::class, 'destroy']);
    Route::delete('/current', [SessionController::class, 'destroyCurrent']);
});

// Device management
Route::prefix('devices')->group(function () {
    Route::get('/', [DeviceController::class, 'index']);
    Route::post('/register', [DeviceController::class, 'register']);
    Route::delete('/{deviceId}', [DeviceController::class, 'revoke']);
    Route::put('/{deviceId}/name', [DeviceController::class, 'updateName']);
});

// Navigation routes
Route::get('navigation', [NavigationController::class, 'getNavigation']);
Route::get('navigation/permissions', [NavigationController::class, 'getNavigationWithPermissions']);