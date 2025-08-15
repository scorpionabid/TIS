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
        Schema::create('assessment_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('academic_assessments')->onDelete('cascade');
            $table->foreignId('participant_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('institution_id')->nullable()->constrained()->onDelete('cascade');
            
            // Registration information
            $table->timestamp('registered_at')->useCurrent();
            $table->foreignId('registered_by')->constrained('users')->onDelete('cascade');
            $table->enum('registration_status', [
                'pending',              // Registration pending approval
                'confirmed',            // Registration confirmed
                'waitlisted',           // On waiting list
                'cancelled',            // Registration cancelled
                'no_show',              // Registered but didn't attend
                'transferred',          // Transferred to different session
                'expelled'              // Expelled from assessment
            ])->default('pending');
            
            // Participant details at time of assessment
            $table->string('participant_number')->nullable()->comment('Assessment-specific ID number');
            $table->json('participant_info')->nullable()->comment('Name, grade, school at time of assessment');
            $table->foreignId('current_grade_id')->nullable()->constrained('grades')->onDelete('set null');
            $table->string('current_class_section')->nullable();
            
            // Assessment logistics
            $table->string('seat_number')->nullable();
            $table->string('room_assignment')->nullable();
            $table->string('session_group')->nullable()->comment('Morning/afternoon session group');
            $table->foreignId('assigned_proctor')->nullable()->constrained('users')->onDelete('set null');
            
            // Attendance and participation
            $table->enum('attendance_status', [
                'present',              // Attended assessment
                'absent',               // Did not attend
                'late',                 // Arrived late
                'early_departure',      // Left early
                'medical_emergency',    // Medical issue during assessment
                'technical_issue',      // Technical problems
                'disqualified'          // Disqualified during assessment
            ])->nullable();
            
            $table->time('arrival_time')->nullable();
            $table->time('start_time')->nullable();
            $table->time('submission_time')->nullable();
            $table->time('departure_time')->nullable();
            $table->integer('time_used_minutes')->nullable();
            
            // Special accommodations
            $table->json('accommodations_requested')->nullable()->comment('Special accommodations needed');
            $table->json('accommodations_provided')->nullable()->comment('Accommodations actually provided');
            $table->boolean('extended_time')->default(false);
            $table->integer('additional_time_minutes')->default(0);
            $table->boolean('separate_room')->default(false);
            $table->boolean('reader_assistance')->default(false);
            $table->boolean('scribe_assistance')->default(false);
            $table->json('assistive_technology')->nullable()->comment('Technology aids used');
            
            // Assessment results
            $table->decimal('raw_score', 8, 2)->nullable();
            $table->decimal('scaled_score', 8, 2)->nullable();
            $table->decimal('percentile_rank', 5, 2)->nullable();
            $table->string('grade_equivalent')->nullable();
            $table->decimal('standard_score', 8, 2)->nullable();
            $table->enum('performance_level', [
                'below_basic',          // Below basic proficiency
                'basic',                // Basic proficiency
                'proficient',           // Proficient
                'advanced',             // Advanced proficiency
                'distinguished'         // Distinguished performance
            ])->nullable();
            
            // Detailed scoring breakdown
            $table->json('section_scores')->nullable()->comment('Scores by assessment sections');
            $table->json('topic_scores')->nullable()->comment('Scores by topic areas');
            $table->json('skill_scores')->nullable()->comment('Scores by skill areas');
            $table->json('question_responses')->nullable()->comment('Individual question responses');
            $table->integer('correct_answers')->nullable();
            $table->integer('incorrect_answers')->nullable();
            $table->integer('unanswered_questions')->nullable();
            
            // Statistical context
            $table->decimal('z_score', 6, 3)->nullable()->comment('Standard deviation from mean');
            $table->integer('rank_in_class')->nullable();
            $table->integer('rank_in_grade')->nullable();
            $table->integer('rank_in_school')->nullable();
            $table->integer('rank_in_region')->nullable();
            $table->integer('rank_nationally')->nullable();
            
            // Comparative performance
            $table->decimal('class_average_difference', 6, 2)->nullable()->comment('Difference from class average');
            $table->decimal('grade_average_difference', 6, 2)->nullable()->comment('Difference from grade average');
            $table->decimal('school_average_difference', 6, 2)->nullable()->comment('Difference from school average');
            $table->decimal('national_average_difference', 6, 2)->nullable()->comment('Difference from national average');
            
            // Growth and progress tracking
            $table->decimal('previous_assessment_score', 8, 2)->nullable();
            $table->decimal('growth_score', 6, 2)->nullable()->comment('Growth from previous assessment');
            $table->enum('growth_category', [
                'high_growth',          // Exceptional growth
                'typical_growth',       // Expected growth
                'low_growth',           // Below expected growth
                'no_growth',            // No measurable growth
                'decline'               // Performance declined
            ])->nullable();
            
            // Incident reporting
            $table->json('incidents_reported')->nullable()->comment('Any incidents during assessment');
            $table->boolean('cheating_suspected')->default(false);
            $table->text('proctor_notes')->nullable();
            $table->json('irregularities')->nullable()->comment('Any test irregularities');
            $table->boolean('validity_questioned')->default(false);
            $table->text('validity_notes')->nullable();
            
            // Answer sheet and submission details
            $table->string('answer_sheet_id')->nullable();
            $table->enum('submission_method', [
                'paper',                // Paper-based submission
                'digital',              // Digital submission
                'hybrid',               // Combination of paper/digital
                'oral',                 // Oral assessment
                'practical'             // Practical demonstration
            ])->default('paper');
            
            $table->boolean('answer_sheet_received')->default(false);
            $table->timestamp('answer_sheet_received_at')->nullable();
            $table->json('submission_metadata')->nullable()->comment('Digital submission metadata');
            
            // Scoring and review process
            $table->foreignId('scored_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('scored_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->boolean('scoring_verified')->default(false);
            $table->text('scoring_notes')->nullable();
            
            // Appeals and disputes
            $table->boolean('appeal_submitted')->default(false);
            $table->timestamp('appeal_submitted_at')->nullable();
            $table->text('appeal_reason')->nullable();
            $table->enum('appeal_status', [
                'pending',              // Appeal pending review
                'under_review',         // Appeal being reviewed
                'upheld',               // Appeal upheld, score changed
                'denied',               // Appeal denied
                'partially_upheld'      // Appeal partially upheld
            ])->nullable();
            
            $table->decimal('revised_score', 8, 2)->nullable();
            $table->timestamp('appeal_resolved_at')->nullable();
            $table->text('appeal_resolution_notes')->nullable();
            
            // Certification and credentials
            $table->boolean('certificate_earned')->default(false);
            $table->string('certificate_number')->nullable();
            $table->date('certificate_issued_date')->nullable();
            $table->date('certificate_expiry_date')->nullable();
            $table->string('certificate_file_path')->nullable();
            
            // Follow-up and intervention
            $table->boolean('requires_intervention')->default(false);
            $table->json('intervention_recommendations')->nullable()->comment('Recommended interventions');
            $table->enum('intervention_priority', [
                'immediate',            // Immediate intervention needed
                'high',                 // High priority intervention
                'medium',               // Medium priority intervention
                'low',                  // Low priority intervention
                'monitoring'            // Continue monitoring
            ])->nullable();
            
            $table->boolean('intervention_plan_created')->default(false);
            $table->date('intervention_start_date')->nullable();
            $table->foreignId('intervention_coordinator')->nullable()->constrained('users')->onDelete('set null');
            
            // Parent/guardian communication
            $table->boolean('results_shared_with_parents')->default(false);
            $table->timestamp('results_shared_at')->nullable();
            $table->enum('parent_communication_method', ['email', 'sms', 'phone', 'meeting', 'portal'])->nullable();
            $table->boolean('parent_conference_requested')->default(false);
            $table->date('parent_conference_date')->nullable();
            
            // Privacy and access control
            $table->boolean('results_confidential')->default(false);
            $table->json('access_permissions')->nullable()->comment('Who can access these results');
            $table->boolean('results_published')->default(false);
            $table->timestamp('results_released_to_participant')->nullable();
            
            // Technology and digital assessment data
            $table->json('digital_behavior_data')->nullable()->comment('Digital assessment behavior analytics');
            $table->integer('tab_switches')->nullable()->comment('Number of times switched tabs');
            $table->integer('copy_paste_attempts')->nullable();
            $table->json('keystroke_patterns')->nullable()->comment('Keystroke timing analysis');
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            
            // Quality metrics
            $table->decimal('response_pattern_score', 5, 2)->nullable()->comment('Quality of response patterns');
            $table->boolean('unusual_response_pattern')->default(false);
            $table->decimal('engagement_score', 5, 2)->nullable()->comment('Level of engagement during assessment');
            $table->integer('question_review_count')->nullable()->comment('Number of questions reviewed');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['assessment_id', 'participant_id']);
            $table->index(['registration_status', 'registered_at']);
            $table->index(['attendance_status', 'participant_id']);
            $table->index(['performance_level', 'raw_score']);
            $table->index(['institution_id', 'current_grade_id']);
            $table->index(['percentile_rank', 'assessment_id']);
            $table->index(['requires_intervention', 'intervention_priority']);
            $table->index(['certificate_earned', 'certificate_issued_date']);
            
            // Unique constraint to prevent duplicate participation
            $table->unique(['assessment_id', 'participant_id'], 'unique_assessment_participation');
            
            // Composite indexes for common queries
            $table->index(['assessment_id', 'performance_level', 'raw_score']);
            $table->index(['participant_id', 'assessment_id', 'raw_score']);
            $table->index(['institution_id', 'assessment_id', 'percentile_rank']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_participants');
    }
};