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
        Schema::create('document_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->onDelete('cascade');
            $table->foreignId('shared_by')->constrained('users')->onDelete('cascade');
            $table->string('share_token', 64)->unique()->comment('Unique token for link sharing');
            $table->string('share_name')->nullable()->comment('Human readable name for share');
            
            // PRD-2: Link sharing with expiration (7-30 days)
            $table->timestamp('expires_at');
            $table->integer('max_downloads')->nullable()->comment('Maximum download limit');
            $table->integer('download_count')->default(0);
            $table->integer('view_count')->default(0);
            
            // Access restrictions
            $table->boolean('requires_password')->default(false);
            $table->string('password_hash')->nullable();
            $table->json('allowed_ips')->nullable()->comment('IP restrictions');
            $table->boolean('is_active')->default(true);
            
            // Permissions for shared link
            $table->boolean('can_download')->default(true);
            $table->boolean('can_view_online')->default(true);
            $table->boolean('can_share')->default(false);
            
            // Tracking
            $table->timestamp('last_accessed_at')->nullable();
            $table->string('last_accessed_ip')->nullable();
            $table->text('access_notes')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['document_id', 'is_active']);
            $table->index(['shared_by', 'created_at']);
            $table->index(['expires_at', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_shares');
    }
};