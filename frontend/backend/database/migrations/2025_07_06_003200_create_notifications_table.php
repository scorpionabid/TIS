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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('message');
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
            ])->comment('Notification trigger types');
            
            $table->enum('priority', [
                'low',
                'normal', 
                'high',
                'critical'
            ])->default('normal');
            
            $table->enum('channel', [
                'in_app',
                'email',
                'sms',
                'push'
            ])->default('in_app');
            
            // Target user/institution
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->json('target_users')->nullable()->comment('Array of user IDs for bulk notifications');
            $table->json('target_institutions')->nullable()->comment('Array of institution IDs');
            $table->json('target_roles')->nullable()->comment('Array of role names');
            
            // Related entity references
            $table->string('related_type')->nullable()->comment('Model class name (Task, Survey, etc.)');
            $table->unsignedBigInteger('related_id')->nullable()->comment('Related model ID');
            
            // Delivery status
            $table->boolean('is_sent')->default(false);
            $table->boolean('is_read')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('scheduled_at')->nullable()->comment('For scheduled notifications');
            
            // Email/SMS specific
            $table->string('email_status')->nullable()->comment('delivered, failed, bounced');
            $table->string('sms_status')->nullable()->comment('delivered, failed, pending');
            $table->text('delivery_error')->nullable();
            
            // Multilingual support
            $table->string('language', 5)->default('az')->comment('Notification language');
            $table->json('translations')->nullable()->comment('Title/message in multiple languages');
            
            // Additional metadata
            $table->json('metadata')->nullable()->comment('Additional data for notification');
            $table->json('action_data')->nullable()->comment('Action buttons/links data');
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['user_id', 'is_read', 'created_at']);
            $table->index(['type', 'channel']);
            $table->index(['is_sent', 'scheduled_at']);
            $table->index(['related_type', 'related_id']);
            $table->index(['priority', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};