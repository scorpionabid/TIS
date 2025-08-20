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
        Schema::create('teacher_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('evaluator_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->string('evaluation_period'); // q1, q2, q3, q4, semester1, semester2, annual
            $table->integer('academic_year');
            $table->string('evaluation_type'); // annual, probationary, mid_year, promotion, performance_improvement, special, continuous
            $table->date('evaluation_date');
            $table->decimal('overall_score', 5, 2)->nullable();
            $table->string('overall_rating')->nullable(); // excellent, very_good, good, satisfactory, needs_improvement, unsatisfactory
            $table->string('status')->default('draft'); // draft, in_progress, pending_approval, completed, approved, requires_revision, cancelled
            
            // Individual score components
            $table->decimal('teaching_effectiveness_score', 5, 2)->nullable();
            $table->decimal('classroom_management_score', 5, 2)->nullable();
            $table->decimal('subject_knowledge_score', 5, 2)->nullable();
            $table->decimal('student_engagement_score', 5, 2)->nullable();
            $table->decimal('professional_development_score', 5, 2)->nullable();
            $table->decimal('collaboration_score', 5, 2)->nullable();
            $table->decimal('innovation_score', 5, 2)->nullable();
            $table->decimal('punctuality_score', 5, 2)->nullable();
            $table->decimal('communication_score', 5, 2)->nullable();
            $table->decimal('leadership_score', 5, 2)->nullable();
            
            // Evaluation details
            $table->json('strengths')->nullable();
            $table->json('areas_for_improvement')->nullable();
            $table->json('goals_set')->nullable();
            $table->json('goals_achieved')->nullable();
            $table->json('recommendations')->nullable();
            $table->json('action_plan')->nullable();
            $table->date('follow_up_date')->nullable();
            
            // Comments and assessments
            $table->text('evaluator_comments')->nullable();
            $table->text('teacher_self_assessment')->nullable();
            $table->text('student_feedback_summary')->nullable();
            $table->text('parent_feedback_summary')->nullable();
            $table->text('peer_feedback_summary')->nullable();
            $table->text('classroom_observation_notes')->nullable();
            $table->text('lesson_plan_review')->nullable();
            $table->text('student_performance_analysis')->nullable();
            $table->text('attendance_record')->nullable();
            
            // Additional information
            $table->json('professional_activities')->nullable();
            $table->string('certification_status')->nullable();
            $table->boolean('improvement_plan_required')->default(false);
            $table->json('support_provided')->nullable();
            $table->date('next_evaluation_date')->nullable();
            
            // Approval tracking
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            // Additional metadata
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['teacher_id', 'academic_year', 'evaluation_type']);
            $table->index(['institution_id', 'academic_year']);
            $table->index(['evaluator_id', 'academic_year']);
            $table->index(['status', 'evaluation_date']);
            $table->index(['overall_rating', 'academic_year']);
            $table->index('next_evaluation_date');
            
            // Unique constraint to prevent duplicate evaluations
            $table->unique(['teacher_id', 'evaluation_period', 'academic_year', 'evaluation_type'], 'unique_teacher_evaluation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_evaluations');
    }
};
