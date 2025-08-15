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
        Schema::create('teacher_professional_developments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            
            // Program information
            $table->string('program_name');
            $table->string('program_type'); // workshop, conference, course, certification, webinar, mentoring, coaching, etc.
            $table->string('provider_name');
            $table->string('provider_type'); // internal, ministry, university, training_institute, professional_association, etc.
            $table->text('description')->nullable();
            
            // Dates and duration
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->date('completion_date')->nullable();
            $table->decimal('duration_hours', 6, 2)->nullable();
            
            // Financial information
            $table->decimal('cost', 10, 2)->nullable();
            $table->string('funding_source')->nullable(); // institution, ministry, personal, grant, scholarship, etc.
            
            // Status tracking
            $table->string('status')->default('planned'); // planned, registered, approved, in_progress, completed, cancelled, postponed
            $table->string('completion_status')->nullable(); // completed, partially_completed, not_completed, withdrawn, failed
            
            // Certification and achievements
            $table->string('certificate_number')->nullable();
            $table->string('certificate_url')->nullable();
            $table->string('grade_received')->nullable();
            $table->decimal('credits_earned', 5, 2)->nullable();
            
            // Learning and impact
            $table->json('skills_gained')->nullable();
            $table->json('competencies_addressed')->nullable();
            $table->json('learning_objectives')->nullable();
            $table->json('learning_outcomes')->nullable();
            $table->text('relevance_to_role')->nullable();
            $table->text('application_in_classroom')->nullable();
            $table->text('impact_assessment')->nullable();
            
            // Follow-up and evaluation
            $table->boolean('follow_up_required')->default(false);
            $table->date('follow_up_date')->nullable();
            $table->boolean('supervisor_approval')->default(false);
            $table->text('supervisor_comments')->nullable();
            $table->text('participant_feedback')->nullable();
            $table->decimal('effectiveness_rating', 3, 2)->nullable(); // 1-5 scale
            $table->boolean('recommendation_for_others')->default(false);
            $table->text('next_steps')->nullable();
            
            // Supporting documents and metadata
            $table->json('supporting_documents')->nullable(); // certificates, receipts, photos, etc.
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['teacher_id', 'program_type']);
            $table->index(['institution_id', 'start_date']);
            $table->index(['status', 'start_date']);
            $table->index(['completion_status', 'completion_date']);
            $table->index('follow_up_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_professional_developments');
    }
};
