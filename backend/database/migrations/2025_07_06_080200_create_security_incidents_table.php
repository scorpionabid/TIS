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
        Schema::create('security_incidents', function (Blueprint $table) {
            $table->id();
            
            // Incident identification
            $table->string('incident_id')->unique()->comment('Unique incident identifier');
            $table->string('incident_title');
            $table->timestamp('detected_at')->useCurrent();
            $table->timestamp('occurred_at')->nullable()->comment('When the incident actually occurred');
            $table->foreignId('detected_by')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('detection_method', [
                'automated',            // Automated detection system
                'user_report',          // Reported by user
                'admin_discovery',      // Discovered by administrator
                'external_report',      // Reported by external party
                'audit_discovery',      // Found during audit
                'monitoring_alert',     // Monitoring system alert
                'threat_intelligence',  // Threat intelligence feed
                'manual_review'         // Manual security review
            ])->default('automated');
            
            // Incident classification
            $table->enum('incident_type', [
                'unauthorized_access',  // Unauthorized system access
                'data_breach',          // Data breach or exposure
                'malware',              // Malware detection
                'phishing',             // Phishing attempt
                'ddos_attack',          // Distributed denial of service
                'brute_force',          // Brute force attack
                'sql_injection',        // SQL injection attempt
                'xss_attack',           // Cross-site scripting attack
                'privilege_escalation', // Privilege escalation attempt
                'data_corruption',      // Data integrity compromise
                'service_disruption',   // Service availability issue
                'policy_violation',     // Security policy violation
                'insider_threat',       // Insider threat activity
                'social_engineering',   // Social engineering attack
                'physical_security',    // Physical security breach
                'compliance_violation', // Compliance violation
                'system_compromise',    // System compromise
                'network_intrusion',    // Network intrusion
                'credential_theft',     // Credential theft/compromise
                'ransomware',           // Ransomware attack
                'other'                 // Other security incident
            ]);
            
            $table->enum('severity_level', [
                'critical',             // Critical - immediate action required
                'high',                 // High - urgent response needed
                'medium',               // Medium - timely response required
                'low',                  // Low - routine handling
                'informational'         // Informational - for awareness
            ])->default('medium');
            
            $table->enum('impact_level', [
                'catastrophic',         // Catastrophic impact
                'major',                // Major impact
                'moderate',             // Moderate impact
                'minor',                // Minor impact
                'negligible'            // Negligible impact
            ])->default('minor');
            
            // Incident description and details
            $table->text('incident_description');
            $table->text('technical_details')->nullable();
            $table->json('affected_systems')->nullable()->comment('List of affected systems');
            $table->json('affected_users')->nullable()->comment('List of affected users');
            $table->json('affected_data')->nullable()->comment('Types of data affected');
            $table->integer('estimated_affected_records')->nullable();
            
            // Attack/threat information
            $table->json('attack_vectors')->nullable()->comment('Attack methods used');
            $table->json('threat_actors')->nullable()->comment('Known or suspected threat actors');
            $table->json('indicators_of_compromise')->nullable()->comment('IOCs identified');
            $table->json('attack_timeline')->nullable()->comment('Timeline of attack events');
            $table->text('attack_signature')->nullable()->comment('Attack signature or pattern');
            
            // Network and system details
            $table->json('source_ip_addresses')->nullable()->comment('Source IP addresses involved');
            $table->json('target_systems')->nullable()->comment('Target systems or endpoints');
            $table->json('network_logs')->nullable()->comment('Relevant network log entries');
            $table->json('system_logs')->nullable()->comment('Relevant system log entries');
            $table->json('security_tool_alerts')->nullable()->comment('Alerts from security tools');
            
            // User and access information
            $table->json('compromised_accounts')->nullable()->comment('Compromised user accounts');
            $table->json('privilege_levels_involved')->nullable()->comment('Privilege levels involved');
            $table->json('access_patterns')->nullable()->comment('Unusual access patterns observed');
            $table->boolean('insider_involvement')->default(false)->comment('Insider involvement suspected');
            
            // Business impact assessment
            $table->enum('confidentiality_impact', ['none', 'low', 'medium', 'high'])->default('none');
            $table->enum('integrity_impact', ['none', 'low', 'medium', 'high'])->default('none');
            $table->enum('availability_impact', ['none', 'low', 'medium', 'high'])->default('none');
            $table->decimal('financial_impact', 12, 2)->nullable()->comment('Estimated financial impact');
            $table->text('business_disruption')->nullable()->comment('Description of business disruption');
            $table->integer('downtime_minutes')->nullable()->comment('System downtime in minutes');
            
            // Incident response
            $table->enum('status', [
                'new',                  // Newly detected incident
                'assigned',             // Assigned to responder
                'investigating',        // Under investigation
                'containing',           // Containment in progress
                'eradicating',          // Eradication in progress
                'recovering',           // Recovery in progress
                'resolved',             // Incident resolved
                'closed',               // Incident closed
                'false_positive'        // Determined to be false positive
            ])->default('new');
            
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('assigned_at')->nullable();
            $table->foreignId('incident_commander')->nullable()->constrained('users')->onDelete('set null');
            $table->json('response_team')->nullable()->comment('Incident response team members');
            
            // Response timeline
            $table->timestamp('response_started_at')->nullable();
            $table->timestamp('contained_at')->nullable();
            $table->timestamp('eradicated_at')->nullable();
            $table->timestamp('recovered_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            
            // Response actions
            $table->json('containment_actions')->nullable()->comment('Actions taken to contain incident');
            $table->json('eradication_actions')->nullable()->comment('Actions taken to eradicate threat');
            $table->json('recovery_actions')->nullable()->comment('Actions taken to recover systems');
            $table->json('communication_log')->nullable()->comment('Communications sent during incident');
            
            // Evidence and forensics
            $table->json('evidence_collected')->nullable()->comment('Digital evidence collected');
            $table->json('forensic_artifacts')->nullable()->comment('Forensic artifacts identified');
            $table->boolean('forensic_investigation_required')->default(false);
            $table->foreignId('forensic_investigator')->nullable()->constrained('users')->onDelete('set null');
            $table->text('chain_of_custody')->nullable()->comment('Evidence chain of custody');
            
            // Root cause analysis
            $table->text('root_cause')->nullable()->comment('Identified root cause');
            $table->json('contributing_factors')->nullable()->comment('Contributing factors');
            $table->json('vulnerabilities_exploited')->nullable()->comment('Vulnerabilities that were exploited');
            $table->text('security_control_failures')->nullable()->comment('Security controls that failed');
            
            // Remediation and lessons learned
            $table->json('remediation_actions')->nullable()->comment('Remediation actions taken');
            $table->json('preventive_measures')->nullable()->comment('Preventive measures implemented');
            $table->text('lessons_learned')->nullable();
            $table->json('recommendations')->nullable()->comment('Recommendations for improvement');
            $table->boolean('policy_changes_required')->default(false);
            $table->boolean('training_required')->default(false);
            
            // Compliance and regulatory
            $table->boolean('regulatory_notification_required')->default(false);
            $table->json('regulatory_bodies_notified')->nullable()->comment('Regulatory bodies notified');
            $table->timestamp('regulatory_notification_sent')->nullable();
            $table->boolean('customer_notification_required')->default(false);
            $table->timestamp('customer_notification_sent')->nullable();
            $table->boolean('law_enforcement_involved')->default(false);
            $table->text('legal_considerations')->nullable();
            
            // Data protection and privacy
            $table->boolean('personal_data_involved')->default(false);
            $table->boolean('gdpr_applicable')->default(false);
            $table->timestamp('gdpr_notification_deadline')->nullable();
            $table->boolean('data_subject_notification_required')->default(false);
            $table->json('affected_data_categories')->nullable()->comment('Categories of personal data affected');
            
            // External parties
            $table->json('third_party_vendors_involved')->nullable()->comment('Third party vendors affected');
            $table->boolean('cyber_insurance_claim')->default(false);
            $table->string('insurance_claim_number')->nullable();
            $table->boolean('external_counsel_engaged')->default(false);
            $table->boolean('public_relations_involved')->default(false);
            
            // Monitoring and metrics
            $table->integer('time_to_detection_minutes')->nullable()->comment('Time from occurrence to detection');
            $table->integer('time_to_response_minutes')->nullable()->comment('Time from detection to response');
            $table->integer('time_to_containment_minutes')->nullable()->comment('Time from detection to containment');
            $table->integer('time_to_resolution_minutes')->nullable()->comment('Time from detection to resolution');
            
            // Follow-up and tracking
            $table->boolean('follow_up_required')->default(false);
            $table->date('follow_up_date')->nullable();
            $table->json('follow_up_actions')->nullable()->comment('Required follow-up actions');
            $table->boolean('vulnerability_patched')->default(false);
            $table->date('vulnerability_patch_date')->nullable();
            $table->boolean('security_testing_completed')->default(false);
            
            // Knowledge management
            $table->json('related_incidents')->nullable()->comment('Related incident IDs');
            $table->json('similar_incidents')->nullable()->comment('Similar incident patterns');
            $table->json('threat_intelligence_updates')->nullable()->comment('Threat intelligence updates');
            $table->boolean('playbook_updated')->default(false);
            $table->text('knowledge_base_entry')->nullable();
            
            // Cost and resource tracking
            $table->decimal('response_cost', 10, 2)->nullable()->comment('Cost of incident response');
            $table->integer('staff_hours_spent')->nullable()->comment('Total staff hours spent');
            $table->decimal('external_consultant_cost', 10, 2)->nullable();
            $table->decimal('technology_cost', 10, 2)->nullable();
            $table->decimal('business_loss', 12, 2)->nullable()->comment('Estimated business loss');
            
            // Communication and reporting
            $table->json('stakeholders_notified')->nullable()->comment('Stakeholders who were notified');
            $table->json('executive_briefings')->nullable()->comment('Executive briefing details');
            $table->boolean('board_notification_required')->default(false);
            $table->boolean('public_disclosure_required')->default(false);
            $table->date('public_disclosure_date')->nullable();
            
            // Quality assurance
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->enum('review_status', [
                'pending',              // Review pending
                'approved',             // Review approved
                'revision_required'     // Revision required
            ])->default('pending');
            $table->text('review_comments')->nullable();
            
            // Archival and retention
            $table->enum('retention_period', [
                '1_year',               // Keep for 1 year
                '3_years',              // Keep for 3 years
                '7_years',              // Keep for 7 years
                'permanent'             // Keep permanently
            ])->default('3_years');
            $table->boolean('archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['incident_type', 'severity_level']);
            $table->index(['status', 'detected_at']);
            $table->index(['detected_by', 'detected_at']);
            $table->index(['assigned_to', 'status']);
            $table->index(['severity_level', 'impact_level']);
            $table->index(['occurred_at', 'detected_at']);
            $table->index(['regulatory_notification_required', 'detected_at']);
            $table->index(['personal_data_involved', 'detected_at']);
            $table->index(['follow_up_required', 'follow_up_date']);
            $table->index(['archived', 'detected_at']);
            
            // Composite indexes for reporting
            $table->index(['incident_type', 'status', 'detected_at']);
            $table->index(['severity_level', 'status', 'detected_at']);
            $table->index(['assigned_to', 'status', 'detected_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_incidents');
    }
};