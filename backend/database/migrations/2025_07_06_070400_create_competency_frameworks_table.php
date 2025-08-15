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
        Schema::create('competency_frameworks', function (Blueprint $table) {
            $table->id();
            
            // Framework identification
            $table->string('framework_name');
            $table->string('framework_code')->unique()->comment('Unique identifier for the framework');
            $table->string('framework_version')->default('1.0');
            $table->enum('framework_type', [
                'academic_standards',   // Academic content standards
                'teaching_standards',   // Teaching professional standards
                'leadership_standards', // Educational leadership standards
                'digital_literacy',     // Digital literacy competencies
                'language_proficiency', // Language proficiency levels
                'career_readiness',     // Career and college readiness
                'life_skills',          // Life skills competencies
                'assessment_standards', // Assessment and evaluation standards
                'curriculum_standards', // Curriculum development standards
                'special_education'     // Special education competencies
            ]);
            
            // Framework scope and applicability
            $table->enum('scope_level', [
                'national',             // National framework
                'regional',             // Regional framework
                'institutional',        // Institution-specific framework
                'subject_specific',     // Subject-specific framework
                'grade_specific',       // Grade-specific framework
                'role_specific'         // Role-specific framework
            ])->default('national');
            
            $table->json('applicable_grades')->nullable()->comment('Grade levels this framework applies to');
            $table->json('applicable_subjects')->nullable()->comment('Subjects this framework covers');
            $table->json('applicable_roles')->nullable()->comment('Roles this framework applies to');
            $table->string('target_audience')->nullable()->comment('Primary target audience');
            
            // Framework description and purpose
            $table->text('framework_description');
            $table->text('purpose_statement')->nullable()->comment('Purpose and goals of the framework');
            $table->json('guiding_principles')->nullable()->comment('Core principles underlying the framework');
            $table->json('theoretical_foundation')->nullable()->comment('Theoretical basis for the framework');
            
            // Development and authorship
            $table->string('developing_organization');
            $table->json('development_team')->nullable()->comment('Team members who developed the framework');
            $table->date('development_start_date')->nullable();
            $table->date('development_completion_date')->nullable();
            $table->date('approval_date')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Version control and updates
            $table->date('effective_date');
            $table->date('review_date')->nullable()->comment('Next scheduled review date');
            $table->date('expiry_date')->nullable();
            $table->json('version_history')->nullable()->comment('History of framework versions');
            $table->json('recent_changes')->nullable()->comment('Changes in current version');
            $table->text('change_rationale')->nullable();
            
            // Framework structure
            $table->json('framework_structure')->comment('Hierarchical structure of the framework');
            $table->integer('total_domains')->default(0)->comment('Number of main domains/areas');
            $table->integer('total_competencies')->default(0)->comment('Total number of competencies');
            $table->integer('total_indicators')->default(0)->comment('Total number of performance indicators');
            $table->integer('total_levels')->default(0)->comment('Number of proficiency levels');
            
            // Proficiency levels definition
            $table->json('proficiency_levels')->nullable()->comment('Definition of proficiency levels');
            $table->json('level_descriptors')->nullable()->comment('Detailed descriptors for each level');
            $table->json('progression_criteria')->nullable()->comment('Criteria for advancing between levels');
            
            // Alignment and mapping
            $table->json('aligned_frameworks')->nullable()->comment('Other frameworks this aligns with');
            $table->json('alignment_mapping')->nullable()->comment('Detailed alignment mappings');
            $table->json('curriculum_alignment')->nullable()->comment('Alignment with curriculum standards');
            $table->json('assessment_alignment')->nullable()->comment('Alignment with assessment systems');
            
            // Implementation guidance
            $table->json('implementation_guidelines')->nullable()->comment('Guidelines for implementation');
            $table->json('training_requirements')->nullable()->comment('Training needed for implementation');
            $table->json('resource_requirements')->nullable()->comment('Resources needed for implementation');
            $table->json('timeline_recommendations')->nullable()->comment('Recommended implementation timeline');
            
            // Quality assurance and validation
            $table->boolean('pilot_tested')->default(false);
            $table->json('pilot_test_results')->nullable()->comment('Results from pilot testing');
            $table->boolean('expert_reviewed')->default(false);
            $table->json('expert_review_feedback')->nullable()->comment('Feedback from expert reviewers');
            $table->boolean('stakeholder_validated')->default(false);
            $table->json('stakeholder_feedback')->nullable()->comment('Feedback from stakeholders');
            
            // Research and evidence base
            $table->json('research_foundation')->nullable()->comment('Research supporting the framework');
            $table->json('evidence_sources')->nullable()->comment('Sources of evidence for effectiveness');
            $table->json('validity_studies')->nullable()->comment('Studies validating the framework');
            $table->json('reliability_data')->nullable()->comment('Reliability data for the framework');
            
            // Usage and adoption tracking
            $table->integer('adoption_count')->default(0)->comment('Number of institutions using framework');
            $table->json('adoption_statistics')->nullable()->comment('Statistics on framework adoption');
            $table->json('usage_patterns')->nullable()->comment('Patterns in how framework is used');
            $table->json('implementation_challenges')->nullable()->comment('Common implementation challenges');
            
            // Assessment and measurement
            $table->json('assessment_methods')->nullable()->comment('Methods for assessing competencies');
            $table->json('measurement_tools')->nullable()->comment('Tools available for measurement');
            $table->json('rubrics_available')->nullable()->comment('Assessment rubrics provided');
            $table->boolean('digital_badges_supported')->default(false);
            $table->json('certification_pathways')->nullable()->comment('Pathways to certification');
            
            // Multilingual support
            $table->json('available_languages')->nullable()->comment('Languages framework is available in');
            $table->string('primary_language')->default('azerbaijani');
            $table->json('translation_status')->nullable()->comment('Status of translations');
            $table->json('cultural_adaptations')->nullable()->comment('Cultural adaptations made');
            
            // Technology integration
            $table->boolean('digital_format_available')->default(false);
            $table->string('api_endpoint')->nullable()->comment('API endpoint for framework data');
            $table->json('integration_specifications')->nullable()->comment('Technical integration specs');
            $table->boolean('machine_readable')->default(false);
            $table->string('data_format')->nullable()->comment('Format of machine-readable data');
            
            // Support and resources
            $table->json('support_materials')->nullable()->comment('Supporting materials available');
            $table->json('training_modules')->nullable()->comment('Training modules provided');
            $table->json('exemplars_provided')->nullable()->comment('Example implementations');
            $table->string('support_contact_email')->nullable();
            $table->string('support_website')->nullable();
            
            // Legal and licensing
            $table->string('license_type')->nullable()->comment('Type of license for use');
            $table->text('copyright_notice')->nullable();
            $table->json('usage_restrictions')->nullable()->comment('Restrictions on framework use');
            $table->json('attribution_requirements')->nullable()->comment('Required attribution');
            
            // Status and availability
            $table->enum('status', [
                'draft',                // Framework in draft stage
                'under_review',         // Under review process
                'approved',             // Approved for use
                'published',            // Published and available
                'deprecated',           // No longer recommended
                'archived',             // Archived/historical
                'superseded'            // Replaced by newer version
            ])->default('draft');
            
            $table->boolean('publicly_available')->default(true);
            $table->boolean('requires_permission')->default(false);
            $table->json('access_restrictions')->nullable()->comment('Who can access/use framework');
            
            // Analytics and metrics
            $table->json('usage_analytics')->nullable()->comment('Analytics on framework usage');
            $table->json('effectiveness_metrics')->nullable()->comment('Metrics on framework effectiveness');
            $table->json('impact_studies')->nullable()->comment('Studies on framework impact');
            $table->decimal('satisfaction_rating', 3, 2)->nullable()->comment('User satisfaction rating');
            
            // Maintenance and support
            $table->foreignId('maintained_by')->nullable()->constrained('users')->onDelete('set null');
            $table->json('maintenance_schedule')->nullable()->comment('Schedule for framework maintenance');
            $table->date('last_maintenance_date')->nullable();
            $table->json('known_issues')->nullable()->comment('Known issues with framework');
            $table->json('enhancement_requests')->nullable()->comment('Requested enhancements');
            
            // Collaboration and community
            $table->boolean('community_contributions_allowed')->default(false);
            $table->json('contributor_guidelines')->nullable()->comment('Guidelines for contributors');
            $table->json('review_process')->nullable()->comment('Process for reviewing contributions');
            $table->json('community_feedback')->nullable()->comment('Feedback from user community');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['framework_type', 'scope_level']);
            $table->index(['status', 'effective_date']);
            $table->index(['developing_organization', 'framework_type']);
            $table->index(['publicly_available', 'status']);
            $table->index(['approval_date', 'effective_date']);
            $table->index(['framework_name', 'framework_version']);
            
            // Full-text search index for descriptions
            if (config('database.default') !== 'sqlite') {
                $table->fullText(['framework_name', 'framework_description', 'purpose_statement']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('competency_frameworks');
    }
};