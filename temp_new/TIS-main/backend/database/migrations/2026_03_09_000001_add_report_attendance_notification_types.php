<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Yeni notification tipləri:
     * - report_table_assigned  : Cədvəl məktəbə dərc edildi
     * - report_table_approved  : Sətir/cavab təsdiqləndi
     * - report_table_rejected  : Sətir/cavab rədd edildi
     * - attendance_reminder    : Davamiyyət qeyd edilməmişdir
     */
    public function up(): void
    {
        $allTypes = [
            'task_assigned',
            'task_updated',
            'task_deadline',
            'task_status_update',
            'task_approval_required',
            'task_approved',
            'task_rejected',
            'task_assignment_completed',
            'task_delegation_completed',
            'task_delegation_rejected',
            'task_deadline_approaching',
            'task_overdue',
            'survey_published',
            'survey_assigned',
            'survey_assignment',
            'survey_deadline',
            'survey_deadline_reminder',
            'survey_deadline_3_days',
            'survey_deadline_1_day',
            'survey_deadline_today',
            'survey_overdue',
            'survey_approved',
            'survey_rejected',
            'survey_approval_rejected',
            'survey_approval_delegated',
            'survey_created',
            'approval_completed',
            'revision_required',
            'link_shared',
            'link_updated',
            'document_shared',
            'document_uploaded',
            'document_updated',
            'system_alert',
            'maintenance',
            'security_alert',
            // Yeni tiplər
            'report_table_assigned',
            'report_table_approved',
            'report_table_rejected',
            'attendance_reminder',
        ];

        if (DB::getDriverName() === 'sqlite') {
            // SQLite CHECK constraint dəstəkləmir — skip
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');

            $quoted = array_map(fn ($t) => "'{$t}'", $allTypes);
            $list = implode(', ', $quoted);

            DB::statement("
                ALTER TABLE notifications
                ADD CONSTRAINT notifications_type_check
                CHECK (type IN ({$list}))
            ");
        } else {
            // MySQL
            $quoted = array_map(fn ($t) => "'{$t}'", $allTypes);
            $list = implode(', ', $quoted);

            DB::statement("
                ALTER TABLE notifications
                MODIFY COLUMN type ENUM({$list})
                COMMENT 'Notification trigger types'
            ");
        }
    }

    public function down(): void
    {
        $previousTypes = [
            'task_assigned',
            'task_updated',
            'task_deadline',
            'task_status_update',
            'task_approval_required',
            'task_approved',
            'task_rejected',
            'task_assignment_completed',
            'task_delegation_completed',
            'task_delegation_rejected',
            'task_deadline_approaching',
            'task_overdue',
            'survey_published',
            'survey_assigned',
            'survey_assignment',
            'survey_deadline',
            'survey_deadline_reminder',
            'survey_deadline_3_days',
            'survey_deadline_1_day',
            'survey_deadline_today',
            'survey_overdue',
            'survey_approved',
            'survey_rejected',
            'survey_approval_rejected',
            'survey_approval_delegated',
            'survey_created',
            'approval_completed',
            'revision_required',
            'link_shared',
            'link_updated',
            'document_shared',
            'document_uploaded',
            'document_updated',
            'system_alert',
            'maintenance',
            'security_alert',
        ];

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');

            $quoted = array_map(fn ($t) => "'{$t}'", $previousTypes);
            $list = implode(', ', $quoted);

            DB::statement("
                ALTER TABLE notifications
                ADD CONSTRAINT notifications_type_check
                CHECK (type IN ({$list}))
            ");
        }
    }
};
