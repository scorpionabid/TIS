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
        Schema::create('psychology_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('psychology_sessions')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('psychologist_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Assessment details
            $table->enum('assessment_type', ['cognitive', 'behavioral', 'emotional', 'social', 'academic', 'personality', 'neuropsychological', 'developmental', 'trauma', 'adhd', 'autism', 'anxiety', 'depression', 'other']);
            $table->string('assessment_name');
            $table->date('assessment_date');
            
            // Scores and results
            $table->json('raw_scores')->nullable();
            $table->json('standardized_scores')->nullable();
            $table->json('percentile_ranks')->nullable();
            $table->text('interpretation')->nullable();
            
            // Analysis results
            $table->json('strengths_identified')->nullable();
            $table->json('areas_of_concern')->nullable();
            $table->json('recommendations')->nullable();
            $table->json('validity_indicators')->nullable();
            
            // Assessment context
            $table->text('test_conditions')->nullable();
            $table->json('behavioral_observations')->nullable();
            $table->json('follow_up_assessments_needed')->nullable();
            $table->json('comparison_data')->nullable();
            $table->text('progress_since_last')->nullable();
            
            // Cultural and accessibility considerations
            $table->json('cultural_considerations')->nullable();
            $table->json('language_factors')->nullable();
            $table->json('accommodations_used')->nullable();
            
            // Quality indicators
            $table->decimal('reliability_score', 3, 2)->nullable();
            $table->decimal('confidence_level', 5, 2)->nullable();
            
            // Status and review
            $table->enum('status', ['draft', 'in_progress', 'completed', 'reviewed', 'cancelled'])->default('draft');
            $table->timestamp('reviewed_at')->nullable();
            
            // Metadata
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['session_id', 'assessment_date']);
            $table->index(['student_id', 'assessment_date']);
            $table->index(['psychologist_id', 'assessment_date']);
            $table->index('assessment_type');
            $table->index('status');
            $table->index('reviewed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('psychology_assessments');
    }
};