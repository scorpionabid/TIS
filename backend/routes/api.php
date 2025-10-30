<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| This file now serves as the main entry point for all API routes.
| Individual route groups are organized in separate files for better
| maintainability and to avoid duplication.
|
*/

// Load public routes (no authentication required)
require __DIR__ . '/api/public.php';

// Load authenticated routes
Route::middleware('auth:sanctum')->group(function () {

    // DEBUG ENDPOINT - Check current user permissions (Development Only)
    if (app()->environment('local', 'development', 'testing')) {
        Route::get('/debug/my-permissions', function (Illuminate\Http\Request $request) {
        $user = $request->user();

        // Check if user model has permission trait methods
        $hasTrait = in_array('Spatie\\Permission\\Traits\\HasRoles', class_uses_recursive($user));

        $guard = config('auth.defaults.guard', 'sanctum');

        // Try different permission check methods
        $hasPermissionTo = false;
        $canAccess = false;
        $checkPermissionTo = false;

        try {
            $hasPermissionTo = $user->hasPermissionTo('users.read', $guard);
        } catch (\Exception $e) {
            $hasPermissionTo = 'ERROR: ' . $e->getMessage();
        }

        try {
            \Illuminate\Support\Facades\Auth::shouldUse($guard);
            $canAccess = $user->can('users.read');
        } catch (\Exception $e) {
            $canAccess = 'ERROR: ' . $e->getMessage();
        }

        try {
            $checkPermissionTo = method_exists($user, 'checkPermissionTo')
                ? $user->checkPermissionTo('users.read', $guard)
                : 'method not exists';
        } catch (\Exception $e) {
            $checkPermissionTo = 'ERROR: ' . $e->getMessage();
        }

        return response()->json([
            'user_id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'institution_id' => $user->institution_id,
            'user_class' => get_class($user),
            'has_permission_trait' => $hasTrait,
            'roles' => $user->getRoleNames(),
            'all_permissions' => $user->getAllPermissions()->pluck('name'),
            'teaching_loads_permissions' => $user->getAllPermissions()
                ->filter(fn($p) => str_starts_with($p->name, 'teaching_loads'))
                ->pluck('name'),
            'permission_checks' => [
                'hasPermissionTo' => $hasPermissionTo,
                'can' => $canAccess,
                'checkPermissionTo' => $checkPermissionTo,
            ],
        ]);
        });
    }

    // Authentication & Profile Routes
    require __DIR__ . '/api/auth.php';
    
    // Admin & System Management Routes
    require __DIR__ . '/api/admin.php';
    
    // Dashboard Routes (Role-specific)
    require __DIR__ . '/api/dashboards.php';
    
    // Survey Management Routes
    require __DIR__ . '/api/surveys.php';
    
    // Survey Approval Routes (Enhanced)
    require __DIR__ . '/api/survey-approval.php';
    
    // [REMOVED] Old survey-response-approval.php - consolidated into survey-approval.php
    
    // Educational Management Routes
    require __DIR__ . '/api/educational.php';
    
    // Document & Task Management Routes
    require __DIR__ . '/api/documents.php';
    
    // Link Share Management Routes
    require __DIR__ . '/api/links.php';
    
    // Specialized Module Routes
    require __DIR__ . '/api/specialized.php';
    
});Route::get('/test-approval', function() { return response()->json(['status' => 'working']); });
