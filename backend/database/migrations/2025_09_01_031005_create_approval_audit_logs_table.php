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
        Schema::create('approval_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained('data_approval_requests')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users'); // User who performed the action
            $table->enum('action', ['created', 'approved', 'rejected', 'returned', 'delegated', 'escalated', 'auto_approved', 'expired']);
            $table->text('comments')->nullable();
            $table->json('metadata')->nullable(); // Additional action-specific data
            $table->json('previous_state')->nullable(); // Previous state for rollback capability
            $table->json('new_state')->nullable(); // New state after action
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->foreignId('delegation_id')->nullable()->constrained('approval_delegations'); // Link to delegation if applicable
            $table->timestamps();
            
            $table->index(['approval_request_id', 'action']);
            $table->index(['user_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_audit_logs');
    }
};