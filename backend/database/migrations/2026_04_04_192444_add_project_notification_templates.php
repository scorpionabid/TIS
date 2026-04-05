<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (config('database.default') === 'pgsql') {
            // Update notification_templates constraint
            DB::statement('ALTER TABLE notification_templates DROP CONSTRAINT IF EXISTS notification_templates_type_check');
            DB::statement("
                ALTER TABLE notification_templates
                ADD CONSTRAINT notification_templates_type_check
                CHECK (type IN (
                    'task_assigned', 'task_updated', 'task_deadline', 'survey_published',
                    'survey_approved', 'survey_assigned', 'link_shared', 'link_updated',
                    'document_shared', 'document_uploaded', 'document_updated',
                    'system_alert', 'maintenance', 'security_alert',
                    'project_assigned', 'project_activity_assigned', 'project_completed'
                ))
            ");

            // Update notifications constraint
            DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
            DB::statement("
                ALTER TABLE notifications
                ADD CONSTRAINT notifications_type_check
                CHECK (type IN (
                    'task_assigned', 'task_updated', 'task_deadline', 'task_status_update',
                    'task_approval_required', 'task_approved', 'task_rejected',
                    'task_assignment_completed', 'task_delegation_completed',
                    'task_delegation_rejected', 'task_deadline_approaching', 'task_overdue',
                    'survey_published', 'survey_assigned', 'survey_assignment',
                    'survey_deadline', 'survey_deadline_reminder', 'survey_deadline_3_days',
                    'survey_deadline_1_day', 'survey_deadline_today', 'survey_overdue',
                    'survey_approved', 'survey_rejected', 'survey_approval_rejected',
                    'survey_approval_delegated', 'survey_created', 'approval_completed',
                    'revision_required', 'link_shared', 'link_updated', 'document_shared',
                    'document_uploaded', 'document_updated', 'system_alert', 'maintenance',
                    'security_alert', 'attendance_reminder',
                    'project_assigned', 'project_activity_assigned', 'project_completed'
                ))
            ");
        }

        DB::table('notification_templates')->insert([
            [
                'key' => 'project_assigned',
                'name' => 'Layihə təhkim edilməsi',
                'type' => 'project_assigned',
                'subject_template' => 'Yeni layihə təhkim edildi',
                'title_template' => 'Yeni layihə təhkim edildi',
                'message_template' => 'Sizə "{{project_name}}" adlı yeni layihə təhkim edilib. Zəhmət olmasa fəaliyyət planınızı qurun.',
                'channels' => json_encode(['in_app', 'email']),
                'priority' => 'normal',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'project_activity_assigned',
                'name' => 'Layihə fəaliyyəti təyin edilməsi',
                'type' => 'project_activity_assigned',
                'subject_template' => 'Yeni fəaliyyət təyin edildi',
                'title_template' => 'Yeni fəaliyyət təyin edildi',
                'message_template' => '"{{project_name}}" layihəsi üzrə "{{activity_name}}" fəaliyyəti sizə təyin edilib.',
                'channels' => json_encode(['in_app', 'email']),
                'priority' => 'normal',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
