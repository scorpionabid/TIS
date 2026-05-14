<?php

namespace App\Http\Controllers;

use App\Models\GradeBookAuditLog;
use App\Models\GradeBookSession;
use App\Services\GradeBookAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GradeBookAuditLogController extends Controller
{
    protected GradeBookAuditService $auditService;

    public function __construct(GradeBookAuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * GET /grade-books/{id}/audit-logs - Get audit logs for a grade book
     */
    public function index(Request $request, GradeBookSession $gradeBook): JsonResponse
    {
        // Permission check
        if (! $this->canView($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu jurnalın audit loglarını görüntülemək üçün icazəniz yoxdur.',
            ], 403);
        }

        $validated = $request->validate([
            'student_id' => 'nullable|integer',
            'user_id' => 'nullable|integer',
            'action_type' => 'nullable|in:create,update,bulk_update,column_archive',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $logs = $this->auditService->getSessionLogs(
            $gradeBook->id,
            $validated['student_id'] ?? null,
            $validated['start_date'] ?? null,
            $validated['end_date'] ?? null,
            $validated['user_id'] ?? null,
            $validated['per_page'] ?? 50
        );

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * GET /grade-books/{id}/students/{studentId}/history - Get student's grade history
     */
    public function studentHistory(GradeBookSession $gradeBook, int $studentId): JsonResponse
    {
        // Permission check
        if (! $this->canView($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu şagirdin tarixçəsini görüntülemək üçün icazəniz yoxdur.',
            ], 403);
        }

        $history = $this->auditService->getStudentHistory($studentId, $gradeBook->id);

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }

    /**
     * GET /grade-books/{id}/recent-activity - Get recent activity summary
     */
    public function recentActivity(GradeBookSession $gradeBook): JsonResponse
    {
        // Permission check
        if (! $this->canView($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu jurnalın aktivlik məlumatlarını görüntülemək üçün icazəniz yoxdur.',
            ], 403);
        }

        $activity = $this->auditService->getRecentActivity($gradeBook->id);

        return response()->json([
            'success' => true,
            'data' => $activity,
        ]);
    }

    /**
     * GET /grade-books/{id}/suspicious-activity - Detect suspicious activity
     */
    public function suspiciousActivity(GradeBookSession $gradeBook): JsonResponse
    {
        // Only admins can view suspicious activity
        if (! Auth::user()->hasAnyRole(['superadmin', 'regionadmin', 'sectoradmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Şübhəli fəaliyyətləri yoxlamaq üçün icazəniz yoxdur.',
            ], 403);
        }

        $suspicious = $this->auditService->detectSuspiciousActivity($gradeBook->id);

        return response()->json([
            'success' => true,
            'data' => $suspicious,
        ]);
    }

    /**
     * GET /grade-books/cells/{cellId}/history - Get cell history
     */
    public function cellHistory(int $cellId): JsonResponse
    {
        $cell = \App\Models\GradeBookCell::findOrFail($cellId);
        $gradeBook = $cell->column->gradeBookSession;

        // Permission check
        if (! $this->canView($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu xananın tarixçəsini görüntülemək üçün icazəniz yoxdur.',
            ], 403);
        }

        $history = GradeBookAuditLog::getCellHistory($cellId);

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }

    /**
     * Check if user can view this grade book
     */
    protected function canView(GradeBookSession $gradeBook): bool
    {
        $user = Auth::user();

        // Super admin can view all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // School admin can view their institution
        if ($user->hasRole('schooladmin') && $user->institution_id === $gradeBook->institution_id) {
            return true;
        }

        // Assigned teachers can view
        if ($gradeBook->assignedTeachers()->where('teacher_id', $user->id)->exists()) {
            return true;
        }

        // Region/sector admins can view within hierarchy
        if ($user->hasRole('regionadmin')) {
            return $gradeBook->institution->region_id === $user->region_id;
        }

        if ($user->hasRole('sectoradmin')) {
            return $gradeBook->institution->sector_id === $user->sector_id;
        }

        // Students can view their own grade book
        if ($user->hasRole('student')) {
            return $gradeBook->grade->enrollments()
                ->where('student_id', $user->student_id)
                ->where('enrollment_status', 'active')
                ->exists();
        }

        return false;
    }
}
