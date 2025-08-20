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
        Schema::create('schedule_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained()->onDelete('cascade');
            $table->foreignId('subject_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('room_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('time_slot_id')->constrained()->onDelete('cascade');
            
            // Session timing
            $table->enum('day_of_week', [
                'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
            ]);
            $table->integer('period_number')->comment('Period number within the day (1, 2, 3, etc.)');
            $table->time('start_time')->comment('Actual start time (from time_slot or override)');
            $table->time('end_time')->comment('Actual end time (from time_slot or override)');
            $table->integer('duration_minutes')->comment('Session duration in minutes');
            
            // Session classification
            $table->enum('session_type', [
                'regular',      // Regular class session
                'lab',          // Laboratory session
                'practical',    // Practical/hands-on session
                'exam',         // Examination
                'quiz',         // Quiz/test
                'review',       // Review session
                'makeup',       // Makeup class
                'substitution', // Substitute teacher session
                'assembly',     // School assembly
                'activity',     // Extracurricular activity
                'consultation', // Teacher consultation
                'preparation'   // Teacher preparation
            ])->default('regular');
            
            // Recurrence pattern
            $table->enum('recurrence_pattern', [
                'weekly',       // Every week
                'bi_weekly',    // Every two weeks
                'monthly',      // Monthly
                'one_time',     // Single occurrence
                'custom'        // Custom pattern
            ])->default('weekly');
            
            $table->json('recurrence_config')->nullable()->comment('Custom recurrence configuration');
            
            // Session details
            $table->string('topic')->nullable()->comment('Lesson topic or content');
            $table->text('description')->nullable()->comment('Session description');
            $table->string('lesson_plan_reference')->nullable()->comment('Reference to lesson plan');
            
            // Resource requirements
            $table->boolean('requires_projector')->default(false);
            $table->boolean('requires_computer')->default(false);
            $table->boolean('requires_lab_equipment')->default(false);
            $table->boolean('requires_special_setup')->default(false);
            $table->json('required_resources')->nullable()->comment('Additional required resources');
            $table->json('room_setup_requirements')->nullable()->comment('Special room setup needs');
            
            // Student and class information
            $table->integer('expected_student_count')->nullable()->comment('Expected number of students');
            $table->json('student_groups')->nullable()->comment('Specific student groups if not full class');
            $table->boolean('is_mandatory')->default(true)->comment('Mandatory attendance');
            
            // Status and modifications
            $table->enum('status', [
                'scheduled',    // Normal scheduled session
                'confirmed',    // Confirmed by teacher
                'cancelled',    // Cancelled session
                'moved',        // Moved to different time/room
                'substituted',  // Substitute teacher assigned
                'completed',    // Session completed
                'in_progress'   // Currently in session
            ])->default('scheduled');
            
            // Substitution and changes
            $table->foreignId('substitute_teacher_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('original_teacher_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('substitution_reason')->nullable();
            $table->timestamp('last_modified_at')->nullable();
            $table->foreignId('last_modified_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Attendance and completion
            $table->integer('actual_student_count')->nullable()->comment('Actual students attended');
            $table->decimal('attendance_percentage', 5, 2)->nullable()->comment('Attendance percentage');
            $table->timestamp('session_started_at')->nullable();
            $table->timestamp('session_ended_at')->nullable();
            $table->text('completion_notes')->nullable();
            
            // Conflicts and warnings
            $table->boolean('has_conflicts')->default(false);
            $table->json('conflict_details')->nullable()->comment('Details of any conflicts');
            $table->enum('conflict_severity', ['none', 'low', 'medium', 'high', 'critical'])->default('none');
            
            // Quality and feedback
            $table->decimal('session_rating', 3, 2)->nullable()->comment('Session quality rating 1-5');
            $table->text('teacher_feedback')->nullable();
            $table->text('student_feedback')->nullable();
            $table->json('session_analytics')->nullable()->comment('Session performance analytics');
            
            // Notification and alerts
            $table->boolean('notify_students')->default(true);
            $table->boolean('notify_parents')->default(false);
            $table->timestamp('notifications_sent_at')->nullable();
            $table->json('notification_history')->nullable();
            
            // External integration
            $table->string('external_reference')->nullable()->comment('Reference to external system');
            $table->json('integration_data')->nullable()->comment('Data for external integrations');
            
            // Audit and metadata
            $table->json('metadata')->nullable()->comment('Additional session metadata');
            $table->text('administrative_notes')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['schedule_id', 'day_of_week']);
            $table->index(['teacher_id', 'day_of_week', 'start_time']);
            $table->index(['room_id', 'day_of_week', 'start_time']);
            $table->index(['subject_id', 'session_type']);
            $table->index(['time_slot_id', 'day_of_week']);
            $table->index(['status', 'day_of_week']);
            $table->index(['period_number', 'day_of_week']);
            $table->index(['start_time', 'end_time']);
            $table->index(['has_conflicts', 'conflict_severity']);
            $table->index(['recurrence_pattern', 'status']);
            
            // Unique constraint to prevent double booking
            $table->unique(
                ['teacher_id', 'day_of_week', 'time_slot_id', 'schedule_id'], 
                'unique_teacher_time_slot'
            );
            
            $table->unique(
                ['room_id', 'day_of_week', 'time_slot_id', 'schedule_id'], 
                'unique_room_time_slot'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_sessions');
    }
};