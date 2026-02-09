<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

/**
 * SchoolAdminController - Legacy Controller
 *
 * This controller has been refactored and split into specialized controllers:
 * - SchoolDashboardController: Dashboard, stats, notifications, quick actions
 * - SchoolClassController: Class/Grade management
 * - SchoolTeacherController: Teacher management
 * - SchoolStudentController: Student management and enrollment
 *
 * This file is kept for backward compatibility and will be removed in future versions.
 */
class SchoolAdminController extends BaseController
{
    /**
     * This controller has been deprecated and split into specialized controllers.
     * Please use the appropriate School/* controllers instead.
     */
    public function deprecated(): JsonResponse
    {
        return response()->json([
            'message' => 'This controller has been refactored into specialized controllers',
            'new_controllers' => [
                'dashboard' => 'School\SchoolDashboardController',
                'classes' => 'School\SchoolClassController',
                'teachers' => 'School\SchoolTeacherController',
                'students' => 'School\SchoolStudentController',
            ],
            'refactored_at' => now()->toISOString(),
        ], 200);
    }
}
