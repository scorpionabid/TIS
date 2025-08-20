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
        Schema::create('teacher_availability', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            
            // Time availability
            $table->enum('day_of_week', [
                'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
            ]);
            $table->time('start_time');
            $table->time('end_time');
            
            // Availability type
            $table->enum('availability_type', [
                'available',     // Teacher is available for teaching
                'unavailable',   // Teacher is not available
                'preferred',     // Teacher prefers these hours
                'restricted',    // Limited availability
                'meeting',       // Administrative meetings
                'training',      // Professional development
                'preparation',   // Lesson preparation time
                'examination',   // Exam supervision
                'consultation'   // Student consultation hours
            ])->default('available');
            
            // Recurrence and validity
            $table->enum('recurrence_type', [
                'weekly',        // Repeats every week
                'bi_weekly',     // Every two weeks
                'monthly',       // Monthly occurrence
                'one_time',      // Single occurrence
                'term',          // Entire academic term
                'year'           // Entire academic year
            ])->default('weekly');
            
            $table->date('effective_date')->default(today());
            $table->date('end_date')->nullable()->comment('Null means indefinite');
            
            // Priority and flexibility
            $table->integer('priority')->default(5)->comment('1=highest, 10=lowest priority');
            $table->boolean('is_flexible')->default(false)->comment('Can be overridden if needed');
            $table->boolean('is_mandatory')->default(false)->comment('Cannot be overridden');
            
            // Reason and context
            $table->string('reason')->nullable()->comment('Reason for availability status');
            $table->text('description')->nullable()->comment('Detailed description');
            $table->string('location')->nullable()->comment('Specific location if relevant');
            
            // Administrative information
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            $table->enum('status', [
                'pending',
                'approved', 
                'rejected',
                'active',
                'expired'
            ])->default('pending');
            
            // Conflict resolution
            $table->integer('conflict_resolution_priority')->default(5)->comment('Higher number = higher priority');
            $table->boolean('allow_emergency_override')->default(false);
            
            // Metadata for additional information
            $table->json('metadata')->nullable()->comment('Additional availability metadata');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['teacher_id', 'day_of_week']);
            $table->index(['availability_type', 'status']);
            $table->index(['effective_date', 'end_date']);
            $table->index(['start_time', 'end_time']);
            $table->index(['recurrence_type', 'status']);
            $table->index(['is_mandatory', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_availability');
    }
};