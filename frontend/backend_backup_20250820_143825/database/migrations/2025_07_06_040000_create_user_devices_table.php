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
        Schema::create('user_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('device_id', 64)->unique()->comment('Unique device identifier');
            $table->string('device_name')->comment('User-friendly device name');
            $table->string('device_type', 50)->default('unknown')->comment('mobile, tablet, desktop, etc.');
            
            // Browser and system information
            $table->string('browser_name', 100)->nullable();
            $table->string('browser_version', 50)->nullable();
            $table->string('operating_system', 100)->nullable();
            $table->string('platform', 50)->nullable();
            $table->text('user_agent')->nullable();
            
            // Device fingerprinting for security
            $table->string('screen_resolution', 20)->nullable();
            $table->string('timezone', 50)->nullable();
            $table->string('language', 10)->nullable();
            $table->json('device_fingerprint')->nullable()->comment('Additional device characteristics');
            
            // Security and location
            $table->string('last_ip_address', 45);
            $table->string('registration_ip', 45);
            $table->string('last_location_country', 5)->nullable();
            $table->string('last_location_city', 100)->nullable();
            
            // Device status and trust
            $table->boolean('is_trusted')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamp('trusted_at')->nullable();
            $table->timestamp('last_seen_at');
            $table->timestamp('registered_at');
            
            // Security flags
            $table->boolean('requires_verification')->default(false);
            $table->integer('failed_verification_attempts')->default(0);
            $table->timestamp('verification_blocked_until')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance and security
            $table->index(['user_id', 'is_active']);
            $table->index(['device_id']);
            $table->index(['last_ip_address', 'created_at']);
            $table->index(['last_seen_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_devices');
    }
};