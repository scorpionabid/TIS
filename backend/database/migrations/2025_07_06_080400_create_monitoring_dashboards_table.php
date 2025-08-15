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
        Schema::create('monitoring_dashboards', function (Blueprint $table) {
            $table->id();
            
            // Dashboard identification
            $table->string('dashboard_id')->unique()->comment('Unique dashboard identifier');
            $table->string('dashboard_name');
            $table->text('dashboard_description')->nullable();
            $table->enum('dashboard_type', [
                'security_overview',    // Security overview dashboard
                'compliance_status',    // Compliance monitoring dashboard
                'audit_summary',        // Audit summary dashboard
                'incident_tracking',    // Security incident tracking
                'access_analytics',     // Access and usage analytics
                'performance_metrics',  // System performance metrics
                'user_activity',        // User activity monitoring
                'data_protection',      // Data protection monitoring
                'threat_intelligence',  // Threat intelligence dashboard
                'vulnerability_mgmt',   // Vulnerability management
                'risk_assessment',      // Risk assessment dashboard
                'policy_compliance',    // Policy compliance tracking
                'training_compliance',  // Training compliance tracking
                'executive_summary',    // Executive summary dashboard
                'operational_metrics',  // Operational metrics dashboard
                'financial_compliance', // Financial compliance monitoring
                'academic_integrity',   // Academic integrity monitoring
                'student_privacy',      // Student privacy protection
                'system_health',        // System health monitoring
                'custom'                // Custom dashboard
            ]);
            
            // Ownership and access control
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->enum('visibility', [
                'private',              // Private to owner
                'shared',               // Shared with specific users
                'department',           // Department-wide access
                'institution',          // Institution-wide access
                'public'                // Public access
            ])->default('private');
            
            $table->json('shared_with')->nullable()->comment('Users/roles with access');
            $table->json('permission_levels')->nullable()->comment('Permission levels for different users');
            
            // Dashboard configuration
            $table->json('layout_config')->comment('Dashboard layout configuration');
            $table->json('widget_config')->comment('Widget configurations');
            $table->json('data_sources')->comment('Data sources for dashboard widgets');
            $table->json('filter_config')->nullable()->comment('Default filters and filter options');
            $table->json('refresh_config')->nullable()->comment('Auto-refresh configuration');
            
            // Time and scheduling
            $table->enum('refresh_frequency', [
                'real_time',            // Real-time updates
                'every_minute',         // Every minute
                'every_5_minutes',      // Every 5 minutes
                'every_15_minutes',     // Every 15 minutes
                'every_30_minutes',     // Every 30 minutes
                'hourly',               // Every hour
                'daily',                // Daily refresh
                'manual'                // Manual refresh only
            ])->default('every_15_minutes');
            
            $table->timestamp('last_refreshed_at')->nullable();
            $table->timestamp('next_refresh_at')->nullable();
            $table->boolean('auto_refresh_enabled')->default(true);
            $table->integer('refresh_timeout_seconds')->default(300);
            
            // Dashboard metrics and KPIs
            $table->json('key_metrics')->nullable()->comment('Key metrics displayed on dashboard');
            $table->json('kpi_thresholds')->nullable()->comment('KPI threshold configurations');
            $table->json('alert_conditions')->nullable()->comment('Conditions that trigger alerts');
            $table->json('trend_indicators')->nullable()->comment('Trend analysis indicators');
            
            // Data aggregation and analysis
            $table->enum('data_aggregation_level', [
                'real_time',            // Real-time data
                'hourly',               // Hourly aggregated data
                'daily',                // Daily aggregated data
                'weekly',               // Weekly aggregated data
                'monthly',              // Monthly aggregated data
                'quarterly',            // Quarterly aggregated data
                'annually'              // Annual aggregated data
            ])->default('daily');
            
            $table->json('aggregation_rules')->nullable()->comment('Rules for data aggregation');
            $table->integer('data_retention_days')->default(90)->comment('Days to retain dashboard data');
            $table->json('calculation_formulas')->nullable()->comment('Custom calculation formulas');
            
            // Alert and notification configuration
            $table->boolean('alerts_enabled')->default(false);
            $table->json('alert_recipients')->nullable()->comment('Recipients for dashboard alerts');
            $table->json('alert_rules')->nullable()->comment('Rules for triggering alerts');
            $table->enum('notification_method', [
                'email',                // Email notifications
                'sms',                  // SMS notifications
                'in_app',               // In-app notifications
                'webhook',              // Webhook notifications
                'slack',                // Slack notifications
                'teams'                 // Microsoft Teams notifications
            ])->nullable();
            
            // Performance and optimization
            $table->boolean('cache_enabled')->default(true);
            $table->integer('cache_duration_minutes')->default(15);
            $table->json('performance_metrics')->nullable()->comment('Dashboard performance metrics');
            $table->integer('load_time_ms')->nullable()->comment('Average dashboard load time');
            $table->integer('query_execution_time_ms')->nullable()->comment('Average query execution time');
            
            // Export and reporting
            $table->boolean('export_enabled')->default(true);
            $table->json('export_formats')->nullable()->comment('Available export formats');
            $table->json('scheduled_reports')->nullable()->comment('Scheduled report configurations');
            $table->boolean('pdf_export_enabled')->default(true);
            $table->boolean('excel_export_enabled')->default(true);
            $table->boolean('csv_export_enabled')->default(true);
            
            // Customization and personalization
            $table->json('user_preferences')->nullable()->comment('User-specific preferences');
            $table->json('theme_config')->nullable()->comment('Theme and appearance configuration');
            $table->json('localization_settings')->nullable()->comment('Language and localization settings');
            $table->boolean('personalization_enabled')->default(true);
            
            // Security and compliance context
            $table->json('security_classifications')->nullable()->comment('Security classification of displayed data');
            $table->boolean('audit_trail_enabled')->default(true);
            $table->json('compliance_frameworks')->nullable()->comment('Relevant compliance frameworks');
            $table->enum('data_sensitivity', [
                'public',               // Public data
                'internal',             // Internal data
                'confidential',         // Confidential data
                'restricted'            // Restricted data
            ])->default('internal');
            
            // Institution and academic context
            $table->foreignId('institution_id')->nullable()->constrained()->onDelete('cascade');
            $table->json('academic_scope')->nullable()->comment('Academic scope (years, terms, grades)');
            $table->json('department_scope')->nullable()->comment('Department scope for the dashboard');
            $table->json('role_scope')->nullable()->comment('Role-based scope and filtering');
            
            // Interactive features
            $table->boolean('drill_down_enabled')->default(true);
            $table->boolean('filtering_enabled')->default(true);
            $table->boolean('search_enabled')->default(true);
            $table->json('interactive_features')->nullable()->comment('Available interactive features');
            $table->json('bookmark_config')->nullable()->comment('Bookmark and favorites configuration');
            
            // Mobile and responsive design
            $table->boolean('mobile_optimized')->default(true);
            $table->json('mobile_layout_config')->nullable()->comment('Mobile-specific layout configuration');
            $table->boolean('responsive_design')->default(true);
            $table->json('breakpoint_config')->nullable()->comment('Responsive design breakpoints');
            
            // Integration and embedding
            $table->boolean('embeddable')->default(false);
            $table->string('embed_token')->nullable()->comment('Token for embedded access');
            $table->json('api_endpoints')->nullable()->comment('API endpoints for dashboard data');
            $table->boolean('external_sharing_enabled')->default(false);
            $table->json('webhook_config')->nullable()->comment('Webhook configuration for external systems');
            
            // Usage analytics
            $table->integer('view_count')->default(0)->comment('Number of times dashboard was viewed');
            $table->timestamp('last_viewed_at')->nullable();
            $table->json('usage_statistics')->nullable()->comment('Detailed usage statistics');
            $table->decimal('average_session_duration', 8, 2)->nullable()->comment('Average session duration in minutes');
            $table->json('user_engagement_metrics')->nullable()->comment('User engagement metrics');
            
            // Version control and history
            $table->string('version')->default('1.0');
            $table->json('version_history')->nullable()->comment('History of dashboard versions');
            $table->timestamp('last_modified_at')->nullable();
            $table->foreignId('last_modified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->json('change_log')->nullable()->comment('Log of changes made to dashboard');
            
            // Template and standardization
            $table->boolean('is_template')->default(false);
            $table->string('template_category')->nullable()->comment('Category if this is a template');
            $table->json('template_variables')->nullable()->comment('Variables for template customization');
            $table->boolean('standardized')->default(false);
            $table->string('standard_version')->nullable();
            
            // Quality and validation
            $table->boolean('data_quality_checks')->default(true);
            $table->json('validation_rules')->nullable()->comment('Data validation rules');
            $table->timestamp('last_validation_at')->nullable();
            $table->boolean('validation_passed')->default(true);
            $table->json('validation_errors')->nullable()->comment('Data validation errors');
            
            // Backup and recovery
            $table->boolean('backup_enabled')->default(true);
            $table->timestamp('last_backup_at')->nullable();
            $table->json('backup_config')->nullable()->comment('Backup configuration');
            $table->string('backup_location')->nullable();
            
            // Status and lifecycle
            $table->enum('status', [
                'active',               // Active and in use
                'inactive',             // Inactive/disabled
                'draft',                // Draft/under development
                'archived',             // Archived
                'deprecated',           // Deprecated
                'maintenance'           // Under maintenance
            ])->default('active');
            
            $table->text('status_notes')->nullable();
            $table->timestamp('status_changed_at')->nullable();
            $table->date('expiry_date')->nullable()->comment('Dashboard expiry date');
            $table->boolean('auto_archive')->default(false);
            
            // Cost and resource tracking
            $table->decimal('development_cost', 10, 2)->nullable()->comment('Cost to develop dashboard');
            $table->decimal('maintenance_cost', 8, 2)->nullable()->comment('Monthly maintenance cost');
            $table->integer('compute_resources_used')->nullable()->comment('Compute resources consumed');
            $table->decimal('storage_used_mb', 10, 2)->nullable()->comment('Storage used in MB');
            
            // Feedback and improvement
            $table->decimal('user_rating', 3, 2)->nullable()->comment('Average user rating');
            $table->json('user_feedback')->nullable()->comment('User feedback and comments');
            $table->json('improvement_suggestions')->nullable()->comment('Suggestions for improvement');
            $table->boolean('feedback_enabled')->default(true);
            
            $table->timestamps();
            
            // Indexes
            $table->index(['dashboard_type', 'status']);
            $table->index(['owner_id', 'status']);
            $table->index(['institution_id', 'dashboard_type']);
            $table->index(['visibility', 'status']);
            $table->index(['created_by', 'created_at']);
            $table->index(['last_refreshed_at', 'auto_refresh_enabled']);
            $table->index(['is_template', 'template_category']);
            $table->index(['status', 'expiry_date']);
            $table->index(['view_count', 'last_viewed_at']);
            
            // Composite indexes for common queries
            $table->index(['dashboard_type', 'institution_id', 'status']);
            $table->index(['owner_id', 'dashboard_type', 'status']);
            $table->index(['visibility', 'institution_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monitoring_dashboards');
    }
};