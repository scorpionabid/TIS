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
        Schema::create('subject_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained()->onDelete('cascade');
            $table->foreignId('grade_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_term_id')->nullable()->constrained()->onDelete('cascade');
            
            // Enrollment details
            $table->date('enrollment_date');
            $table->date('completion_date')->nullable();
            $table->enum('status', [
                'enrolled',         // Currently enrolled
                'completed',        // Successfully completed
                'dropped',          // Dropped the subject
                'transferred',      // Transferred to different section
                'failed',           // Failed to complete
                'exempt'            // Exempted from subject
            ])->default('enrolled');
            
            // Subject-specific information
            $table->enum('enrollment_reason', [
                'required',         // Mandatory subject
                'elective',         // Student choice
                'remedial',         // Remedial support
                'advanced',         // Advanced placement
                'makeup'            // Makeup for failed subject
            ])->default('required');
            
            // Prerequisites and placement
            $table->json('prerequisites_met')->nullable()->comment('Prerequisites satisfied');
            $table->string('placement_level')->nullable()->comment('Beginner, Intermediate, Advanced');
            $table->decimal('placement_score', 5, 2)->nullable()->comment('Placement test score');
            
            // Performance expectations
            $table->decimal('expected_grade', 3, 2)->nullable()->comment('Expected grade point');
            $table->integer('required_attendance_percentage')->default(80)->comment('Subject-specific attendance requirement');
            
            // Teacher and section assignment
            $table->foreignId('primary_teacher_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('section')->nullable()->comment('Class section (A, B, C, etc.)');
            $table->integer('max_students')->nullable()->comment('Maximum students in section');
            
            // Schedule information
            $table->json('class_schedule')->nullable()->comment('Weekly class schedule');
            $table->integer('weekly_hours')->nullable()->comment('Hours per week');
            $table->integer('total_hours')->nullable()->comment('Total course hours');
            
            // Assessment configuration
            $table->json('assessment_weights')->nullable()->comment('Assignment, Quiz, Exam weights');
            $table->boolean('requires_lab')->default(false);
            $table->boolean('requires_project')->default(false);
            $table->boolean('has_practical_exam')->default(false);
            
            // Special accommodations
            $table->json('accommodations')->nullable()->comment('Special learning accommodations');
            $table->boolean('extended_time')->default(false);
            $table->boolean('modified_curriculum')->default(false);
            
            // Progress tracking
            $table->decimal('current_grade', 5, 2)->nullable()->comment('Current cumulative grade');
            $table->integer('assignments_completed')->default(0);
            $table->integer('assignments_total')->nullable();
            $table->decimal('attendance_rate', 5, 2)->nullable()->comment('Subject-specific attendance rate');
            
            // Withdrawal information
            $table->date('withdrawal_date')->nullable();
            $table->string('withdrawal_reason')->nullable();
            $table->boolean('withdrawal_approved')->default(false);
            $table->foreignId('withdrawal_approved_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Administrative fields
            $table->text('enrollment_notes')->nullable();
            $table->json('metadata')->nullable()->comment('Additional subject-specific data');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['student_id', 'academic_year_id']);
            $table->index(['subject_id', 'grade_id']);
            $table->index(['status', 'enrollment_date']);
            $table->index(['primary_teacher_id', 'status']);
            $table->index(['academic_term_id', 'status']);
            
            // Unique constraint to prevent duplicate enrollments
            $table->unique(
                ['student_id', 'subject_id', 'academic_year_id', 'academic_term_id'], 
                'unique_subject_enrollment'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subject_enrollments');
    }
};