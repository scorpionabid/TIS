<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates table for storing user notification preferences
     */
    public function up(): void
    {
        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Task notifications
            $table->boolean('task_deadline_reminder')->default(true);
            $table->integer('task_reminder_days')->default(3)->comment('Days before deadline to send reminder');
            $table->boolean('task_assigned_notification')->default(true);
            $table->boolean('task_status_change_notification')->default(true);
            $table->boolean('task_comment_notification')->default(true);
            $table->boolean('task_mention_notification')->default(true);

            // Email preferences
            $table->boolean('email_enabled')->default(true);
            $table->boolean('email_daily_digest')->default(false);
            $table->string('email_digest_time')->default('09:00');

            // In-app notification preferences
            $table->boolean('in_app_enabled')->default(true);
            $table->boolean('browser_push_enabled')->default(false);

            // Quiet hours
            $table->boolean('quiet_hours_enabled')->default(false);
            $table->string('quiet_hours_start')->default('22:00');
            $table->string('quiet_hours_end')->default('08:00');

            $table->timestamps();

            // Each user has one preference record
            $table->unique('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_notification_preferences');
    }
};
