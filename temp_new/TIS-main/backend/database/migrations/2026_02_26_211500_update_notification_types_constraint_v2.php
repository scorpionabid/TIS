<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // No CHECK constraints in SQLite
        } elseif (DB::getDriverName() === 'pgsql') {
            // For PostgreSQL, update the list of allowed types
            DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
            DB::statement("
                ALTER TABLE notifications
                ADD CONSTRAINT notifications_type_check
                CHECK (type IN (
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
                    'security_alert'
                ))
            ");
        } else {
            // For MySQL, update ENUM
            DB::statement("
                ALTER TABLE notifications
                MODIFY COLUMN type ENUM(
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
                    'security_alert'
                ) COMMENT 'Notification trigger types'
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverting this is not needed as it's an additive change
    }
};
