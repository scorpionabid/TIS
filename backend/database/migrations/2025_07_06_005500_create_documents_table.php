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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('original_filename');
            $table->string('stored_filename');
            $table->string('file_path');
            $table->string('file_extension', 10);
            $table->string('mime_type');
            $table->bigInteger('file_size')->comment('File size in bytes');
            $table->string('file_hash')->nullable()->comment('SHA256 hash for duplicate detection');
            
            // PRD-2: File type restrictions - PDF, Excel, Word (JPG minimal hallarda)
            $table->enum('file_type', [
                'pdf',
                'excel', 
                'word',
                'image',
                'other'
            ])->default('other');
            
            // PRD-2: Access Control levels
            $table->enum('access_level', [
                'public',      // hamı görə bilər
                'regional',    // region daxilində
                'sectoral',    // sektor daxilində  
                'institution'  // müəssisə daxilində
            ])->default('institution');
            
            // Ownership and permissions
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('institution_id')->nullable()->constrained('institutions')->onDelete('cascade');
            $table->json('allowed_users')->nullable()->comment('Specific users who can access');
            $table->json('allowed_roles')->nullable()->comment('Roles that can access');
            $table->json('allowed_institutions')->nullable()->comment('Institutions that can access');
            
            // Version control
            $table->foreignId('parent_document_id')->nullable()->constrained('documents')->onDelete('cascade');
            $table->string('version', 20)->default('1.0');
            $table->boolean('is_latest_version')->default(true);
            $table->text('version_notes')->nullable();
            
            // Categories and tagging
            $table->enum('category', [
                'administrative',  // İdarəetmə sənədləri
                'financial',      // Maliyyə sənədləri
                'educational',    // Təhsil materialları
                'hr',            // İnsan resursları
                'technical',     // Texniki sənədlər
                'legal',         // Hüquqi sənədlər
                'reports',       // Hesabatlar
                'forms',         // Formalar
                'other'          // Digər
            ])->default('other');
            
            $table->json('tags')->nullable()->comment('Document tags for searching');
            
            // Status and lifecycle
            $table->enum('status', [
                'draft',
                'active',
                'archived',
                'deleted'
            ])->default('active');
            
            $table->boolean('is_public')->default(false);
            $table->boolean('is_downloadable')->default(true);
            $table->boolean('is_viewable_online')->default(true);
            
            // Expiration and scheduling
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            
            // Metadata
            $table->json('metadata')->nullable()->comment('Additional document metadata');
            $table->text('content_preview')->nullable()->comment('Text preview for search');
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['uploaded_by', 'status']);
            $table->index(['institution_id', 'access_level']);
            $table->index(['category', 'status']);
            $table->index(['file_type', 'status']);
            $table->index(['parent_document_id', 'version']);
            $table->index(['is_latest_version', 'status']);
            $table->index(['expires_at']);
            
            // Fulltext search only for MySQL/PostgreSQL
            if (config('database.default') !== 'sqlite') {
                $table->fullText(['title', 'description', 'content_preview']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};