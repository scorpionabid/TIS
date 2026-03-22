<?php

namespace App\Enums;

enum NotificationType: string
{
    // ── Task types ─────────────────────────────────────────────────────────
    case TaskAssigned           = 'task_assigned';
    case TaskUpdated            = 'task_updated';
    case TaskDeadline           = 'task_deadline';
    case TaskStatusUpdate       = 'task_status_update';
    case TaskApprovalRequired   = 'task_approval_required';
    case TaskApproved           = 'task_approved';
    case TaskRejected           = 'task_rejected';
    case TaskDeadlineApproaching = 'task_deadline_approaching';
    case TaskOverdue            = 'task_overdue';
    case TaskAssignmentCompleted  = 'task_assignment_completed';
    case TaskDelegationCompleted  = 'task_delegation_completed';
    case TaskDelegationRejected   = 'task_delegation_rejected';

    // ── Survey types ────────────────────────────────────────────────────────
    case SurveyPublished        = 'survey_published';
    case SurveyAssigned         = 'survey_assigned';
    case SurveyAssignment       = 'survey_assignment';
    case SurveyDeadline         = 'survey_deadline';
    case SurveyDeadlineReminder = 'survey_deadline_reminder';
    case SurveyDeadline3Days    = 'survey_deadline_3_days';
    case SurveyDeadline1Day     = 'survey_deadline_1_day';
    case SurveyDeadlineToday    = 'survey_deadline_today';
    case SurveyOverdue          = 'survey_overdue';
    case SurveyApproved         = 'survey_approved';
    case SurveyRejected         = 'survey_rejected';
    case SurveyApprovalRejected = 'survey_approval_rejected';
    case SurveyApprovalDelegated = 'survey_approval_delegated';
    case SurveyCreated          = 'survey_created';
    case ApprovalCompleted      = 'approval_completed';
    case RevisionRequired       = 'revision_required';

    // ── Document types ──────────────────────────────────────────────────────
    case DocumentShared         = 'document_shared';
    case DocumentUploaded       = 'document_uploaded';
    case DocumentUpdated        = 'document_updated';
    case LinkShared             = 'link_shared';
    case LinkUpdated            = 'link_updated';

    // ── Attendance types ────────────────────────────────────────────────────
    case AttendanceReminder     = 'attendance_reminder';

    // ── System types ────────────────────────────────────────────────────────
    case SystemAlert            = 'system_alert';
    case Maintenance            = 'maintenance';
    case SecurityAlert          = 'security_alert';

    // ── Helper ──────────────────────────────────────────────────────────────

    /** UI category used for grouping / badge counts */
    public function uiGroup(): string
    {
        return match(true) {
            str_starts_with($this->value, 'task_')       => 'tasks',
            str_starts_with($this->value, 'survey_'),
            in_array($this->value, ['approval_completed', 'revision_required']) => 'surveys',
            str_starts_with($this->value, 'document_'),
            str_starts_with($this->value, 'link_')       => 'documents',
            $this->value === 'attendance_reminder'        => 'attendance',
            default                                       => 'system',
        };
    }

    /** Returns all type values as a plain string array (for validation rules) */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
