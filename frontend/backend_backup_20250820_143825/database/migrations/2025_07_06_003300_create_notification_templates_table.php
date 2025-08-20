<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique()->comment('Template identifier');
            $table->string('name')->comment('Human readable name');
            $table->enum('type', [
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
            ]);
            
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
            $table->enum('priority', ['low', 'normal', 'high', 'critical'])->default('normal');
            $table->boolean('is_active')->default(true);
            
            // Variables that can be used in template
            $table->json('available_variables')->nullable()->comment('List of available template variables');
            
            $table->timestamps();
            
            $table->index(['type', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
};