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
        Schema::create('access_tracking', function (Blueprint $table) {
            $table->id();
            
            // Session and user identification
            $table->string('tracking_id')->unique()->comment('Unique tracking identifier');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('session_id')->nullable();
            $table->timestamp('access_time')->useCurrent();
            $table->timestamp('last_activity')->useCurrent();
            $table->integer('session_duration')->nullable()->comment('Duration in seconds');
            
            // Access details
            $table->enum('access_type', [
                'login',                // User login
                'page_view',            // Page/resource access
                'api_call',             // API endpoint access
                'file_access',          // File/document access
                'feature_use',          // Feature utilization
                'search',               // Search operations
                'export',               // Data export operations
                'report_view',          // Report viewing
                'download',             // File downloads
                'upload',               // File uploads
                'form_submission',      // Form submissions
                'logout'                // User logout
            ]);
            
            $table->string('resource_type')->nullable()->comment('Type of resource accessed');
            $table->string('resource_id')->nullable()->comment('ID of the accessed resource');
            $table->string('resource_name')->nullable()->comment('Name of the accessed resource');
            $table->text('resource_path')->nullable()->comment('Path or URL of the resource');
            
            // Request information
            $table->string('http_method')->nullable();
            $table->text('full_url')->nullable();
            $table->string('route_name')->nullable();
            $table->json('request_parameters')->nullable();
            $table->json('query_parameters')->nullable();
            $table->text('referrer_url')->nullable();
            
            // Device and browser information
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->string('device_type')->nullable()->comment('desktop, mobile, tablet');
            $table->string('operating_system')->nullable();
            $table->string('browser')->nullable();
            $table->string('browser_version')->nullable();
            $table->string('screen_resolution')->nullable();
            $table->string('device_fingerprint')->nullable();
            
            // Geographic information
            $table->string('country')->nullable();
            $table->string('region')->nullable();
            $table->string('city')->nullable();
            $table->string('timezone')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->boolean('vpn_detected')->default(false);
            $table->boolean('proxy_detected')->default(false);
            
            // Authentication and authorization
            $table->enum('auth_method', [
                'password',             // Password authentication
                'token',                // Token-based auth
                'sso',                  // Single sign-on
                'api_key',              // API key authentication
                'oauth',                // OAuth authentication
                'saml',                 // SAML authentication
                'biometric',            // Biometric authentication
                'multi_factor'          // Multi-factor authentication
            ])->nullable();
            
            $table->string('auth_provider')->nullable()->comment('Authentication provider used');
            $table->json('user_roles')->nullable()->comment('User roles at time of access');
            $table->json('user_permissions')->nullable()->comment('User permissions at time of access');
            $table->boolean('elevated_privileges')->default(false);
            
            // Institution and academic context
            $table->foreignId('institution_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('academic_year_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('academic_term_id')->nullable()->constrained()->onDelete('set null');
            $table->string('academic_context')->nullable()->comment('Academic context of the access');
            
            // Access patterns and behavior
            $table->integer('page_views_in_session')->default(1);
            $table->integer('actions_in_session')->default(1);
            $table->json('navigation_path')->nullable()->comment('User navigation history');
            $table->integer('time_on_page')->nullable()->comment('Time spent on page in seconds');
            $table->boolean('bounce_session')->default(false)->comment('Single page session');
            
            // Performance metrics
            $table->integer('page_load_time')->nullable()->comment('Page load time in milliseconds');
            $table->integer('server_response_time')->nullable()->comment('Server response time in milliseconds');
            $table->integer('database_query_time')->nullable()->comment('Database query time in milliseconds');
            $table->integer('memory_usage')->nullable()->comment('Memory usage in bytes');
            
            // Content and interaction
            $table->json('form_interactions')->nullable()->comment('Form field interactions');
            $table->json('click_tracking')->nullable()->comment('Click events and coordinates');
            $table->json('scroll_tracking')->nullable()->comment('Scroll behavior data');
            $table->json('search_terms')->nullable()->comment('Search terms used');
            $table->json('filters_applied')->nullable()->comment('Filters applied to data');
            
            // Security and risk assessment
            $table->enum('risk_score', [
                'very_low',             // 0-20
                'low',                  // 21-40
                'medium',               // 41-60
                'high',                 // 61-80
                'very_high'             // 81-100
            ])->default('low');
            
            $table->json('security_indicators')->nullable()->comment('Security-related indicators');
            $table->boolean('anomaly_detected')->default(false);
            $table->decimal('anomaly_score', 5, 2)->nullable()->comment('Anomaly detection score');
            $table->json('risk_factors')->nullable()->comment('Factors contributing to risk score');
            
            // Data access and privacy
            $table->enum('data_sensitivity', [
                'public',               // Public data
                'internal',             // Internal data
                'confidential',         // Confidential data
                'restricted',           // Restricted data
                'classified'            // Classified data
            ])->default('internal');
            
            $table->boolean('pii_accessed')->default(false)->comment('Personally identifiable information accessed');
            $table->boolean('financial_data_accessed')->default(false);
            $table->boolean('health_data_accessed')->default(false);
            $table->boolean('academic_records_accessed')->default(false);
            $table->json('data_categories')->nullable()->comment('Categories of data accessed');
            
            // Result and outcome
            $table->enum('access_result', [
                'successful',           // Access granted and completed
                'denied',               // Access denied
                'timeout',              // Session timed out
                'error',                // Error occurred
                'blocked',              // Access blocked by security
                'redirected',           // User redirected
                'partial'               // Partial access granted
            ])->default('successful');
            
            $table->integer('http_status_code')->nullable();
            $table->text('error_message')->nullable();
            $table->json('response_headers')->nullable();
            $table->integer('response_size')->nullable()->comment('Response size in bytes');
            
            // Business intelligence
            $table->string('campaign_source')->nullable()->comment('Marketing campaign source');
            $table->string('utm_parameters')->nullable()->comment('UTM tracking parameters');
            $table->string('feature_flag')->nullable()->comment('Feature flags active during access');
            $table->string('ab_test_variant')->nullable()->comment('A/B test variant');
            
            // Compliance and legal
            $table->boolean('gdpr_applicable')->default(false)->comment('GDPR regulations apply');
            $table->boolean('consent_given')->default(false)->comment('User consent for tracking');
            $table->json('legal_basis')->nullable()->comment('Legal basis for data processing');
            $table->boolean('anonymized')->default(false)->comment('Data has been anonymized');
            
            // Integration tracking
            $table->string('integration_source')->nullable()->comment('Source of integration call');
            $table->string('api_version')->nullable()->comment('API version used');
            $table->string('client_application')->nullable()->comment('Client application name');
            $table->string('sdk_version')->nullable()->comment('SDK version if applicable');
            
            // Workflow and process tracking
            $table->string('workflow_step')->nullable()->comment('Step in business workflow');
            $table->string('process_id')->nullable()->comment('Business process identifier');
            $table->json('workflow_context')->nullable()->comment('Workflow-specific context');
            $table->boolean('automated_access')->default(false)->comment('Automated system access');
            
            // Educational analytics
            $table->string('learning_objective')->nullable()->comment('Learning objective being pursued');
            $table->string('assessment_context')->nullable()->comment('Assessment-related context');
            $table->integer('study_time')->nullable()->comment('Time spent on educational content');
            $table->json('learning_progress')->nullable()->comment('Learning progress indicators');
            
            // Mobile and offline support
            $table->boolean('mobile_app')->default(false)->comment('Access via mobile app');
            $table->string('app_version')->nullable()->comment('Mobile app version');
            $table->boolean('offline_sync')->default(false)->comment('Offline synchronization event');
            $table->json('offline_data')->nullable()->comment('Offline usage data');
            
            // Social and collaboration
            $table->json('collaboration_context')->nullable()->comment('Collaborative activity context');
            $table->string('shared_resource_id')->nullable()->comment('Shared resource identifier');
            $table->json('social_interactions')->nullable()->comment('Social interaction data');
            
            // Advanced analytics
            $table->json('custom_metrics')->nullable()->comment('Custom tracking metrics');
            $table->json('event_sequence')->nullable()->comment('Sequence of events in session');
            $table->decimal('engagement_score', 5, 2)->nullable()->comment('User engagement score');
            $table->json('behavioral_tags')->nullable()->comment('Behavioral classification tags');
            
            // Monitoring and alerting
            $table->boolean('alert_triggered')->default(false)->comment('Alert was triggered');
            $table->string('alert_type')->nullable()->comment('Type of alert triggered');
            $table->text('alert_details')->nullable()->comment('Alert details');
            $table->boolean('investigation_required')->default(false);
            
            // Data retention and cleanup
            $table->enum('retention_category', [
                'short_term',           // 30 days
                'medium_term',          // 6 months
                'long_term',            // 2 years
                'regulatory',           // 7 years
                'permanent'             // Permanent retention
            ])->default('medium_term');
            
            $table->date('purge_after')->nullable()->comment('Date when record should be purged');
            $table->boolean('archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['user_id', 'access_time']);
            $table->index(['access_type', 'access_time']);
            $table->index(['session_id', 'access_time']);
            $table->index(['ip_address', 'access_time']);
            $table->index(['institution_id', 'access_time']);
            $table->index(['resource_type', 'resource_id']);
            $table->index(['risk_score', 'anomaly_detected']);
            $table->index(['access_result', 'access_time']);
            $table->index(['device_type', 'access_time']);
            $table->index(['country', 'access_time']);
            $table->index(['pii_accessed', 'access_time']);
            $table->index(['archived', 'purge_after']);
            
            // Composite indexes for analytics
            $table->index(['user_id', 'access_type', 'access_time']);
            $table->index(['institution_id', 'user_id', 'access_time']);
            $table->index(['access_time', 'access_type', 'access_result']);
            $table->index(['user_id', 'session_id', 'access_time']);
            $table->index(['resource_type', 'user_id', 'access_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('access_tracking');
    }
};