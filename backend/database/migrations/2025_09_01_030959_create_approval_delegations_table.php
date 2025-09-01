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
        Schema::create('approval_delegations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained('data_approval_requests')->onDelete('cascade');
            $table->foreignId('delegator_id')->constrained('users'); // User who delegates
            $table->foreignId('delegate_id')->constrained('users'); // User who receives delegation
            $table->text('delegation_reason');
            $table->text('include_comment')->nullable();
            $table->enum('status', ['pending', 'accepted', 'declined', 'expired'])->default('pending');
            $table->timestamp('delegation_expires_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->text('response_comment')->nullable();
            $table->timestamps();
            
            $table->index(['delegate_id', 'status']);
            $table->index(['delegator_id']);
            $table->index(['approval_request_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_delegations');
    }
};