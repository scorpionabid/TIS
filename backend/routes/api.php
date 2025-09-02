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
    
    // Survey Response Approval Routes (Enterprise)
    require __DIR__ . '/api/survey-response-approval.php';
    
    // Educational Management Routes
    require __DIR__ . '/api/educational.php';
    
    // Document & Task Management Routes
    require __DIR__ . '/api/documents.php';
    
    // Link Share Management Routes
    require __DIR__ . '/api/links.php';
    
    // Specialized Module Routes
    require __DIR__ . '/api/specialized.php';
    
});Route::get('/test-approval', function() { return response()->json(['status' => 'working']); });
