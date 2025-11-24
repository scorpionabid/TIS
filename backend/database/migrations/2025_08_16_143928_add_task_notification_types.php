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
        // For SQLite, we need to handle this differently since enum constraints are not well supported
        if (DB::getDriverName() === 'sqlite') {
            // SQLite doesn't have enum constraints like MySQL, so we'll just ensure the columns exist
            // and are of string type which can accept any of our notification type values
            DB::statement('PRAGMA foreign_keys=OFF');

            // No need to modify the columns since SQLite string columns can accept any values
            // The validation will be handled at the application level

            DB::statement('PRAGMA foreign_keys=ON');
        } elseif (DB::getDriverName() === 'pgsql') {
            // PostgreSQL doesn't support ENUM modification like MySQL
            // We'll handle this with CHECK constraints instead

            // Drop existing check constraint if exists and create new one
            try {
                DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
            } catch (Exception $e) {
                // Constraint might not exist
            }

            DB::statement("
                ALTER TABLE notifications 
                ADD CONSTRAINT notifications_type_check CHECK (type IN (
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
                    'survey_deadline',
                    'survey_approved',
                    'survey_rejected',
                    'system_alert',
                    'maintenance',
                    'security_alert'
                ))
            ");
        } else {
            // For MySQL
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
                    'survey_deadline',
                    'survey_approved',
                    'survey_rejected',
                    'system_alert',
                    'maintenance',
                    'security_alert'
                ) COMMENT 'Notification trigger types'
            ");

            DB::statement("
                ALTER TABLE notifications 
                MODIFY COLUMN priority ENUM(
                    'low',
                    'medium',
                    'normal', 
                    'high',
                    'critical'
                ) DEFAULT 'normal'
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum values
        DB::statement("
            ALTER TABLE notifications 
            MODIFY COLUMN type ENUM(
                'task_assigned',
                'task_updated', 
                'task_deadline',
                'survey_published',
                'survey_deadline',
                'survey_approved',
                'survey_rejected',
                'system_alert',
                'maintenance',
                'security_alert'
            ) COMMENT 'Notification trigger types'
        ");

        DB::statement("
            ALTER TABLE notifications 
            MODIFY COLUMN priority ENUM(
                'low',
                'normal', 
                'high',
                'critical'
            ) DEFAULT 'normal'
        ");
    }
};
