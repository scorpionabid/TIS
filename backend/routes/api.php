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

// Apply CORS middleware to all API routes
Route::middleware([\App\Http\Middleware\ForceCors::class])->group(function () {
    // Load public routes (no authentication required)
    require __DIR__ . '/api/public.php';

    // Load authenticated routes
    // auth:sanctum checks token validity
    // auth.custom checks is_active, account_locked_until, password_change_required
    Route::middleware(['auth:sanctum', 'auth.custom'])->group(function () {
        // DEBUG ENDPOINT - Local environment only (removed 'development' and 'testing')
        if (app()->environment('local')) {
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
                        ->filter(fn ($p) => str_starts_with($p->name, 'teaching_loads'))
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

        // Permission Management Routes (SuperAdmin only)
        require __DIR__ . '/api/permissions.php';

        // Dashboard Routes (Role-specific)
        require __DIR__ . '/api/dashboards.php';

        // Survey Management Routes
        require __DIR__ . '/api/surveys.php';

        // Survey Approval Routes (Enhanced)
        require __DIR__ . '/api/survey-approval.php';

        // Educational Management Routes
        require __DIR__ . '/api/educational.php';

        // RegionAdmin Specific Routes
        require __DIR__ . '/api/regionadmin.php';

        // Document & Task Management Routes
        require __DIR__ . '/api/documents.php';

        // Link Share Management Routes
        require __DIR__ . '/api/links.php';

        // Rating System Routes
        require __DIR__ . '/api/ratings.php';

        // PRD: Teacher Rating System Routes (Müəllim Reytinq Sistemi)
        require __DIR__ . '/api/teacher-rating.php';

        // Task Management Routes (Modular Structure)
        require __DIR__ . '/api/tasks.php';

        // Specialized Module Routes
        require __DIR__ . '/api/specialized.php';

        // Preschool Attendance & Group Management Routes
        require __DIR__ . '/api/preschool.php';

        // Report Tables Module Routes
        require __DIR__ . '/api/report-tables.php';

        // Messaging Routes
        require __DIR__ . '/api/messages.php';

        // AI Analysis Routes
        require __DIR__ . '/api/ai-analysis.php';
    });

    // Test route (public)
    Route::get('/test-approval', function () {
        return response()->json(['status' => 'working']);
    });
});
