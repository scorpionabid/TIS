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
        // Task progress logs for tracking changes
        Schema::create('task_progress_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('updated_by')->constrained('users')->onDelete('cascade');
            $table->string('old_status', 20)->nullable();
            $table->string('new_status', 20);
            $table->integer('progress_percentage')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['task_id', 'created_at']);
        });

        // Task notifications for reminders and updates
        Schema::create('task_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('notification_type', ['assigned', 'reminder', 'deadline', 'completed', 'rejected', 'progress_update'])->default('assigned');
            $table->boolean('is_read')->default(false);
            $table->text('message')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'is_read']);
            $table->index(['task_id', 'notification_type']);
        });

        // Task templates for reusable task creation
        Schema::create('task_templates', function (Blueprint $table) {
            $table->id();
            $table->string('title', 300);
            $table->text('description')->nullable();
            $table->enum('category', ['report', 'maintenance', 'event', 'audit', 'instruction', 'other'])->default('other');
            $table->integer('default_duration_days')->default(7);
            $table->enum('default_priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->json('default_target_roles')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['created_by', 'is_active']);
            $table->index('category');
        });

        // Task reports for analytics and tracking
        Schema::create('task_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->enum('report_period', ['weekly', 'monthly', 'quarterly'])->default('monthly');
            $table->date('period_start');
            $table->date('period_end');
            $table->integer('total_tasks')->default(0);
            $table->integer('completed_tasks')->default(0);
            $table->integer('overdue_tasks')->default(0);
            $table->decimal('completion_rate', 5, 2)->default(0);
            $table->decimal('average_completion_days', 5, 2)->default(0);
            $table->json('category_breakdown')->nullable();
            $table->timestamps();
            
            $table->index(['institution_id', 'report_period']);
            $table->index(['period_start', 'period_end']);
        });

        // Task dependencies for complex workflows
        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('depends_on_task_id')->constrained('tasks')->onDelete('cascade');
            $table->enum('dependency_type', ['blocks', 'requires'])->default('requires');
            $table->timestamps();
            
            $table->unique(['task_id', 'depends_on_task_id']);
        });

        // Task authority matrix - defines who can create tasks for which targets
        Schema::create('task_authority_matrix', function (Blueprint $table) {
            $table->id();
            $table->string('creator_role', 50); // RegionAdmin, SektorAdmin, etc.
            $table->string('target_scope', 50); // 'own_region', 'own_sector', 'all_schools', etc.
            $table->json('allowed_target_types'); // ['school', 'sector'] - what types they can target
            $table->json('allowed_target_roles')->nullable(); // ['schooladmin', 'teacher'] - which roles they can assign to
            $table->boolean('can_cascade_to_children')->default(true); // Can assign to child institutions
            $table->integer('max_target_count')->default(50); // Max number of targets per task
            $table->timestamps();
            
            $table->index(['creator_role', 'target_scope']);
        });

        // Task assignments - expanded tracking of who tasks are assigned to
        Schema::create('task_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('cascade');
            $table->string('assigned_role', 50)->nullable(); // Which role should handle this
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('assignment_status', ['pending', 'accepted', 'in_progress', 'completed', 'rejected'])->default('pending');
            $table->text('assignment_notes')->nullable();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('completion_data')->nullable(); // Structured completion response
            $table->timestamps();
            
            $table->index(['task_id', 'assignment_status']);
            $table->index(['institution_id', 'assigned_role']);
            $table->index(['assigned_user_id', 'assignment_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_assignments');
        Schema::dropIfExists('task_authority_matrix');
        Schema::dropIfExists('task_dependencies');
        Schema::dropIfExists('task_reports');
        Schema::dropIfExists('task_templates');
        Schema::dropIfExists('task_notifications');
        Schema::dropIfExists('task_progress_logs');
    }
};