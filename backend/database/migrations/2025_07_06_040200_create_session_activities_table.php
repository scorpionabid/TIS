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
        Schema::create('session_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_session_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Activity details
            $table->enum('activity_type', [
                'login',
                'logout',
                'heartbeat',
                'api_call',
                'page_view',
                'download',
                'upload',
                'password_change',
                'settings_change',
                'security_event'
            ]);
            
            $table->string('activity_description')->nullable();
            $table->string('endpoint', 255)->nullable()->comment('API endpoint or route');
            $table->string('http_method', 10)->nullable();
            $table->integer('response_status')->nullable();
            
            // Request context
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->string('referer', 500)->nullable();
            $table->json('request_data')->nullable()->comment('Relevant request parameters');
            
            // Security monitoring
            $table->boolean('is_suspicious')->default(false);
            $table->integer('risk_score')->default(0)->comment('0-100, higher = more risky');
            $table->json('security_flags')->nullable()->comment('Security-related indicators');
            
            // Performance and debugging
            $table->integer('response_time_ms')->nullable();
            $table->integer('memory_usage_mb')->nullable();
            $table->json('debug_data')->nullable();
            
            // Location and device context
            $table->string('location_country', 5)->nullable();
            $table->string('location_city', 100)->nullable();
            $table->string('device_type', 50)->nullable();
            
            $table->timestamp('created_at');
            
            // Indexes for analytics and security monitoring
            $table->index(['user_session_id', 'created_at']);
            $table->index(['user_id', 'activity_type', 'created_at']);
            $table->index(['ip_address', 'created_at']);
            $table->index(['is_suspicious', 'created_at']);
            $table->index(['activity_type', 'created_at']);
            $table->index(['endpoint', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_activities');
    }
};