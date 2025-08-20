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
        Schema::create('teacher_certifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            
            // Certification details
            $table->string('certification_name');
            $table->enum('certification_type', [
                'teaching_license',     // Basic teaching license
                'subject_certification', // Subject-specific certification
                'grade_level_cert',     // Grade level certification
                'special_education',    // Special education certification
                'bilingual_cert',       // Bilingual education certification
                'technology_cert',      // Educational technology certification
                'leadership_cert',      // Educational leadership certification
                'counseling_cert',      // School counseling certification
                'administrative_cert',  // Administrative certification
                'continuing_education', // Continuing education credits
                'professional_development', // Professional development
                'competency_assessment', // Competency-based assessment
                'national_standard',    // National teaching standards
                'international_cert'    // International certification
            ]);
            
            $table->string('certification_code')->nullable()->comment('Official certification code/number');
            $table->string('issuing_organization');
            $table->string('issuing_country')->default('Azerbaijan');
            $table->string('issuing_region')->nullable();
            
            // Certification timeline
            $table->date('issue_date');
            $table->date('effective_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('is_renewable')->default(true);
            $table->integer('renewal_period_years')->nullable();
            $table->date('next_renewal_due')->nullable();
            
            // Certification level and scope
            $table->enum('certification_level', [
                'entry_level',          // Entry level certification
                'standard',             // Standard certification
                'advanced',             // Advanced certification
                'expert',               // Expert level certification
                'master',               // Master teacher certification
                'specialist'            // Specialist certification
            ])->default('standard');
            
            $table->json('subject_areas')->nullable()->comment('Subjects covered by certification');
            $table->json('grade_levels')->nullable()->comment('Grade levels covered');
            $table->json('specializations')->nullable()->comment('Special areas of expertise');
            
            // Requirements and prerequisites
            $table->json('prerequisites_met')->nullable()->comment('Prerequisites satisfied');
            $table->json('education_requirements')->nullable()->comment('Education level requirements');
            $table->integer('experience_years_required')->nullable();
            $table->integer('experience_years_at_issue')->nullable();
            $table->json('training_hours_required')->nullable()->comment('Required training hours');
            $table->json('training_completed')->nullable()->comment('Training actually completed');
            
            // Assessment and examination
            $table->boolean('requires_examination')->default(false);
            $table->string('examination_type')->nullable();
            $table->date('examination_date')->nullable();
            $table->decimal('examination_score', 5, 2)->nullable();
            $table->decimal('passing_score_required', 5, 2)->nullable();
            $table->enum('examination_result', [
                'passed',               // Passed examination
                'failed',               // Failed examination
                'pending',              // Results pending
                'retake_required',      // Must retake exam
                'waived'                // Examination waived
            ])->nullable();
            
            // Portfolio and evidence
            $table->boolean('requires_portfolio')->default(false);
            $table->json('portfolio_components')->nullable()->comment('Required portfolio elements');
            $table->boolean('portfolio_submitted')->default(false);
            $table->date('portfolio_submission_date')->nullable();
            $table->enum('portfolio_status', [
                'not_required',         // Portfolio not required
                'pending',              // Portfolio pending submission
                'submitted',            // Portfolio submitted
                'under_review',         // Portfolio being reviewed
                'approved',             // Portfolio approved
                'revision_required',    // Portfolio needs revision
                'rejected'              // Portfolio rejected
            ])->default('not_required');
            
            // Practical assessment and observation
            $table->boolean('requires_observation')->default(false);
            $table->integer('observation_hours_required')->nullable();
            $table->integer('observation_hours_completed')->nullable();
            $table->json('observation_results')->nullable()->comment('Classroom observation results');
            $table->foreignId('observed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->date('observation_date')->nullable();
            $table->enum('observation_rating', [
                'unsatisfactory',       // Below standard performance
                'developing',           // Developing proficiency
                'proficient',           // Proficient performance
                'distinguished'         // Distinguished performance
            ])->nullable();
            
            // Status and validity
            $table->enum('status', [
                'active',               // Currently active certification
                'inactive',             // Temporarily inactive
                'expired',              // Certification expired
                'suspended',            // Certification suspended
                'revoked',              // Certification revoked
                'pending',              // Application pending
                'denied',               // Application denied
                'under_review',         // Under review/audit
                'provisional'           // Provisional certification
            ])->default('pending');
            
            $table->text('status_notes')->nullable();
            $table->date('status_change_date')->nullable();
            $table->foreignId('status_changed_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Renewal and maintenance
            $table->json('renewal_requirements')->nullable()->comment('Requirements for renewal');
            $table->integer('continuing_education_hours_required')->nullable();
            $table->integer('continuing_education_hours_completed')->nullable();
            $table->date('last_renewal_date')->nullable();
            $table->integer('renewal_count')->default(0);
            $table->boolean('auto_renewal_eligible')->default(false);
            
            // Professional development tracking
            $table->json('professional_development_log')->nullable()->comment('Record of professional development');
            $table->decimal('pd_hours_current_period', 6, 1)->default(0.0);
            $table->decimal('pd_hours_required_period', 6, 1)->nullable();
            $table->date('pd_period_start')->nullable();
            $table->date('pd_period_end')->nullable();
            
            // Performance and evaluation
            $table->json('performance_evaluations')->nullable()->comment('Performance evaluation results');
            $table->decimal('latest_evaluation_score', 5, 2)->nullable();
            $table->date('last_evaluation_date')->nullable();
            $table->enum('performance_rating', [
                'exceptional',          // Exceptional performance
                'proficient',           // Proficient performance
                'developing',           // Developing performance
                'unsatisfactory'        // Unsatisfactory performance
            ])->nullable();
            
            // Documentation and verification
            $table->json('supporting_documents')->nullable()->comment('Certificates, transcripts, etc.');
            $table->boolean('documents_verified')->default(false);
            $table->foreignId('verified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->date('verification_date')->nullable();
            $table->text('verification_notes')->nullable();
            
            // Disciplinary and compliance
            $table->boolean('disciplinary_action_history')->default(false);
            $table->json('disciplinary_records')->nullable()->comment('Any disciplinary actions');
            $table->boolean('background_check_required')->default(true);
            $table->boolean('background_check_completed')->default(false);
            $table->date('background_check_date')->nullable();
            $table->enum('background_check_result', [
                'clear',                // Background check clear
                'conditional',          // Conditional clearance
                'pending',              // Results pending
                'failed'                // Background check failed
            ])->nullable();
            
            // Teaching effectiveness and impact
            $table->json('student_achievement_data')->nullable()->comment('Student performance under this teacher');
            $table->decimal('student_growth_percentile', 5, 2)->nullable();
            $table->json('peer_evaluations')->nullable()->comment('Peer review results');
            $table->json('student_feedback')->nullable()->comment('Student evaluation feedback');
            $table->json('parent_feedback')->nullable()->comment('Parent feedback');
            
            // Recognition and awards
            $table->json('awards_recognition')->nullable()->comment('Professional awards and recognition');
            $table->json('leadership_roles')->nullable()->comment('Leadership positions held');
            $table->json('committee_memberships')->nullable()->comment('Professional committee memberships');
            $table->json('research_publications')->nullable()->comment('Educational research and publications');
            
            // Technology and digital literacy
            $table->json('technology_certifications')->nullable()->comment('Educational technology certifications');
            $table->json('digital_competencies')->nullable()->comment('Digital teaching competencies');
            $table->boolean('online_teaching_certified')->default(false);
            $table->date('online_teaching_cert_date')->nullable();
            
            // Administrative and workflow
            $table->foreignId('application_submitted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('application_submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            // Reporting and analytics
            $table->boolean('included_in_reports')->default(true);
            $table->json('certification_analytics')->nullable()->comment('Analytics and metrics');
            $table->decimal('certification_score', 5, 2)->nullable()->comment('Overall certification score');
            $table->integer('certification_rank')->nullable()->comment('Ranking among peers');
            
            // International and cross-border recognition
            $table->boolean('internationally_recognized')->default(false);
            $table->json('international_equivalencies')->nullable()->comment('International equivalent certifications');
            $table->json('reciprocity_agreements')->nullable()->comment('Reciprocity with other regions/countries');
            
            // Quality assurance and audit
            $table->boolean('audit_required')->default(false);
            $table->date('last_audit_date')->nullable();
            $table->enum('audit_result', [
                'compliant',            // Fully compliant
                'minor_issues',         // Minor compliance issues
                'major_issues',         // Major compliance issues
                'non_compliant'         // Not compliant
            ])->nullable();
            $table->text('audit_notes')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['teacher_id', 'certification_type']);
            $table->index(['status', 'expiry_date']);
            $table->index(['certification_type', 'certification_level']);
            $table->index(['issue_date', 'expiry_date']);
            $table->index(['next_renewal_due', 'status']);
            $table->index(['issuing_organization', 'certification_type']);
            $table->index(['performance_rating', 'latest_evaluation_score']);
            $table->index(['documents_verified', 'verification_date']);
            
            // Composite indexes for common queries
            $table->index(['teacher_id', 'status', 'expiry_date']);
            $table->index(['certification_type', 'status', 'issue_date']);
            $table->index(['issuing_organization', 'status', 'certification_level']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_certifications');
    }
};