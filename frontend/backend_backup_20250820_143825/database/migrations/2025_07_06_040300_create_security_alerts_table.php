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
        Schema::create('security_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('user_session_id')->nullable()->constrained()->onDelete('set null');
            
            // Alert classification
            $table->enum('alert_type', [
                'failed_login',
                'account_lockout',
                'suspicious_activity',
                'session_hijacking',
                'multiple_devices',
                'geographic_anomaly',
                'brute_force_attack',
                'privilege_escalation',
                'unauthorized_access',
                'data_breach_attempt',
                'system_intrusion'
            ]);
            
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['open', 'investigating', 'resolved', 'false_positive'])->default('open');
            
            // Alert details
            $table->string('title');
            $table->text('description');
            $table->json('alert_data')->nullable()->comment('Detailed alert information');
            $table->json('evidence')->nullable()->comment('Supporting evidence for the alert');
            
            // Source information
            $table->string('source_ip', 45)->nullable();
            $table->string('source_location', 100)->nullable();
            $table->text('source_user_agent')->nullable();
            $table->string('affected_resource', 255)->nullable();
            
            // Risk assessment
            $table->integer('risk_score')->default(50)->comment('0-100, higher = more critical');
            $table->boolean('requires_immediate_action')->default(false);
            $table->boolean('auto_generated')->default(true);
            
            // Response tracking
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('detected_at');
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            
            // Resolution details
            $table->text('resolution_notes')->nullable();
            $table->enum('resolution_action', [
                'no_action',
                'user_notified',
                'account_locked',
                'session_terminated',
                'access_restricted',
                'password_reset_forced',
                'security_review_required'
            ])->nullable();
            
            // Notification tracking
            $table->json('notifications_sent')->nullable()->comment('Track which notifications were sent');
            $table->integer('escalation_level')->default(0);
            $table->timestamp('last_escalated_at')->nullable();
            
            $table->timestamps();
            
            // Indexes for security monitoring and analytics
            $table->index(['alert_type', 'severity', 'status']);
            $table->index(['user_id', 'detected_at']);
            $table->index(['status', 'severity', 'detected_at']);
            $table->index(['source_ip', 'detected_at']);
            $table->index(['requires_immediate_action', 'status']);
            $table->index(['assigned_to', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_alerts');
    }
};