<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For PostgreSQL, we need to update the check constraint for the enum-like column
        if (config('database.default') === 'pgsql') {
            DB::statement("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
            
            $types = [
                'task_assigned', 'task_updated', 'task_deadline', 'task_status_update', 
                'task_approval_required', 'task_approved', 'task_rejected', 
                'task_deadline_approaching', 'task_overdue', 'task_assignment_completed',
                'task_delegation_rejected', 'task_delegation_completed',
                'survey_published', 'survey_assigned', 'survey_assignment', 
                'survey_deadline', 'survey_deadline_reminder', 'survey_deadline_3_days', 
                'survey_deadline_1_day', 'survey_deadline_today', 'survey_overdue', 
                'survey_approved', 'survey_rejected', 'survey_approval_rejected', 
                'survey_approval_delegated', 'survey_created', 'link_shared', 
                'link_updated', 'document_shared', 'document_uploaded', 
                'document_updated', 'system_alert', 'maintenance', 'security_alert'
            ];
            
            $typeString = "'" . implode("','", $types) . "'";
            DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type::text = ANY (ARRAY[$typeString]::text[]))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
            // Revert to approximately what was there before if needed, 
            // but usually we just leave it or keep the new ones as they don't hurt.
        }
    }
};
