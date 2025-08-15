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
        Schema::create('account_lockouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Lockout details
            $table->enum('lockout_type', [
                'failed_attempts',
                'suspicious_activity',
                'admin_action',
                'security_breach',
                'multiple_devices',
                'geographic_anomaly',
                'brute_force_protection'
            ]);
            
            $table->enum('lockout_level', [
                'temporary',      // Short-term automatic lockout
                'extended',       // Longer automatic lockout
                'manual',         // Admin-initiated lockout
                'permanent'       // Requires manual intervention
            ])->default('temporary');
            
            // Trigger information
            $table->string('trigger_ip', 45)->nullable();
            $table->text('trigger_user_agent')->nullable();
            $table->json('trigger_data')->nullable()->comment('Data that triggered the lockout');
            $table->integer('failed_attempts_count')->default(0);
            
            // Timing
            $table->timestamp('locked_at');
            $table->timestamp('unlock_at')->nullable()->comment('Automatic unlock time');
            $table->timestamp('unlocked_at')->nullable()->comment('Actual unlock time');
            
            // Status and resolution
            $table->enum('status', ['active', 'expired', 'unlocked', 'escalated'])->default('active');
            $table->enum('unlock_method', [
                'automatic',
                'admin_unlock',
                'user_verification',
                'time_expiry',
                'security_clearance'
            ])->nullable();
            
            // Administrative actions
            $table->foreignId('locked_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('unlocked_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('admin_notes')->nullable();
            $table->text('unlock_reason')->nullable();
            
            // Escalation and notifications
            $table->boolean('escalated_to_admin')->default(false);
            $table->boolean('user_notified')->default(false);
            $table->json('notification_history')->nullable();
            
            // Risk assessment
            $table->integer('risk_score')->default(50)->comment('0-100, higher = more serious');
            $table->boolean('requires_manual_review')->default(false);
            
            // Duration tracking
            $table->integer('lockout_duration_minutes')->nullable();
            $table->integer('actual_duration_minutes')->nullable();
            
            $table->timestamps();
            
            // Indexes for lockout management and analytics
            $table->index(['user_id', 'status']);
            $table->index(['locked_at', 'status']);
            $table->index(['unlock_at', 'status']);
            $table->index(['lockout_type', 'locked_at']);
            $table->index(['trigger_ip', 'locked_at']);
            $table->index(['requires_manual_review', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_lockouts');
    }
};