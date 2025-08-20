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
        Schema::create('institution_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('action', 50); // created, updated, deleted, restored, force_deleted
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('changes')->nullable(); // specific fields changed
            $table->ipAddress('ip_address');
            $table->string('user_agent')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['institution_id', 'action']);
            $table->index(['user_id', 'action']);
            $table->index(['created_at']);
            $table->index(['action']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('institution_audit_logs');
    }
};
