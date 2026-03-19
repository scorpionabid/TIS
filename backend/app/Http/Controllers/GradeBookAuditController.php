<?php

namespace App\Http\Controllers;

use App\Models\GradeBookSession;
use App\Services\GradeBookAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GradeBookAuditController extends Controller
{
    protected GradeBookAuditService $auditService;

    public function __construct(GradeBookAuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * GET /grade-books/{id}/audit-logs
     * Get audit logs for a grade book session
     */
    public function index(Request $request, int $gradeBookId): JsonResponse|StreamedResponse
    {
        $gradeBook = GradeBookSession::findOrFail($gradeBookId);

        // Check permissions
        if (!$this->canViewAuditLogs($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view audit logs.',
            ], 403);
        }

        if ((string) $request->get('export') === '1') {
            $logs = $this->auditService->getSessionLogs(
                $gradeBookId,
                $request->get('student_id'),
                $request->get('start_date'),
                $request->get('end_date'),
                $request->get('user_id'),
                100000
            );

            $filename = 'audit_logs_' . $gradeBookId . '_' . now()->format('Y-m-d_H-i-s') . '.csv';

            $response = new StreamedResponse(function () use ($logs) {
                $out = fopen('php://output', 'w');

                fputcsv($out, [
                    'id',
                    'created_at',
                    'action_type',
                    'student_id',
                    'student_name',
                    'column_id',
                    'column_label',
                    'semester',
                    'old_score',
                    'new_score',
                    'old_is_present',
                    'new_is_present',
                    'user_id',
                    'user_name',
                    'ip_address',
                    'notes',
                ]);

                foreach ($logs as $log) {
                    $studentName = $log->student ? trim(($log->student->last_name ?? '') . ' ' . ($log->student->first_name ?? '')) : null;
                    $userName = $log->user ? ($log->user->name ?? null) : null;
                    $columnLabel = $log->column ? ($log->column->column_label ?? null) : null;
                    $semester = $log->column ? ($log->column->semester ?? null) : null;

                    fputcsv($out, [
                        $log->id,
                        optional($log->created_at)->toDateTimeString(),
                        $log->action_type,
                        $log->student_id,
                        $studentName,
                        $log->grade_book_column_id,
                        $columnLabel,
                        $semester,
                        $log->old_score,
                        $log->new_score,
                        $log->old_is_present,
                        $log->new_is_present,
                        $log->user_id,
                        $userName,
                        $log->ip_address,
                        $log->notes,
                    ]);
                }

                fclose($out);
            });

            $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
            $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

            return $response;
        }

        $logs = $this->auditService->getSessionLogs(
            $gradeBookId,
            $request->get('student_id'),
            $request->get('start_date'),
            $request->get('end_date'),
            $request->get('user_id'),
            $request->get('per_page', 50)
        );

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * GET /grade-books/{id}/audit-logs/student/{studentId}
     * Get grade history for a specific student
     */
    public function studentHistory(int $gradeBookId, int $studentId): JsonResponse
    {
        $gradeBook = GradeBookSession::findOrFail($gradeBookId);

        if (!$this->canViewAuditLogs($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $history = $this->auditService->getStudentHistory($studentId, $gradeBookId);

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }

    /**
     * GET /grade-books/{id}/audit-logs/recent-activity
     * Get recent activity summary
     */
    public function recentActivity(int $gradeBookId): JsonResponse
    {
        $gradeBook = GradeBookSession::findOrFail($gradeBookId);

        if (!$this->canViewAuditLogs($gradeBook)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $activity = $this->auditService->getRecentActivity($gradeBookId);

        return response()->json([
            'success' => true,
            'data' => $activity,
        ]);
    }

    /**
     * GET /grade-books/{id}/audit-logs/suspicious-activity
     * Detect suspicious activity
     */
    public function suspiciousActivity(int $gradeBookId): JsonResponse
    {
        $gradeBook = GradeBookSession::findOrFail($gradeBookId);

        // Only admins can view suspicious activity
        if (!Auth::user()->hasAnyRole(['superadmin', 'regionadmin', 'sectoradmin', 'schooladmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $suspicious = $this->auditService->detectSuspiciousActivity($gradeBookId);

        return response()->json([
            'success' => true,
            'data' => $suspicious,
        ]);
    }

    /**
     * Check if user can view audit logs
     */
    private function canViewAuditLogs(GradeBookSession $gradeBook): bool
    {
        $user = Auth::user();

        // Super admins can view all
        if ($user->hasRole('superadmin')) {
            return true;
        }

        // Region/sector admins can view within their hierarchy
        if ($user->hasRole('regionadmin')) {
            return $gradeBook->institution->region_id === $user->region_id;
        }

        if ($user->hasRole('sectoradmin')) {
            return $gradeBook->institution->sector_id === $user->sector_id;
        }

        // School admin can view their institution
        if ($user->hasRole('schooladmin')) {
            return $gradeBook->institution_id === $user->institution_id;
        }

        // Teachers assigned to this grade book can view
        if ($user->hasRole('teacher')) {
            return $gradeBook->assignedTeachers()->where('teacher_id', $user->id)->exists();
        }

        return false;
    }
}
