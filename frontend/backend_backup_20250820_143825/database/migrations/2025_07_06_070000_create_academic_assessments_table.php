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
        Schema::create('academic_assessments', function (Blueprint $table) {
            $table->id();
            
            // Basic information
            $table->string('assessment_title');
            $table->enum('assessment_type', [
                'ksq_national',         // KSQ (Keyfiyyət Standartı Qiymətləndirmə) - National
                'bsq_national',         // BSQ (Bacarıq Standartı Qiymətləndirmə) - National
                'entrance_exam',        // University entrance exams
                'mid_term_exam',        // Mid-term examinations
                'final_exam',           // Final examinations
                'diagnostic_test',      // Diagnostic assessments
                'benchmark_test',       // Benchmark testing
                'competency_test',      // Teacher competency testing
                'certification_exam',   // Professional certification
                'placement_test',       // Student placement testing
                'standardized_test',    // Other standardized tests
                'school_internal'       // School internal assessments
            ]);
            
            $table->enum('assessment_level', [
                'national',             // National level assessment
                'regional',             // Regional level assessment
                'district',             // District level assessment
                'school',               // School level assessment
                'class',                // Class level assessment
                'individual'            // Individual assessment
            ]);
            
            // Administrative details
            $table->foreignId('institution_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_term_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('grade_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('subject_id')->nullable()->constrained()->onDelete('cascade');
            
            // Scheduling information
            $table->date('assessment_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('duration_minutes');
            $table->date('registration_deadline')->nullable();
            $table->date('results_release_date')->nullable();
            
            // Assessment configuration
            $table->text('assessment_description')->nullable();
            $table->json('assessment_objectives')->nullable()->comment('Learning objectives being assessed');
            $table->json('assessment_standards')->nullable()->comment('Standards and criteria');
            $table->integer('total_questions')->nullable();
            $table->integer('total_points')->nullable();
            $table->decimal('passing_score', 5, 2)->nullable();
            
            // Question breakdown
            $table->json('question_breakdown')->nullable()->comment('Types and distribution of questions');
            $table->json('difficulty_distribution')->nullable()->comment('Easy, medium, hard question distribution');
            $table->json('topic_coverage')->nullable()->comment('Coverage of different topics/subjects');
            
            // Participation and eligibility
            $table->enum('participation_type', [
                'mandatory',            // Required for all eligible students
                'voluntary',            // Optional participation
                'selected',             // Selected students only
                'remedial',             // For students needing additional support
                'advanced'              // For advanced/gifted students
            ])->default('mandatory');
            
            $table->json('eligibility_criteria')->nullable()->comment('Who can take this assessment');
            $table->integer('max_participants')->nullable();
            $table->decimal('participation_fee', 8, 2)->nullable();
            
            // Status and workflow
            $table->enum('status', [
                'planning',             // Assessment being planned
                'scheduled',            // Assessment scheduled
                'registration_open',    // Registration period open
                'registration_closed',  // Registration closed
                'in_progress',          // Assessment in progress
                'completed',            // Assessment completed
                'grading',              // Results being graded
                'results_ready',        // Results available
                'archived',             // Assessment archived
                'cancelled'             // Assessment cancelled
            ])->default('planning');
            
            // Proctoring and security
            $table->enum('proctoring_type', [
                'in_person',            // Traditional in-person proctoring
                'online_proctored',     // Online with live proctoring
                'online_self',          // Online self-administered
                'hybrid'                // Combination of methods
            ])->default('in_person');
            
            $table->json('security_measures')->nullable()->comment('Security protocols and measures');
            $table->boolean('requires_id_verification')->default(true);
            $table->boolean('allows_calculator')->default(false);
            $table->boolean('allows_reference_materials')->default(false);
            $table->json('allowed_materials')->nullable()->comment('List of permitted materials');
            
            // Results and scoring
            $table->enum('scoring_method', [
                'raw_score',            // Simple point-based scoring
                'scaled_score',         // Scaled scoring system
                'percentile_rank',      // Percentile ranking
                'grade_equivalent',     // Grade level equivalent
                'standard_score',       // Standardized scoring
                'rubric_based',         // Rubric-based assessment
                'competency_based'      // Competency-based evaluation
            ])->default('raw_score');
            
            $table->decimal('mean_score', 5, 2)->nullable()->comment('Average score across all participants');
            $table->decimal('median_score', 5, 2)->nullable();
            $table->decimal('standard_deviation', 5, 2)->nullable();
            $table->decimal('highest_score', 5, 2)->nullable();
            $table->decimal('lowest_score', 5, 2)->nullable();
            
            // Statistical analysis
            $table->json('score_distribution')->nullable()->comment('Distribution of scores by ranges');
            $table->json('performance_analytics')->nullable()->comment('Detailed performance analysis');
            $table->json('question_analysis')->nullable()->comment('Question-level difficulty and discrimination');
            $table->decimal('reliability_coefficient', 4, 3)->nullable()->comment('Assessment reliability measure');
            
            // Comparative analysis
            $table->json('historical_comparison')->nullable()->comment('Comparison with previous years');
            $table->json('regional_comparison')->nullable()->comment('Regional performance comparison');
            $table->json('national_benchmarks')->nullable()->comment('National benchmark comparisons');
            $table->decimal('improvement_percentage', 5, 2)->nullable()->comment('Year-over-year improvement');
            
            // Administrative tracking
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('conducted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('administrative_notes')->nullable();
            
            // Quality assurance
            $table->boolean('quality_reviewed')->default(false);
            $table->foreignId('quality_reviewer')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('quality_review_date')->nullable();
            $table->text('quality_notes')->nullable();
            $table->enum('quality_rating', ['excellent', 'good', 'satisfactory', 'needs_improvement'])->nullable();
            
            // Resources and logistics
            $table->json('required_resources')->nullable()->comment('Rooms, equipment, personnel needed');
            $table->json('venue_assignments')->nullable()->comment('Room and seat assignments');
            $table->integer('proctors_required')->nullable();
            $table->json('proctor_assignments')->nullable()->comment('Proctor schedule and assignments');
            
            // Technology and digital aspects
            $table->boolean('uses_technology')->default(false);
            $table->json('technology_requirements')->nullable()->comment('Hardware/software requirements');
            $table->string('online_platform')->nullable()->comment('Platform used for online assessments');
            $table->json('digital_delivery_config')->nullable()->comment('Digital assessment configuration');
            
            // Accessibility and accommodations
            $table->json('accessibility_features')->nullable()->comment('Accessibility accommodations available');
            $table->boolean('supports_screen_reader')->default(false);
            $table->boolean('supports_extended_time')->default(false);
            $table->json('special_accommodations')->nullable()->comment('Special needs accommodations');
            
            // Communication and reporting
            $table->json('communication_plan')->nullable()->comment('How results will be communicated');
            $table->boolean('auto_generate_reports')->default(true);
            $table->json('report_templates')->nullable()->comment('Available report formats');
            $table->boolean('parent_access_enabled')->default(true);
            $table->boolean('student_access_enabled')->default(true);
            
            // Certification and credentials
            $table->boolean('provides_certification')->default(false);
            $table->string('certificate_template')->nullable();
            $table->json('certification_criteria')->nullable()->comment('Requirements for certification');
            $table->date('certificate_expiry_date')->nullable();
            
            // Follow-up and intervention
            $table->boolean('triggers_intervention')->default(false);
            $table->json('intervention_thresholds')->nullable()->comment('Score thresholds for interventions');
            $table->json('recommended_actions')->nullable()->comment('Recommended follow-up actions');
            $table->date('intervention_review_date')->nullable();
            
            // Archival and retention
            $table->enum('retention_period', [
                '1_year',               // Keep for 1 year
                '3_years',              // Keep for 3 years
                '5_years',              // Keep for 5 years
                '10_years',             // Keep for 10 years
                'permanent'             // Keep permanently
            ])->default('5_years');
            
            $table->date('archive_date')->nullable();
            $table->boolean('results_published')->default(false);
            $table->timestamp('results_published_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['assessment_type', 'assessment_date']);
            $table->index(['institution_id', 'academic_year_id']);
            $table->index(['status', 'assessment_date']);
            $table->index(['grade_id', 'subject_id']);
            $table->index(['assessment_level', 'assessment_type']);
            $table->index(['created_by', 'created_at']);
            $table->index(['assessment_date', 'start_time']);
            $table->index(['results_release_date', 'status']);
            
            // Composite indexes for common queries
            $table->index(['academic_year_id', 'assessment_type', 'grade_id']);
            $table->index(['institution_id', 'assessment_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('academic_assessments');
    }
};