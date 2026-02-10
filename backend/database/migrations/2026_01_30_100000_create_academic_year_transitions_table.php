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
        Schema::create('academic_year_transitions', function (Blueprint $table) {
            $table->id();

            // Source and target years
            $table->foreignId('source_academic_year_id')
                ->constrained('academic_years')
                ->onDelete('restrict');
            $table->foreignId('target_academic_year_id')
                ->constrained('academic_years')
                ->onDelete('restrict');

            // Institution scope
            $table->foreignId('institution_id')
                ->constrained('institutions')
                ->onDelete('cascade');

            // Who initiated the transition
            $table->foreignId('initiated_by')
                ->constrained('users')
                ->onDelete('restrict');

            // Configuration options used
            $table->json('options')->nullable()->comment('Transition configuration: copy_subjects, copy_teachers, etc.');

            // Status tracking
            $table->enum('status', ['pending', 'in_progress', 'completed', 'failed', 'rolled_back'])
                ->default('pending');
            $table->integer('progress_percentage')->default(0);
            $table->string('current_step')->nullable()->comment('Current step being processed');

            // Results summary
            $table->integer('grades_created')->default(0);
            $table->integer('grades_skipped')->default(0);
            $table->integer('students_promoted')->default(0);
            $table->integer('students_graduated')->default(0);
            $table->integer('students_retained')->default(0);
            $table->integer('students_skipped')->default(0);
            $table->integer('teacher_assignments_copied')->default(0);

            // Error tracking
            $table->json('errors')->nullable()->comment('Array of error messages');
            $table->text('error_message')->nullable()->comment('Main error message if failed');

            // Rollback support
            $table->boolean('can_rollback')->default(true);
            $table->timestamp('rollback_expires_at')->nullable();
            $table->json('rollback_data')->nullable()->comment('Data needed for rollback');

            // Completion tracking
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['institution_id', 'status']);
            $table->index(['source_academic_year_id', 'target_academic_year_id']);
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('academic_year_transitions');
    }
};
