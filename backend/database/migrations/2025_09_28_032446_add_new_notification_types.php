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
            // For SQLite, we don't have CHECK constraints, so no changes needed
            // The type is already string without constraints
        } elseif (DB::getDriverName() === 'pgsql') {
            // For PostgreSQL, add new types to the constraint if it exists
            $hasTypeConstraint = DB::select("
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = 'notifications'
                AND constraint_type = 'CHECK'
                AND constraint_name LIKE '%type%'
            ");

            if ($hasTypeConstraint) {
                // Remove old constraint and add new one
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
                        'task_deadline_approaching',
                        'task_overdue',
                        'survey_published',
                        'survey_assigned',
                        'survey_deadline',
                        'survey_approved',
                        'survey_rejected',
                        'link_shared',
                        'document_shared',
                        'system_alert',
                        'maintenance',
                        'security_alert'
                    ))
                ");
            }
        } else {
            // For MySQL, update the ENUM constraint
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
                    'task_deadline_approaching',
                    'task_overdue',
                    'survey_published',
                    'survey_assigned',
                    'survey_deadline',
                    'survey_approved',
                    'survey_rejected',
                    'link_shared',
                    'document_shared',
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
        // Reverting this is complex and not needed for development
        // In production, this would need careful consideration
    }
};
