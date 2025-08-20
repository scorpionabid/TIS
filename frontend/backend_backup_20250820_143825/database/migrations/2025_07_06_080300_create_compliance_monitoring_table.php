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
        Schema::create('compliance_monitoring', function (Blueprint $table) {
            $table->id();
            
            // Compliance framework identification
            $table->string('monitoring_id')->unique()->comment('Unique monitoring identifier');
            $table->enum('compliance_framework', [
                'gdpr',                 // General Data Protection Regulation
                'ferpa',                // Family Educational Rights and Privacy Act
                'coppa',                // Children's Online Privacy Protection Act
                'hipaa',                // Health Insurance Portability and Accountability Act
                'iso27001',             // ISO 27001 Information Security Management
                'nist',                 // NIST Cybersecurity Framework
                'sox',                  // Sarbanes-Oxley Act
                'pci_dss',              // Payment Card Industry Data Security Standard
                'azerbaijan_data_protection', // Azerbaijan Data Protection Law
                'education_data_privacy', // Education Data Privacy Regulations
                'student_records_act',  // Student Records Privacy Act
                'accessibility_act',    // Accessibility Compliance Act
                'procurement_regulations', // Government Procurement Regulations
                'audit_standards',      // Government Audit Standards
                'information_security', // National Information Security Standards
                'data_localization',    // Data Localization Requirements
                'cybersecurity_law',    // National Cybersecurity Law
                'privacy_protection',   // Personal Privacy Protection Law
                'internal_policy',      // Internal organizational policies
                'custom'                // Custom compliance requirements
            ]);
            
            $table->string('framework_version')->nullable()->comment('Version of the compliance framework');
            $table->string('control_id')->comment('Specific control or requirement ID');
            $table->string('control_name');
            $table->text('control_description');
            
            // Monitoring scope and context
            $table->foreignId('institution_id')->nullable()->constrained()->onDelete('cascade');
            $table->enum('scope_level', [
                'organization',         // Organization-wide monitoring
                'department',           // Department-level monitoring
                'system',               // System-specific monitoring
                'process',              // Process-specific monitoring
                'project',              // Project-specific monitoring
                'individual'            // Individual user monitoring
            ])->default('organization');
            
            $table->string('monitored_entity')->nullable()->comment('Entity being monitored');
            $table->string('entity_type')->nullable()->comment('Type of entity (system, process, user, etc.)');
            $table->json('monitoring_scope')->nullable()->comment('Detailed scope of monitoring');
            
            // Assessment and evaluation
            $table->timestamp('assessment_date')->useCurrent();
            $table->timestamp('next_assessment_due')->nullable();
            $table->foreignId('assessed_by')->constrained('users')->onDelete('cascade');
            $table->enum('assessment_type', [
                'self_assessment',      // Internal self-assessment
                'internal_audit',       // Internal audit
                'external_audit',       // External audit
                'automated_check',      // Automated compliance check
                'peer_review',          // Peer review assessment
                'third_party_assessment', // Third-party assessment
                'regulatory_inspection', // Regulatory inspection
                'certification_audit'   // Certification audit
            ])->default('self_assessment');
            
            // Compliance status
            $table->enum('compliance_status', [
                'compliant',            // Fully compliant
                'partial_compliance',   // Partially compliant
                'non_compliant',        // Non-compliant
                'not_applicable',       // Control not applicable
                'compensating_control', // Compensating control in place
                'exception_approved',   // Approved exception
                'in_progress',          // Compliance work in progress
                'under_review'          // Under review/assessment
            ])->default('under_review');
            
            $table->decimal('compliance_score', 5, 2)->nullable()->comment('Compliance score (0-100)');
            $table->enum('risk_rating', [
                'critical',             // Critical risk
                'high',                 // High risk
                'medium',               // Medium risk
                'low',                  // Low risk
                'negligible'            // Negligible risk
            ])->nullable();
            
            // Evidence and documentation
            $table->json('evidence_provided')->nullable()->comment('Evidence supporting compliance');
            $table->json('documentation_reviewed')->nullable()->comment('Documentation reviewed');
            $table->json('artifacts_collected')->nullable()->comment('Compliance artifacts');
            $table->text('assessment_methodology')->nullable()->comment('Methodology used for assessment');
            
            // Findings and gaps
            $table->json('compliance_gaps')->nullable()->comment('Identified compliance gaps');
            $table->json('findings')->nullable()->comment('Audit findings');
            $table->json('deficiencies')->nullable()->comment('Control deficiencies');
            $table->text('root_cause_analysis')->nullable()->comment('Root cause of non-compliance');
            
            // Recommendations and remediation
            $table->json('recommendations')->nullable()->comment('Recommendations for improvement');
            $table->json('remediation_plan')->nullable()->comment('Plan to address non-compliance');
            $table->json('corrective_actions')->nullable()->comment('Corrective actions taken');
            $table->date('target_remediation_date')->nullable();
            $table->date('actual_remediation_date')->nullable();
            
            // Implementation and controls
            $table->json('implemented_controls')->nullable()->comment('Controls currently implemented');
            $table->json('control_effectiveness')->nullable()->comment('Effectiveness of controls');
            $table->json('compensating_controls')->nullable()->comment('Compensating controls in place');
            $table->text('implementation_notes')->nullable();
            
            // Testing and validation
            $table->boolean('control_tested')->default(false);
            $table->date('last_test_date')->nullable();
            $table->date('next_test_due')->nullable();
            $table->enum('test_result', [
                'passed',               // Test passed
                'failed',               // Test failed
                'partial',              // Partial success
                'not_tested'            // Not yet tested
            ])->nullable();
            $table->text('test_methodology')->nullable();
            $table->json('test_results')->nullable()->comment('Detailed test results');
            
            // Monitoring metrics and KPIs
            $table->json('compliance_metrics')->nullable()->comment('Key compliance metrics');
            $table->json('performance_indicators')->nullable()->comment('Key performance indicators');
            $table->decimal('target_compliance_level', 5, 2)->nullable()->comment('Target compliance percentage');
            $table->decimal('actual_compliance_level', 5, 2)->nullable()->comment('Actual compliance percentage');
            $table->json('trend_data')->nullable()->comment('Compliance trend over time');
            
            // Risk assessment
            $table->decimal('inherent_risk_score', 5, 2)->nullable()->comment('Risk before controls');
            $table->decimal('residual_risk_score', 5, 2)->nullable()->comment('Risk after controls');
            $table->json('risk_factors')->nullable()->comment('Factors contributing to risk');
            $table->text('risk_mitigation_strategy')->nullable();
            $table->boolean('risk_acceptable')->nullable();
            
            // Stakeholder information
            $table->foreignId('control_owner')->nullable()->constrained('users')->onDelete('set null');
            $table->json('stakeholders')->nullable()->comment('Key stakeholders for this control');
            $table->foreignId('business_owner')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('technical_owner')->nullable()->constrained('users')->onDelete('set null');
            
            // Frequency and scheduling
            $table->enum('monitoring_frequency', [
                'continuous',           // Continuous monitoring
                'daily',                // Daily monitoring
                'weekly',               // Weekly monitoring
                'monthly',              // Monthly monitoring
                'quarterly',            // Quarterly monitoring
                'semi_annually',        // Semi-annual monitoring
                'annually',             // Annual monitoring
                'ad_hoc',               // Ad-hoc monitoring
                'event_driven'          // Event-driven monitoring
            ])->default('quarterly');
            
            $table->json('monitoring_schedule')->nullable()->comment('Detailed monitoring schedule');
            $table->boolean('automated_monitoring')->default(false);
            $table->string('automation_tool')->nullable()->comment('Tool used for automated monitoring');
            
            // Regulatory and legal context
            $table->json('applicable_regulations')->nullable()->comment('Specific regulations that apply');
            $table->json('regulatory_citations')->nullable()->comment('Specific regulatory citations');
            $table->boolean('mandatory_requirement')->default(true);
            $table->date('compliance_deadline')->nullable();
            $table->json('penalties_for_non_compliance')->nullable()->comment('Potential penalties');
            
            // External parties and oversight
            $table->string('regulatory_body')->nullable()->comment('Regulatory body overseeing compliance');
            $table->string('auditor_firm')->nullable()->comment('External auditor firm');
            $table->foreignId('auditor_contact')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('third_party_validation')->default(false);
            $table->date('last_regulatory_review')->nullable();
            
            // Training and awareness
            $table->boolean('training_required')->default(false);
            $table->json('training_completed')->nullable()->comment('Training completion records');
            $table->date('last_training_date')->nullable();
            $table->date('next_training_due')->nullable();
            $table->decimal('training_completion_rate', 5, 2)->nullable();
            
            // Communication and reporting
            $table->json('communication_plan')->nullable()->comment('Communication plan for compliance');
            $table->json('reporting_requirements')->nullable()->comment('Required reporting');
            $table->boolean('executive_reporting')->default(false);
            $table->boolean('board_reporting')->default(false);
            $table->boolean('regulatory_reporting')->default(false);
            
            // Change management
            $table->json('change_log')->nullable()->comment('Log of changes to compliance status');
            $table->timestamp('last_status_change')->nullable();
            $table->foreignId('status_changed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('change_justification')->nullable();
            
            // Technology and system integration
            $table->json('supporting_systems')->nullable()->comment('Systems supporting compliance');
            $table->json('data_sources')->nullable()->comment('Data sources for compliance monitoring');
            $table->boolean('automated_evidence_collection')->default(false);
            $table->json('integration_points')->nullable()->comment('System integration points');
            
            // Cost and resource tracking
            $table->decimal('compliance_cost', 10, 2)->nullable()->comment('Cost of compliance activities');
            $table->integer('effort_hours')->nullable()->comment('Hours spent on compliance');
            $table->json('resource_allocation')->nullable()->comment('Resources allocated to compliance');
            $table->decimal('cost_of_non_compliance', 12, 2)->nullable();
            
            // Continuous improvement
            $table->json('improvement_opportunities')->nullable()->comment('Identified improvement opportunities');
            $table->json('best_practices')->nullable()->comment('Best practices identified');
            $table->json('lessons_learned')->nullable()->comment('Lessons learned');
            $table->boolean('process_optimization')->default(false);
            
            // Exception management
            $table->boolean('exception_requested')->default(false);
            $table->text('exception_justification')->nullable();
            $table->foreignId('exception_approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->date('exception_expiry_date')->nullable();
            $table->json('exception_conditions')->nullable()->comment('Conditions for the exception');
            
            // Certification and accreditation
            $table->boolean('certification_required')->default(false);
            $table->string('certification_body')->nullable();
            $table->date('certification_date')->nullable();
            $table->date('certification_expiry')->nullable();
            $table->string('certificate_number')->nullable();
            
            // Data and analytics
            $table->json('compliance_analytics')->nullable()->comment('Analytics and insights');
            $table->json('benchmark_data')->nullable()->comment('Industry benchmark data');
            $table->json('peer_comparison')->nullable()->comment('Comparison with peer organizations');
            $table->decimal('maturity_level', 3, 1)->nullable()->comment('Compliance maturity level 1-5');
            
            // Archive and retention
            $table->enum('retention_period', [
                '3_years',              // Keep for 3 years
                '7_years',              // Keep for 7 years
                '10_years',             // Keep for 10 years
                'permanent'             // Keep permanently
            ])->default('7_years');
            $table->boolean('archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['compliance_framework', 'compliance_status']);
            $table->index(['institution_id', 'assessment_date']);
            $table->index(['compliance_status', 'risk_rating']);
            $table->index(['next_assessment_due', 'compliance_status']);
            $table->index(['control_owner', 'compliance_status']);
            $table->index(['assessment_date', 'assessment_type']);
            $table->index(['compliance_framework', 'control_id']);
            $table->index(['target_remediation_date', 'compliance_status']);
            $table->index(['mandatory_requirement', 'compliance_deadline']);
            $table->index(['archived', 'assessment_date']);
            
            // Composite indexes for reporting
            $table->index(['compliance_framework', 'institution_id', 'compliance_status']);
            $table->index(['compliance_status', 'risk_rating', 'assessment_date']);
            $table->index(['control_owner', 'next_assessment_due', 'compliance_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compliance_monitoring');
    }
};