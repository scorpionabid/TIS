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
        if (DB::getDriverName() === 'sqlite') {
            // For SQLite, we need to recreate the table without CHECK constraints
            // Since this is development, we'll just drop and recreate the table structure
            
            // Get all existing notifications
            $notifications = DB::table('notifications')->get();
            
            // Drop the table
            Schema::dropIfExists('notifications');
            
            // Recreate without CHECK constraints (simpler approach for SQLite)
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('message');
                $table->string('type')->comment('Notification trigger types');
                $table->string('priority')->default('normal');
                $table->string('channel')->default('in_app');
                
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
            
            // Restore the existing notifications
            foreach ($notifications as $notification) {
                DB::table('notifications')->insert((array) $notification);
            }
            
        } elseif (DB::getDriverName() === 'pgsql') {
            // For PostgreSQL, we already have CHECK constraints from previous migration
            // This migration is mostly for SQLite/MySQL compatibility
            // Nothing to do for PostgreSQL here
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
                    'survey_deadline',
                    'survey_approved',
                    'survey_rejected',
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
        // This migration is not easily reversible for SQLite
        // We'll leave it as is for development
    }
};