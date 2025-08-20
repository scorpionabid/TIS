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
        Schema::create('assessment_analytics', function (Blueprint $table) {
            $table->id();
            
            // Reference to the assessment
            $table->foreignId('assessment_id')->constrained('academic_assessments')->onDelete('cascade');
            $table->string('analytics_type')->comment('Type of analytics: overall, grade_level, subject, etc.');
            $table->enum('aggregation_level', [
                'national',             // National level analytics
                'regional',             // Regional level analytics
                'district',             // District level analytics
                'institution',          // Institution level analytics
                'grade',                // Grade level analytics
                'class',                // Class level analytics
                'subject',              // Subject level analytics
                'demographic'           // Demographic group analytics
            ]);
            
            // Scope and filters
            $table->foreignId('institution_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('grade_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('subject_id')->nullable()->constrained()->onDelete('cascade');
            $table->json('demographic_filters')->nullable()->comment('Gender, socioeconomic status, etc.');
            $table->json('inclusion_criteria')->nullable()->comment('Criteria for including participants');
            
            // Participation statistics
            $table->integer('total_eligible_participants')->default(0);
            $table->integer('total_registered_participants')->default(0);
            $table->integer('total_actual_participants')->default(0);
            $table->decimal('participation_rate', 5, 2)->default(0.00)->comment('Percentage of eligible who participated');
            $table->integer('no_shows')->default(0);
            $table->integer('late_arrivals')->default(0);
            $table->integer('early_departures')->default(0);
            $table->integer('disqualified_participants')->default(0);
            
            // Basic score statistics
            $table->decimal('mean_score', 8, 2)->nullable();
            $table->decimal('median_score', 8, 2)->nullable();
            $table->decimal('mode_score', 8, 2)->nullable();
            $table->decimal('standard_deviation', 8, 4)->nullable();
            $table->decimal('variance', 10, 4)->nullable();
            $table->decimal('minimum_score', 8, 2)->nullable();
            $table->decimal('maximum_score', 8, 2)->nullable();
            $table->decimal('range_score', 8, 2)->nullable();
            
            // Percentile and quartile analysis
            $table->decimal('percentile_25', 8, 2)->nullable()->comment('25th percentile score');
            $table->decimal('percentile_75', 8, 2)->nullable()->comment('75th percentile score');
            $table->decimal('percentile_90', 8, 2)->nullable()->comment('90th percentile score');
            $table->decimal('percentile_95', 8, 2)->nullable()->comment('95th percentile score');
            $table->decimal('percentile_99', 8, 2)->nullable()->comment('99th percentile score');
            $table->decimal('interquartile_range', 8, 2)->nullable();
            
            // Score distribution analysis
            $table->json('score_distribution')->nullable()->comment('Distribution of scores by ranges');
            $table->json('performance_level_distribution')->nullable()->comment('Distribution by performance levels');
            $table->decimal('skewness', 6, 4)->nullable()->comment('Measure of distribution asymmetry');
            $table->decimal('kurtosis', 6, 4)->nullable()->comment('Measure of distribution tailedness');
            $table->boolean('normal_distribution')->nullable()->comment('Whether scores follow normal distribution');
            
            // Pass/fail analysis
            $table->decimal('passing_score_threshold', 8, 2)->nullable();
            $table->integer('participants_passed')->default(0);
            $table->integer('participants_failed')->default(0);
            $table->decimal('pass_rate', 5, 2)->default(0.00);
            $table->decimal('excellence_threshold', 8, 2)->nullable();
            $table->integer('participants_excellent')->default(0);
            $table->decimal('excellence_rate', 5, 2)->default(0.00);
            
            // Performance level analysis
            $table->integer('below_basic_count')->default(0);
            $table->integer('basic_count')->default(0);
            $table->integer('proficient_count')->default(0);
            $table->integer('advanced_count')->default(0);
            $table->integer('distinguished_count')->default(0);
            $table->decimal('below_basic_percentage', 5, 2)->default(0.00);
            $table->decimal('basic_percentage', 5, 2)->default(0.00);
            $table->decimal('proficient_percentage', 5, 2)->default(0.00);
            $table->decimal('advanced_percentage', 5, 2)->default(0.00);
            $table->decimal('distinguished_percentage', 5, 2)->default(0.00);
            
            // Item analysis and reliability
            $table->decimal('reliability_coefficient', 5, 4)->nullable()->comment('Internal consistency reliability');
            $table->decimal('cronbach_alpha', 5, 4)->nullable()->comment('Cronbach alpha reliability');
            $table->decimal('sem_score', 6, 3)->nullable()->comment('Standard error of measurement');
            $table->json('item_difficulty_analysis')->nullable()->comment('Analysis of question difficulty');
            $table->json('item_discrimination_analysis')->nullable()->comment('Analysis of question discrimination');
            $table->json('distractor_analysis')->nullable()->comment('Analysis of incorrect answer choices');
            
            // Comparative analysis
            $table->json('historical_comparison')->nullable()->comment('Comparison with previous assessments');
            $table->decimal('year_over_year_change', 6, 2)->nullable()->comment('Change from previous year');
            $table->json('peer_comparison')->nullable()->comment('Comparison with peer institutions');
            $table->json('national_benchmark_comparison')->nullable()->comment('Comparison with national benchmarks');
            $table->json('international_comparison')->nullable()->comment('Comparison with international standards');
            
            // Demographic analysis
            $table->json('gender_performance_analysis')->nullable()->comment('Performance breakdown by gender');
            $table->json('socioeconomic_analysis')->nullable()->comment('Performance by socioeconomic status');
            $table->json('language_background_analysis')->nullable()->comment('Performance by language background');
            $table->json('special_needs_analysis')->nullable()->comment('Performance of students with special needs');
            $table->json('rural_urban_analysis')->nullable()->comment('Rural vs urban performance comparison');
            
            // Growth and value-added analysis
            $table->decimal('expected_growth', 6, 2)->nullable()->comment('Expected growth based on models');
            $table->decimal('actual_growth', 6, 2)->nullable()->comment('Actual measured growth');
            $table->decimal('value_added_score', 6, 2)->nullable()->comment('Value-added by institution/teacher');
            $table->enum('growth_classification', [
                'exceeded_expectations', // Growth exceeded expectations
                'met_expectations',     // Growth met expectations
                'approaching_expectations', // Growth approaching expectations
                'below_expectations'    // Growth below expectations
            ])->nullable();
            
            // Achievement gap analysis
            $table->json('achievement_gaps')->nullable()->comment('Gaps between demographic groups');
            $table->decimal('gender_gap', 6, 2)->nullable()->comment('Performance gap between genders');
            $table->decimal('socioeconomic_gap', 6, 2)->nullable()->comment('Gap by socioeconomic status');
            $table->decimal('language_gap', 6, 2)->nullable()->comment('Gap by language background');
            $table->json('gap_trend_analysis')->nullable()->comment('Trends in achievement gaps over time');
            
            // Quality indicators
            $table->decimal('assessment_quality_score', 5, 2)->nullable()->comment('Overall assessment quality rating');
            $table->json('validity_indicators')->nullable()->comment('Evidence of assessment validity');
            $table->json('fairness_indicators')->nullable()->comment('Evidence of assessment fairness');
            $table->json('bias_analysis')->nullable()->comment('Analysis of potential bias in items');
            $table->boolean('meets_technical_standards')->nullable();
            
            // Predictive analytics
            $table->json('predictive_models')->nullable()->comment('Models for predicting future performance');
            $table->json('risk_factors')->nullable()->comment('Factors associated with poor performance');
            $table->json('success_factors')->nullable()->comment('Factors associated with high performance');
            $table->json('intervention_recommendations')->nullable()->comment('Data-driven intervention recommendations');
            
            // Time and efficiency analysis
            $table->decimal('average_completion_time', 6, 1)->nullable()->comment('Average time to complete in minutes');
            $table->decimal('median_completion_time', 6, 1)->nullable();
            $table->json('completion_time_analysis')->nullable()->comment('Analysis of completion times');
            $table->decimal('time_score_correlation', 5, 3)->nullable()->comment('Correlation between time and score');
            $table->integer('rushed_completions')->default(0)->comment('Participants who finished unusually quickly');
            
            // Digital assessment analytics (if applicable)
            $table->json('digital_behavior_patterns')->nullable()->comment('Patterns in digital assessment behavior');
            $table->decimal('average_tab_switches', 6, 2)->nullable();
            $table->json('navigation_patterns')->nullable()->comment('How participants navigated the assessment');
            $table->json('response_revision_patterns')->nullable()->comment('Patterns in answer changes');
            $table->decimal('engagement_score', 5, 2)->nullable()->comment('Overall engagement during assessment');
            
            // Learning analytics insights
            $table->json('learning_progression_analysis')->nullable()->comment('Analysis of learning progressions');
            $table->json('skill_mastery_analysis')->nullable()->comment('Analysis of skill mastery levels');
            $table->json('knowledge_gap_analysis')->nullable()->comment('Identification of knowledge gaps');
            $table->json('competency_mapping')->nullable()->comment('Mapping to learning competencies');
            
            // Reporting and visualization data
            $table->json('chart_data')->nullable()->comment('Pre-calculated data for charts and graphs');
            $table->json('dashboard_metrics')->nullable()->comment('Key metrics for dashboard displays');
            $table->json('infographic_data')->nullable()->comment('Data formatted for infographics');
            $table->text('executive_summary')->nullable()->comment('Executive summary of key findings');
            
            // Methodological information
            $table->text('analysis_methodology')->nullable()->comment('Methods used for analysis');
            $table->json('statistical_assumptions')->nullable()->comment('Assumptions made in statistical analysis');
            $table->json('limitations')->nullable()->comment('Limitations of the analysis');
            $table->decimal('confidence_interval', 5, 2)->nullable()->comment('Confidence interval for results');
            $table->decimal('margin_of_error', 5, 2)->nullable();
            
            // Administrative and processing
            $table->foreignId('generated_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamp('data_as_of_date')->nullable()->comment('Date of the data snapshot');
            $table->boolean('preliminary_results')->default(false);
            $table->boolean('final_results')->default(false);
            $table->timestamp('finalized_at')->nullable();
            
            // Quality assurance
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->enum('review_status', [
                'pending',              // Review pending
                'approved',             // Results approved
                'revision_required',    // Revision needed
                'rejected'              // Results rejected
            ])->default('pending');
            $table->text('review_notes')->nullable();
            
            // Publication and access
            $table->boolean('published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->json('access_permissions')->nullable()->comment('Who can access these analytics');
            $table->boolean('public_release_approved')->default(false);
            $table->date('embargo_until')->nullable()->comment('Embargo date for public release');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['assessment_id', 'aggregation_level']);
            $table->index(['institution_id', 'grade_id']);
            $table->index(['analytics_type', 'generated_at']);
            $table->index(['published', 'published_at']);
            $table->index(['final_results', 'finalized_at']);
            $table->index(['review_status', 'reviewed_at']);
            
            // Composite indexes for common queries
            $table->index(['assessment_id', 'aggregation_level', 'institution_id']);
            $table->index(['assessment_id', 'grade_id', 'subject_id']);
            $table->index(['aggregation_level', 'published', 'generated_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_analytics');
    }
};