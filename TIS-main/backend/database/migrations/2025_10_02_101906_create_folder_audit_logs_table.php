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
        Schema::create('folder_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_id')->constrained('document_collections')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('action', ['created', 'updated', 'deleted', 'renamed', 'bulk_downloaded', 'documents_deleted', 'document_uploaded', 'document_deleted']);
            $table->json('old_data')->nullable(); // Store old state before change
            $table->json('new_data')->nullable(); // Store new state after change
            $table->text('reason')->nullable(); // User-provided reason for action
            $table->ipAddress('ip_address')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['folder_id', 'created_at']);
            $table->index(['user_id', 'action']);
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('folder_audit_logs');
    }
};
