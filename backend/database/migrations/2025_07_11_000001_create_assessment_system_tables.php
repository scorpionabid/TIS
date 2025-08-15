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
        // Create KSQ Results table
        Schema::create('ksq_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->date('assessment_date');
            $table->string('assessment_type', 100); // e.g., 'annual', 'mid_term', 'special'
            $table->foreignId('assessor_id')->constrained('users')->onDelete('restrict');
            $table->decimal('total_score', 8, 2);
            $table->decimal('max_possible_score', 8, 2);
            $table->decimal('percentage_score', 5, 2);
            $table->string('grade_level', 50)->nullable(); // e.g., 'primary', 'secondary', 'high'
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->onDelete('set null');
            $table->json('criteria_scores'); // Detailed scores for each assessment criteria
            $table->json('detailed_results')->nullable(); // Additional detailed assessment data
            $table->json('strengths')->nullable(); // Identified strengths
            $table->json('improvement_areas')->nullable(); // Areas needing improvement
            $table->json('recommendations')->nullable(); // Recommendations for improvement
            $table->enum('status', ['draft', 'approved', 'rejected', 'under_review'])->default('draft');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('follow_up_required')->default(false);
            $table->date('follow_up_date')->nullable();
            $table->foreignId('previous_assessment_id')->nullable()->constrained('ksq_results')->onDelete('set null');
            $table->decimal('improvement_percentage', 5, 2)->nullable(); // Improvement from previous assessment
            $table->timestamps();

            // Indexes
            $table->index(['institution_id', 'academic_year_id']);
            $table->index(['assessment_date', 'status']);
            $table->index(['assessor_id']);
            $table->index(['follow_up_required', 'follow_up_date']);
        });

        // Create BSQ Results table
        Schema::create('bsq_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->date('assessment_date');
            $table->string('international_standard', 100); // e.g., 'ISO', 'IB', 'Cambridge'
            $table->string('assessment_body', 255); // Organization conducting assessment
            $table->foreignId('assessor_id')->constrained('users')->onDelete('restrict');
            $table->decimal('total_score', 8, 2);
            $table->decimal('max_possible_score', 8, 2);
            $table->decimal('percentage_score', 5, 2);
            $table->integer('international_ranking')->nullable();
            $table->integer('national_ranking')->nullable();
            $table->integer('regional_ranking')->nullable();
            $table->json('benchmark_comparison')->nullable(); // Comparison with benchmarks
            $table->json('competency_areas'); // Scores for different competency areas
            $table->json('detailed_scores')->nullable(); // Detailed breakdown of scores
            $table->json('international_comparison')->nullable(); // Comparison with international standards
            $table->string('certification_level', 100)->nullable(); // Level of certification achieved
            $table->date('certification_valid_until')->nullable();
            $table->json('improvement_plan')->nullable(); // Plan for improvement
            $table->json('action_items')->nullable(); // Specific action items
            $table->enum('status', ['draft', 'approved', 'rejected', 'under_review'])->default('draft');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->boolean('published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->string('external_report_url', 500)->nullable(); // Link to external assessment report
            $table->decimal('compliance_score', 5, 2)->nullable(); // Compliance with international standards
            $table->enum('accreditation_status', [
                'full_accreditation', 
                'conditional_accreditation', 
                'provisional_accreditation', 
                'denied', 
                'not_applicable'
            ])->default('not_applicable');
            $table->timestamps();

            // Indexes
            $table->index(['institution_id', 'academic_year_id']);
            $table->index(['assessment_date', 'status']);
            $table->index(['international_standard']);
            $table->index(['certification_valid_until']);
            $table->index(['published', 'published_at']);
        });

        // Create Assessment Comparisons table for benchmarking
        Schema::create('assessment_comparisons', function (Blueprint $table) {
            $table->id();
            $table->string('comparison_type', 50); // 'regional', 'national', 'international'
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->string('assessment_category', 50); // 'ksq', 'bsq', 'combined'
            $table->json('institution_scores'); // Array of institution IDs and their scores
            $table->json('ranking_data'); // Calculated rankings
            $table->json('statistical_analysis'); // Mean, median, percentiles, etc.
            $table->date('calculation_date');
            $table->foreignId('calculated_by')->constrained('users')->onDelete('restrict');
            $table->timestamps();

            // Indexes
            $table->index(['comparison_type', 'academic_year_id']);
            $table->index(['assessment_category']);
            $table->index(['calculation_date']);
        });

        // Create Performance Trends table
        Schema::create('performance_trends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->string('trend_type', 50); // 'ksq', 'bsq', 'overall'
            $table->date('period_start');
            $table->date('period_end');
            $table->json('trend_data'); // Historical performance data points
            $table->decimal('trend_slope', 8, 4)->nullable(); // Mathematical trend slope
            $table->enum('trend_direction', ['improving', 'declining', 'stable']);
            $table->decimal('average_score', 5, 2);
            $table->decimal('min_score', 5, 2);
            $table->decimal('max_score', 5, 2);
            $table->json('analysis_notes')->nullable(); // Analysis and insights
            $table->timestamp('calculated_at');
            $table->timestamps();

            // Indexes
            $table->index(['institution_id', 'trend_type']);
            $table->index(['period_start', 'period_end']);
            $table->index(['trend_direction']);
        });

        // Create Assessment Targets table for goal setting
        Schema::create('assessment_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->string('target_type', 50); // 'ksq', 'bsq', 'improvement'
            $table->decimal('target_score', 5, 2);
            $table->string('target_category', 100)->nullable(); // Specific area or criteria
            $table->text('target_description');
            $table->date('target_deadline');
            $table->enum('status', ['draft', 'active', 'achieved', 'missed', 'cancelled'])->default('draft');
            $table->decimal('current_score', 5, 2)->nullable();
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->json('milestone_data')->nullable(); // Intermediate milestones
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['institution_id', 'academic_year_id']);
            $table->index(['target_type', 'status']);
            $table->index(['target_deadline']);
        });

        // Create Assessment Notifications table
        Schema::create('assessment_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('notification_type', 50); // 'assessment_due', 'follow_up_required', 'target_missed'
            $table->morphs('notifiable'); // Can be KSQ, BSQ, or Target
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->string('title', 255);
            $table->text('message');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->json('recipient_roles'); // Roles that should receive this notification
            $table->boolean('sent')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->date('due_date')->nullable();
            $table->json('action_required')->nullable(); // What actions need to be taken
            $table->timestamps();

            // Indexes
            $table->index(['notification_type', 'sent']);
            $table->index(['institution_id', 'priority']);
            $table->index(['due_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_notifications');
        Schema::dropIfExists('assessment_targets');
        Schema::dropIfExists('performance_trends');
        Schema::dropIfExists('assessment_comparisons');
        Schema::dropIfExists('bsq_results');
        Schema::dropIfExists('ksq_results');
    }
};