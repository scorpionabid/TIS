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
        Schema::create('document_downloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('document_share_id')->nullable()->constrained('document_shares')->onDelete('set null');
            
            // PRD-2: Download tracking - Kim, nə vaxt endirdi məlumatı
            $table->string('ip_address');
            $table->text('user_agent')->nullable();
            $table->enum('download_type', [
                'direct',     // Direct download by authenticated user
                'shared_link', // Download via shared link
                'preview',    // Preview/view online
                'api'         // API download
            ])->default('direct');
            
            // Tracking details
            $table->bigInteger('file_size_downloaded')->nullable();
            $table->boolean('download_completed')->default(true);
            $table->string('download_method', 50)->nullable()->comment('browser, api, etc.');
            $table->json('metadata')->nullable()->comment('Additional download context');
            
            $table->timestamps();
            
            // Indexes for reporting
            $table->index(['document_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['ip_address', 'created_at']);
            $table->index(['download_type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_downloads');
    }
};