<?php

namespace App\Services;

use App\Models\GradeBookAuditLog;
use App\Models\GradeBookCell;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Collection;

class GradeBookAuditService
{
    /**
     * Log a single cell update
     */
    public function logCellUpdate(
        int $gradeBookSessionId,
        int $studentId,
        int $columnId,
        ?float $oldScore,
        ?float $newScore,
        ?bool $oldIsPresent,
        ?bool $newIsPresent,
        int $userId,
        ?string $notes = null
    ): GradeBookAuditLog {
        return GradeBookAuditLog::create([
            'grade_book_session_id' => $gradeBookSessionId,
            'student_id' => $studentId,
            'grade_book_column_id' => $columnId,
            'user_id' => $userId,
            'action_type' => 'update',
            'old_score' => $oldScore,
            'new_score' => $newScore,
            'old_is_present' => $oldIsPresent,
            'new_is_present' => $newIsPresent,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'notes' => $notes,
        ]);
    }

    /**
     * Log bulk cell updates
     */
    public function logBulkUpdate(
        int $gradeBookSessionId,
        array $updates,
        int $userId,
        ?string $notes = null
    ): void {
        $logs = [];
        $now = now();

        foreach ($updates as $update) {
            $logs[] = [
                'grade_book_session_id' => $gradeBookSessionId,
                'student_id' => $update['student_id'],
                'grade_book_column_id' => $update['column_id'],
                'user_id' => $userId,
                'action_type' => 'bulk_update',
                'old_score' => $update['old_score'] ?? null,
                'new_score' => $update['new_score'] ?? null,
                'old_is_present' => $update['old_is_present'] ?? null,
                'new_is_present' => $update['new_is_present'] ?? null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'notes' => $notes,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (!empty($logs)) {
            GradeBookAuditLog::insert($logs);
        }
    }

    /**
     * Log cell creation
     */
    public function logCellCreation(
        int $gradeBookSessionId,
        int $studentId,
        int $columnId,
        ?float $score,
        ?bool $isPresent,
        int $userId,
        ?string $notes = null
    ): GradeBookAuditLog {
        return GradeBookAuditLog::create([
            'grade_book_session_id' => $gradeBookSessionId,
            'student_id' => $studentId,
            'grade_book_column_id' => $columnId,
            'user_id' => $userId,
            'action_type' => 'create',
            'new_score' => $score,
            'new_is_present' => $isPresent,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'notes' => $notes,
        ]);
    }

    /**
     * Get audit logs for a grade book session
     */
    public function getSessionLogs(
        int $gradeBookSessionId,
        ?int $studentId = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?int $userId = null,
        int $perPage = 50
    ) {
        $query = GradeBookAuditLog::with(['student', 'column', 'user'])
            ->where('grade_book_session_id', $gradeBookSessionId)
            ->orderBy('created_at', 'desc');

        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get student's grade history
     */
    public function getStudentHistory(int $studentId, int $gradeBookSessionId): Collection
    {
        return GradeBookAuditLog::with(['column', 'user'])
            ->where('student_id', $studentId)
            ->where('grade_book_session_id', $gradeBookSessionId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get recent activity summary
     */
    public function getRecentActivity(int $gradeBookSessionId, int $hours = 24): array
    {
        $since = now()->subHours($hours);

        $stats = GradeBookAuditLog::where('grade_book_session_id', $gradeBookSessionId)
            ->where('created_at', '>=', $since)
            ->selectRaw('action_type, count(*) as count')
            ->groupBy('action_type')
            ->pluck('count', 'action_type')
            ->toArray();

        $recentChanges = GradeBookAuditLog::with(['student', 'user'])
            ->where('grade_book_session_id', $gradeBookSessionId)
            ->where('created_at', '>=', $since)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return [
            'stats' => $stats,
            'recent_changes' => $recentChanges,
            'total_changes' => array_sum($stats),
        ];
    }

    /**
     * Detect suspicious activity (potential fraud)
     */
    public function detectSuspiciousActivity(int $gradeBookSessionId, int $hours = 1): array
    {
        $since = now()->subHours($hours);

        // Check for bulk updates by single user
        $bulkUpdates = GradeBookAuditLog::where('grade_book_session_id', $gradeBookSessionId)
            ->where('created_at', '>=', $since)
            ->where('action_type', 'bulk_update')
            ->selectRaw('user_id, count(*) as update_count')
            ->groupBy('user_id')
            ->having('update_count', '>', 20)
            ->get();

        // Check for score changes > 30 points
        $largeChanges = GradeBookAuditLog::with(['student', 'user'])
            ->where('grade_book_session_id', $gradeBookSessionId)
            ->where('created_at', '>=', $since)
            ->where('action_type', 'update')
            ->whereRaw('ABS(COALESCE(new_score, 0) - COALESCE(old_score, 0)) > 30')
            ->get();

        // Check for multiple changes to same student by different users
        $conflicts = GradeBookAuditLog::where('grade_book_session_id', $gradeBookSessionId)
            ->where('created_at', '>=', $since)
            ->selectRaw('student_id, count(distinct user_id) as user_count')
            ->groupBy('student_id')
            ->having('user_count', '>', 1)
            ->get();

        return [
            'bulk_updates' => $bulkUpdates,
            'large_changes' => $largeChanges,
            'conflicts' => $conflicts,
            'has_suspicious_activity' => $bulkUpdates->isNotEmpty() || $largeChanges->isNotEmpty() || $conflicts->isNotEmpty(),
        ];
    }
}
