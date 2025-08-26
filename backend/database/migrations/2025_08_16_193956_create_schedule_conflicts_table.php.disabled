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
        Schema::create('schedule_conflicts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained()->onDelete('cascade');
            $table->foreignId('session_id')->nullable()->constrained('schedule_sessions')->onDelete('cascade');
            
            // Conflict identification
            $table->enum('conflict_type', [
                'teacher',          // Teacher double-booking
                'room',            // Room double-booking
                'resource',        // Resource unavailability
                'time',            // Time slot conflicts
                'capacity',        // Room capacity exceeded
                'prerequisite',    // Missing prerequisites
                'preference',      // Preference violations
                'policy',          // Policy violations
                'custom'           // Custom conflict type
            ]);
            
            $table->enum('severity', [
                'critical',        // Must be resolved before approval
                'high',           // Should be resolved
                'medium',         // Should be reviewed
                'low',            // Minor issue
                'info'            // Informational only
            ])->default('medium');
            
            // Conflict details
            $table->string('title', 255)->comment('Brief conflict description');
            $table->text('description')->comment('Detailed conflict explanation');
            $table->json('affected_entities')->comment('IDs of affected teachers, rooms, etc.');
            
            // Conflict source information
            $table->string('source_entity_type')->nullable()->comment('teacher, room, session, etc.');
            $table->unsignedBigInteger('source_entity_id')->nullable()->comment('ID of the source entity');
            $table->string('target_entity_type')->nullable()->comment('conflicting entity type');
            $table->unsignedBigInteger('target_entity_id')->nullable()->comment('ID of the target entity');
            
            // Time and location context
            $table->enum('day_of_week', [
                'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
            ])->nullable();
            $table->foreignId('time_slot_id')->nullable()->constrained()->onDelete('set null');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->foreignId('room_id')->nullable()->constrained()->onDelete('set null');
            
            // Detection and resolution
            $table->enum('detection_method', [
                'automatic',       // Auto-detected by system
                'manual',         // Manually reported
                'validation',     // Found during validation
                'import'          // Detected during import
            ])->default('automatic');
            
            $table->timestamp('detected_at')->default(now());
            $table->foreignId('detected_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Resolution tracking
            $table->enum('status', [
                'pending',        // Newly detected
                'acknowledged',   // Acknowledged by user
                'in_progress',    // Being resolved
                'resolved',       // Resolved
                'ignored',        // Intentionally ignored
                'escalated'       // Escalated to higher authority
            ])->default('pending');
            
            $table->text('resolution_notes')->nullable();
            $table->json('resolution_actions')->nullable()->comment('Actions taken to resolve');
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Impact assessment
            $table->integer('impact_score')->default(0)->comment('Numerical impact score 0-100');
            $table->json('impact_analysis')->nullable()->comment('Detailed impact breakdown');
            $table->boolean('blocks_approval')->default(false)->comment('Prevents schedule approval');
            $table->boolean('requires_notification')->default(true)->comment('Should notify stakeholders');
            
            // Suggestions and alternatives
            $table->json('suggested_solutions')->nullable()->comment('Suggested resolution options');
            $table->json('alternative_slots')->nullable()->comment('Alternative time slots');
            $table->json('alternative_resources')->nullable()->comment('Alternative resources');
            
            // Recurrence and patterns
            $table->boolean('is_recurring')->default(false)->comment('Occurs across multiple sessions');
            $table->string('recurrence_pattern')->nullable()->comment('Pattern of recurrence');
            $table->json('recurrence_data')->nullable()->comment('Recurrence configuration');
            
            // Business rules and constraints
            $table->string('violated_constraint')->nullable()->comment('Which constraint was violated');
            $table->json('constraint_data')->nullable()->comment('Constraint configuration data');
            $table->decimal('constraint_weight', 5, 2)->nullable()->comment('Weight of violated constraint');
            
            // Notification and communication
            $table->json('stakeholders')->nullable()->comment('People who should be notified');
            $table->json('notification_history')->nullable()->comment('Notification log');
            $table->timestamp('last_notification_sent')->nullable();
            
            // External integration
            $table->string('external_reference')->nullable()->comment('Reference to external system');
            $table->json('integration_data')->nullable()->comment('Data for external integrations');
            
            // Audit and metadata
            $table->json('metadata')->nullable()->comment('Additional conflict metadata');
            $table->text('administrative_notes')->nullable();
            $table->json('conflict_history')->nullable()->comment('History of conflict changes');
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['schedule_id', 'status']);
            $table->index(['conflict_type', 'severity']);
            $table->index(['session_id', 'status']);
            $table->index(['day_of_week', 'time_slot_id']);
            $table->index(['source_entity_type', 'source_entity_id']);
            $table->index(['target_entity_type', 'target_entity_id']);
            $table->index(['detected_at', 'status']);
            $table->index(['severity', 'blocks_approval']);
            $table->index(['is_recurring', 'recurrence_pattern']);
            $table->index(['room_id', 'day_of_week', 'start_time']);
            
            // Compound indexes for complex queries
            $table->index(['schedule_id', 'conflict_type', 'severity'], 'idx_schedule_conflict_severity');
            $table->index(['status', 'blocks_approval', 'severity'], 'idx_blocking_conflicts');
            $table->index(['detection_method', 'detected_at'], 'idx_detection_tracking');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_conflicts');
    }
};
