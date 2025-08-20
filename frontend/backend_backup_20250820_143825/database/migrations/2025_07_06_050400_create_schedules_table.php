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
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_term_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->foreignId('grade_id')->nullable()->constrained()->onDelete('cascade');
            
            // Schedule identification
            $table->string('name')->comment('e.g., "Grade 5A Fall Schedule"');
            $table->string('code', 20)->nullable()->comment('Short identifier like "G5A-F24"');
            $table->text('description')->nullable();
            
            // Schedule classification
            $table->enum('schedule_type', [
                'regular',      // Normal weekly schedule
                'exam',         // Examination schedule
                'holiday',      // Holiday/reduced schedule
                'special',      // Special events schedule
                'temporary',    // Temporary schedule change
                'makeup',       // Makeup classes schedule
                'summer'        // Summer school schedule
            ])->default('regular');
            
            // Validity period
            $table->date('effective_date');
            $table->date('end_date')->nullable()->comment('Null means end of academic term');
            
            // Schedule configuration
            $table->integer('total_periods_per_day')->default(8);
            $table->integer('total_teaching_periods')->default(6);
            $table->json('working_days')->default('[1,2,3,4,5]')->comment('Days of week: 1=Monday');
            
            // Generation information
            $table->enum('generation_method', [
                'manual',       // Manually created
                'template',     // Generated from template
                'automated',    // AI/algorithm generated
                'imported',     // Imported from external source
                'copied'        // Copied from another schedule
            ])->default('manual');
            
            $table->unsignedBigInteger('template_id')->nullable()->comment('References schedule_templates.id - constraint added in separate migration');
            $table->foreignId('copied_from_schedule_id')->nullable()->constrained('schedules')->onDelete('set null');
            
            // Status and approval workflow
            $table->enum('status', [
                'draft',            // Being created/edited
                'pending_review',   // Submitted for review
                'under_review',     // Being reviewed
                'approved',         // Approved but not active
                'active',           // Currently in use
                'suspended',        // Temporarily suspended
                'archived',         // Archived/historical
                'rejected'          // Rejected during review
            ])->default('draft');
            
            // Approval workflow
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            
            // Quality metrics
            $table->decimal('optimization_score', 5, 2)->nullable()->comment('Algorithm optimization score 0-100');
            $table->integer('conflict_count')->default(0)->comment('Number of detected conflicts');
            $table->integer('total_sessions')->default(0)->comment('Total scheduled sessions');
            $table->decimal('teacher_utilization', 5, 2)->nullable()->comment('Teacher utilization percentage');
            $table->decimal('room_utilization', 5, 2)->nullable()->comment('Room utilization percentage');
            
            // Scheduling constraints and preferences
            $table->json('scheduling_constraints')->nullable()->comment('Applied constraints during generation');
            $table->json('scheduling_preferences')->nullable()->comment('Applied preferences during generation');
            $table->json('optimization_parameters')->nullable()->comment('Parameters used for optimization');
            
            // Notification and communication
            $table->boolean('notify_teachers')->default(true)->comment('Send notifications to teachers');
            $table->boolean('notify_students')->default(false)->comment('Send notifications to students');
            $table->timestamp('last_notification_sent')->nullable();
            
            // Backup and versioning
            $table->integer('version')->default(1)->comment('Schedule version number');
            $table->foreignId('previous_version_id')->nullable()->constrained('schedules')->onDelete('set null');
            $table->json('change_log')->nullable()->comment('Log of changes made');
            
            // Additional metadata
            $table->json('metadata')->nullable()->comment('Additional schedule configuration');
            $table->text('notes')->nullable()->comment('Administrative notes');
            $table->text('rejection_reason')->nullable()->comment('Reason for rejection if applicable');
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['academic_year_id', 'academic_term_id']);
            $table->index(['institution_id', 'status']);
            $table->index(['grade_id', 'status']);
            $table->index(['schedule_type', 'status']);
            $table->index(['effective_date', 'end_date']);
            $table->index(['status', 'activated_at']);
            $table->index(['created_by', 'status']);
            $table->index(['conflict_count']);
            
            // Unique constraints
            $table->unique(
                ['grade_id', 'effective_date', 'schedule_type'], 
                'unique_active_schedule_per_grade'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};