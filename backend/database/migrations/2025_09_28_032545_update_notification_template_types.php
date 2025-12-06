<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite: Recreate table with string type instead of enum
            $templates = DB::table('notification_templates')->get();

            Schema::dropIfExists('notification_templates');

            Schema::create('notification_templates', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique()->comment('Template identifier');
                $table->string('name')->comment('Human readable name');
                $table->string('type')->comment('Notification type'); // Changed from enum to string

                // Template content
                $table->string('subject_template')->comment('Email subject template');
                $table->text('title_template')->comment('In-app notification title template');
                $table->text('message_template')->comment('Notification message template');
                $table->text('email_template')->nullable()->comment('HTML email template');
                $table->text('sms_template')->nullable()->comment('SMS message template');

                // Multilingual templates
                $table->json('translations')->nullable()->comment('Templates in multiple languages');

                // Template settings
                $table->json('channels')->comment('Enabled channels: in_app, email, sms');
                $table->string('priority')->default('normal'); // Changed from enum to string
                $table->boolean('is_active')->default(true);

                // Variables that can be used in template
                $table->json('available_variables')->nullable()->comment('List of available template variables');

                $table->timestamps();

                $table->index(['type', 'is_active']);
            });

            // Restore existing templates
            foreach ($templates as $template) {
                DB::table('notification_templates')->insert((array) $template);
            }
        } elseif (DB::getDriverName() === 'pgsql') {
            // For PostgreSQL, update the type constraint
            DB::statement('
                ALTER TABLE notification_templates
                DROP CONSTRAINT IF EXISTS notification_templates_type_check
            ');

            DB::statement("
                ALTER TABLE notification_templates
                ADD CONSTRAINT notification_templates_type_check
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
            // For MySQL, update the ENUM constraint
            DB::statement("
                ALTER TABLE notification_templates
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
                    'link_updated',
                    'document_shared',
                    'document_uploaded',
                    'document_updated',
                    'system_alert',
                    'maintenance',
                    'security_alert'
                )
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverting this is complex and not needed for development
    }
};
