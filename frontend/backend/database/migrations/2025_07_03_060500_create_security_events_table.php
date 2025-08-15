<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('security_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type', 100); // 'failed_login', 'password_reset', 'permission_change', 'suspicious_activity', etc.
            $table->string('severity', 20); // 'info', 'warning', 'critical'
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('target_user_id')->nullable()->constrained('users');
            $table->string('ip_address', 45)->nullable();
            $table->json('location_data')->default('{}');
            $table->text('user_agent')->nullable();
            $table->text('description')->nullable();
            $table->json('event_data')->default('{}');
            $table->string('resolution', 50)->nullable(); // 'resolved', 'false_positive', 'action_taken', 'escalated', 'ignored'
            $table->text('resolution_notes')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users');
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('institution_id')->nullable()->constrained('institutions');
            $table->timestamp('created_at')->useCurrent();

            $table->index('event_type');
            $table->index('user_id');
            $table->index('target_user_id');
            $table->index('severity');
            $table->index('created_at');
            $table->index('resolution');
            $table->index('institution_id');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_events');
    }
};