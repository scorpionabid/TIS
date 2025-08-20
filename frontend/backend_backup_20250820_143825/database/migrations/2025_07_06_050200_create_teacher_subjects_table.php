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
        Schema::create('teacher_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained()->onDelete('cascade');
            
            // Teaching qualifications
            $table->json('grade_levels')->comment('Array of grade levels teacher can teach [1,2,3,4,5]');
            $table->enum('specialization_level', [
                'basic',        // Basic teaching qualification
                'intermediate', // Experienced teacher
                'advanced',     // Senior teacher
                'expert',       // Subject matter expert
                'master'        // Master teacher/department head
            ])->default('basic');
            
            // Workload limits
            $table->integer('max_hours_per_week')->default(18)->comment('Maximum teaching hours per week');
            $table->integer('max_classes_per_day')->default(6)->comment('Maximum classes per day');
            $table->integer('max_consecutive_classes')->default(3)->comment('Maximum consecutive classes');
            
            // Preferences and constraints
            $table->json('preferred_time_slots')->nullable()->comment('Preferred time slot IDs');
            $table->json('unavailable_time_slots')->nullable()->comment('Unavailable time slot IDs');
            $table->json('preferred_days')->nullable()->comment('Preferred days of week [1,2,3,4,5]');
            
            // Teaching methodology and requirements
            $table->boolean('requires_lab')->default(false)->comment('Requires laboratory facilities');
            $table->boolean('requires_projector')->default(false)->comment('Requires multimedia equipment');
            $table->boolean('requires_computer')->default(false)->comment('Requires computer lab');
            $table->json('room_requirements')->nullable()->comment('Specific room facility requirements');
            
            // Administrative details
            $table->date('qualified_since')->nullable()->comment('Date qualified to teach this subject');
            $table->date('last_training_date')->nullable()->comment('Last professional development date');
            $table->string('certification_number')->nullable()->comment('Teaching certificate number');
            $table->text('teaching_notes')->nullable()->comment('Special notes about teaching this subject');
            
            // Status and validity
            $table->boolean('is_active')->default(true);
            $table->boolean('is_primary_subject')->default(false)->comment('Primary subject for this teacher');
            $table->date('valid_from')->default(today())->comment('Valid from date');
            $table->date('valid_until')->nullable()->comment('Valid until date (if temporary)');
            
            // Performance tracking
            $table->decimal('performance_rating', 3, 2)->nullable()->comment('Performance rating 0.00-5.00');
            $table->integer('years_experience')->default(0)->comment('Years teaching this subject');
            $table->json('teaching_statistics')->nullable()->comment('Teaching performance data');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['teacher_id', 'is_active']);
            $table->index(['subject_id', 'is_active']);
            $table->index(['specialization_level']);
            $table->index(['is_primary_subject', 'is_active']);
            $table->index(['valid_from', 'valid_until']);
            
            // Unique constraint for teacher-subject combination
            $table->unique(['teacher_id', 'subject_id'], 'unique_teacher_subject');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_subjects');
    }
};