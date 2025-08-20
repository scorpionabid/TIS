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
        Schema::create('user_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_device_id')->constrained()->onDelete('cascade');
            $table->string('session_token', 128)->unique()->comment('Sanctum token or session ID');
            $table->string('session_id', 128)->nullable()->comment('Laravel session ID if applicable');
            
            // Session metadata
            $table->string('session_name', 100)->nullable()->comment('User-friendly session name');
            $table->enum('session_type', ['web', 'api', 'mobile'])->default('web');
            $table->json('session_data')->nullable()->comment('Additional session information');
            
            // Security and timing
            $table->timestamp('started_at');
            $table->timestamp('last_activity_at');
            $table->timestamp('expires_at');
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            
            // Session fingerprinting for hijacking detection
            $table->string('session_fingerprint', 128)->nullable();
            $table->json('security_context')->nullable()->comment('Security-related session data');
            
            // Session status and security flags
            $table->enum('status', [
                'active',
                'expired', 
                'terminated',
                'suspended',
                'hijacked'
            ])->default('active');
            
            $table->boolean('is_suspicious')->default(false);
            $table->integer('security_score')->default(100)->comment('0-100, lower = more suspicious');
            
            // Termination information
            $table->enum('termination_reason', [
                'logout',
                'timeout', 
                'admin_action',
                'device_limit',
                'security_concern',
                'system_maintenance'
            ])->nullable();
            
            $table->timestamp('terminated_at')->nullable();
            $table->foreignId('terminated_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['user_id', 'status']);
            $table->index(['user_device_id', 'status']);
            $table->index(['session_token']);
            $table->index(['expires_at', 'status']);
            $table->index(['last_activity_at']);
            $table->index(['ip_address', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_sessions');
    }
};