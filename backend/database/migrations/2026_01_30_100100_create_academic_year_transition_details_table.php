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
        Schema::create('academic_year_transition_details', function (Blueprint $table) {
            $table->id();

            // Parent transition
            $table->foreignId('transition_id')
                ->constrained('academic_year_transitions')
                ->onDelete('cascade');

            // Entity tracking
            $table->string('entity_type', 50)->comment('grade, student_enrollment, grade_subject, teaching_load');
            $table->unsignedBigInteger('source_entity_id')->nullable()->comment('ID in source year');
            $table->unsignedBigInteger('target_entity_id')->nullable()->comment('ID in target year (if created)');

            // Action tracking
            $table->enum('action', [
                'created',      // New entity created
                'promoted',     // Student promoted to next grade
                'graduated',    // Student graduated (12th grade)
                'retained',     // Student retained in same grade level
                'skipped',      // Entity skipped (e.g., already exists)
                'failed',       // Operation failed
                'copied'        // Assignment copied
            ]);

            // Additional context
            $table->string('reason')->nullable()->comment('Why this action was taken');
            $table->json('metadata')->nullable()->comment('Additional data about the operation');

            $table->timestamps();

            // Indexes for efficient querying
            $table->index(['transition_id', 'entity_type']);
            $table->index(['transition_id', 'action']);
            $table->index('entity_type');
            $table->index('source_entity_id');
            $table->index('target_entity_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('academic_year_transition_details');
    }
};
