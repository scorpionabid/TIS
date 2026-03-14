<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\GradeBookSession;
use App\Models\GradeBookCell;
use App\Models\User;
use Illuminate\Support\Collection;

class GradeBookNotificationService
{
    /**
     * Notify teachers when new exam is added
     */
    public function notifyNewExam(int $gradeBookSessionId, int $columnId): void
    {
        $gradeBook = GradeBookSession::with(['teachers.teacher', 'grade', 'subject'])->find($gradeBookSessionId);
        
        if (!$gradeBook) return;

        $column = \App\Models\GradeBookColumn::find($columnId);
        if (!$column) return;

        $title = "Yeni imtahan əlavə edildi: {$gradeBook->subject->name}";
        $message = "{$gradeBook->grade->name} sinfi üçün '{$column->column_label}' imtahanı yaradıldı.";

        foreach ($gradeBook->teachers as $teacherAssignment) {
            $this->createNotification(
                $teacherAssignment->teacher_id,
                $title,
                $message,
                'new_exam',
                [
                    'grade_book_session_id' => $gradeBookSessionId,
                    'column_id' => $columnId,
                    'route' => "/grade-books/{$gradeBookSessionId}",
                ]
            );
        }
    }

    /**
     * Notify when grades are updated
     */
    public function notifyGradeUpdate(int $cellId, ?float $oldScore, float $newScore, int $updatedBy): void
    {
        $cell = GradeBookCell::with(['column.gradeBookSession', 'student'])->find($cellId);
        
        if (!$cell) return;

        $gradeBook = $cell->column->gradeBookSession;
        
        // Notify other teachers
        $otherTeachers = $gradeBook->teachers()
            ->where('teacher_id', '!=', $updatedBy)
            ->pluck('teacher_id');

        $studentName = "{$cell->student->last_name} {$cell->student->first_name}";
        $change = $newScore - ($oldScore ?? 0);
        $changeText = $change > 0 ? "+{$change}" : $change;

        $title = "Bal yeniləndi: {$gradeBook->subject->name}";
        $message = "{$studentName} - {$cell->column->column_label}: {$newScore} ({$changeText})";

        foreach ($otherTeachers as $teacherId) {
            $this->createNotification(
                $teacherId,
                $title,
                $message,
                'grade_updated',
                [
                    'grade_book_session_id' => $gradeBook->id,
                    'cell_id' => $cellId,
                    'old_score' => $oldScore,
                    'new_score' => $newScore,
                    'route' => "/grade-books/{$gradeBook->id}",
                ]
            );
        }
    }

    /**
     * Notify about suspicious grade changes
     */
    public function notifySuspiciousActivity(int $gradeBookSessionId, array $suspiciousData): void
    {
        $gradeBook = GradeBookSession::with(['institution', 'grade', 'subject'])->find($gradeBookSessionId);
        
        if (!$gradeBook) return;

        // Get admins
        $admins = User::role(['superadmin', 'regionadmin', 'sectoradmin', 'schooladmin'])
            ->where(function ($q) use ($gradeBook) {
                $q->where('institution_id', $gradeBook->institution_id)
                    ->orWhereHas('roles', function ($rq) {
                        $rq->where('name', 'superadmin');
                    });
            })
            ->pluck('id');

        $title = "⚠️ Şübhəli fəaliyyət aşkar edildi";
        $message = "{$gradeBook->institution->name} - {$gradeBook->grade->name} {$gradeBook->subject->name} jurnalında şübhəli dəyişikliklər aşkar edildi.";

        foreach ($admins as $adminId) {
            $this->createNotification(
                $adminId,
                $title,
                $message,
                'suspicious_activity',
                [
                    'grade_book_session_id' => $gradeBookSessionId,
                    'suspicious_data' => $suspiciousData,
                    'route' => "/grade-books/{$gradeBookSessionId}/audit-logs",
                ],
                'high'
            );
        }
    }

    /**
     * Notify about deadline approaching
     */
    public function notifyDeadlineApproaching(int $gradeBookSessionId, int $daysRemaining): void
    {
        $gradeBook = GradeBookSession::with(['teachers.teacher', 'grade', 'subject'])->find($gradeBookSessionId);
        
        if (!$gradeBook) return;

        $title = "⏰ Son tarix yaxınlaşır";
        $message = "{$gradeBook->grade->name} {$gradeBook->subject->name} - Jurnal bağlanmasına {$daysRemaining} gün qaldı.";

        foreach ($gradeBook->teachers as $teacherAssignment) {
            $this->createNotification(
                $teacherAssignment->teacher_id,
                $title,
                $message,
                'deadline_approaching',
                [
                    'grade_book_session_id' => $gradeBookSessionId,
                    'days_remaining' => $daysRemaining,
                    'route' => "/grade-books/{$gradeBookSessionId}",
                ],
                $daysRemaining <= 3 ? 'high' : 'medium'
            );
        }
    }

    /**
     * Notify about grade book closure
     */
    public function notifyGradeBookClosed(int $gradeBookSessionId): void
    {
        $gradeBook = GradeBookSession::with(['teachers.teacher', 'grade', 'subject', 'institution'])->find($gradeBookSessionId);
        
        if (!$gradeBook) return;

        $title = "📋 Jurnal bağlandı";
        $message = "{$gradeBook->grade->name} {$gradeBook->subject->name} jurnalı bağlandı və arxivləşdirildi.";

        // Notify teachers
        foreach ($gradeBook->teachers as $teacherAssignment) {
            $this->createNotification(
                $teacherAssignment->teacher_id,
                $title,
                $message,
                'gradebook_closed',
                [
                    'grade_book_session_id' => $gradeBookSessionId,
                    'route' => "/grade-books/{$gradeBookSessionId}",
                ]
            );
        }

        // Notify school admins
        $admins = User::role('schooladmin')
            ->where('institution_id', $gradeBook->institution_id)
            ->pluck('id');

        foreach ($admins as $adminId) {
            $this->createNotification(
                $adminId,
                $title,
                $message,
                'gradebook_closed',
                [
                    'grade_book_session_id' => $gradeBookSessionId,
                    'route' => "/grade-books/{$gradeBookSessionId}",
                ]
            );
        }
    }

    /**
     * Send bulk notification to all grade book participants
     */
    public function sendBulkNotification(int $gradeBookSessionId, string $title, string $message): void
    {
        $gradeBook = GradeBookSession::with('teachers.teacher')->find($gradeBookSessionId);
        
        if (!$gradeBook) return;

        foreach ($gradeBook->teachers as $teacherAssignment) {
            $this->createNotification(
                $teacherAssignment->teacher_id,
                $title,
                $message,
                'bulk_notification',
                [
                    'grade_book_session_id' => $gradeBookSessionId,
                    'route' => "/grade-books/{$gradeBookSessionId}",
                ]
            );
        }
    }

    /**
     * Create notification
     */
    protected function createNotification(
        int $userId,
        string $title,
        string $message,
        string $type,
        array $data = [],
        string $priority = 'normal'
    ): Notification {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'priority' => $priority,
            'read_at' => null,
        ]);
    }

    /**
     * Get unread notifications for user
     */
    public function getUnreadNotifications(int $userId, int $limit = 20): Collection
    {
        return Notification::where('user_id', $userId)
            ->whereNull('read_at')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(int $notificationId, int $userId): bool
    {
        $notification = Notification::where('id', $notificationId)
            ->where('user_id', $userId)
            ->first();

        if (!$notification) {
            return false;
        }

        $notification->update(['read_at' => now()]);
        return true;
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(int $userId): int
    {
        return Notification::where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    /**
     * Get notification statistics
     */
    public function getNotificationStats(int $userId): array
    {
        $total = Notification::where('user_id', $userId)->count();
        $unread = Notification::where('user_id', $userId)->whereNull('read_at')->count();
        $byType = Notification::where('user_id', $userId)
            ->whereNull('read_at')
            ->selectRaw('type, count(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->toArray();

        return [
            'total' => $total,
            'unread' => $unread,
            'read' => $total - $unread,
            'by_type' => $byType,
        ];
    }
}
