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
        // Enhance documents table with regional hierarchy features
        Schema::table('documents', function (Blueprint $table) {
            // Add regional scope and targeting
            $table->json('target_regions')->nullable()->after('allowed_institutions');
            $table->json('target_sectors')->nullable()->after('target_regions');
            $table->json('target_departments')->nullable()->after('target_sectors');
            
            // Add hierarchical visibility controls
            $table->boolean('cascade_to_children')->default(false)->after('target_departments');
            $table->enum('regional_scope', ['own_region', 'own_sector', 'specific_institutions', 'cross_regional'])->default('specific_institutions')->after('cascade_to_children');
            
            // Add enhanced authority tracking
            $table->string('creator_role', 50)->nullable()->after('uploaded_by');
            $table->foreignId('creator_institution_id')->nullable()->constrained('institutions')->after('creator_role');
        });

        // Enhance document_shares table with regional features
        Schema::table('document_shares', function (Blueprint $table) {
            // Add regional sharing scope
            $table->enum('share_scope', ['public', 'regional', 'sectoral', 'institutional', 'specific_users'])->default('institutional')->after('share_name');
            $table->json('target_institutions')->nullable()->after('share_scope');
            $table->json('target_roles')->nullable()->after('target_institutions');
            
            // Add time-based restrictions
            $table->time('access_start_time')->nullable()->after('target_roles');
            $table->time('access_end_time')->nullable()->after('access_start_time');
            $table->json('access_days_of_week')->nullable()->after('access_end_time'); // [1,2,3,4,5] for Mon-Fri
            
            // Add notification features
            $table->boolean('notify_on_access')->default(false)->after('access_days_of_week');
            $table->boolean('notify_on_download')->default(false)->after('notify_on_access');
            $table->text('access_message')->nullable()->after('notify_on_download');
        });

        // Create document authority matrix table
        Schema::create('document_authority_matrix', function (Blueprint $table) {
            $table->id();
            $table->string('user_role', 50); // RegionAdmin, SektorAdmin, etc.
            $table->enum('upload_scope', ['own_region', 'own_sector', 'own_institution'])->default('own_institution');
            $table->json('can_share_to_types'); // ['region', 'sector', 'school'] - what types they can share to
            $table->json('can_assign_roles')->nullable(); // ['schooladmin', 'teacher'] - which roles they can assign access to
            $table->boolean('can_create_public_links')->default(false);
            $table->boolean('can_set_expiry')->default(true);
            $table->integer('max_file_size_mb')->default(50); // Max file size in MB
            $table->json('allowed_file_types')->nullable(); // ['pdf', 'excel', 'word', 'image']
            $table->timestamps();
            
            $table->index('user_role');
        });

        // Create document access logs table for detailed tracking
        Schema::create('document_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('share_id')->nullable()->constrained('document_shares')->onDelete('set null');
            $table->enum('access_type', ['view', 'download', 'share', 'upload'])->default('view');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('referrer')->nullable();
            $table->json('access_metadata')->nullable(); // Additional context data
            $table->timestamps();
            
            $table->index(['document_id', 'access_type', 'created_at']);
            $table->index(['user_id', 'access_type']);
            $table->index(['created_at', 'access_type']);
        });

        // Create document collections table for organizing documents
        Schema::create('document_collections', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->enum('collection_type', ['folder', 'category', 'project', 'archive'])->default('folder');
            $table->string('color', 7)->default('#3498db'); // Hex color for UI
            $table->string('icon', 50)->default('folder'); // Icon identifier
            $table->boolean('is_public')->default(false);
            $table->json('allowed_roles')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index(['institution_id', 'collection_type']);
            $table->index(['created_by', 'is_public']);
        });

        // Create document collection items table
        Schema::create('document_collection_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->constrained('document_collections')->onDelete('cascade');
            $table->foreignId('document_id')->constrained('documents')->onDelete('cascade');
            $table->foreignId('added_by')->constrained('users')->onDelete('cascade');
            $table->integer('sort_order')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->unique(['collection_id', 'document_id']);
            $table->index(['collection_id', 'sort_order']);
        });

        // Create link shares table for sharing external links with regional scope
        Schema::create('link_shares', function (Blueprint $table) {
            $table->id();
            $table->string('title', 300);
            $table->text('description')->nullable();
            $table->text('url');
            $table->string('link_type', 50)->default('external'); // 'external', 'video', 'form', 'document'
            $table->foreignId('shared_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            
            // Regional targeting
            $table->enum('share_scope', ['public', 'regional', 'sectoral', 'institutional', 'specific_users'])->default('institutional');
            $table->json('target_institutions')->nullable();
            $table->json('target_roles')->nullable();
            $table->json('target_departments')->nullable();
            
            // Access control
            $table->boolean('requires_login')->default(true);
            $table->datetime('expires_at')->nullable();
            $table->integer('max_clicks')->nullable();
            $table->integer('click_count')->default(0);
            
            // Time restrictions
            $table->time('access_start_time')->nullable();
            $table->time('access_end_time')->nullable();
            $table->json('access_days_of_week')->nullable();
            
            // Status and metadata
            $table->enum('status', ['active', 'expired', 'disabled'])->default('active');
            $table->string('thumbnail_url')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
            
            $table->index(['shared_by', 'status']);
            $table->index(['institution_id', 'share_scope']);
            $table->index(['expires_at', 'status']);
        });

        // Create link access logs table
        Schema::create('link_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('link_share_id')->constrained('link_shares')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('referrer')->nullable();
            $table->timestamps();
            
            $table->index(['link_share_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('link_access_logs');
        Schema::dropIfExists('link_shares');
        Schema::dropIfExists('document_collection_items');
        Schema::dropIfExists('document_collections');
        Schema::dropIfExists('document_access_logs');
        Schema::dropIfExists('document_authority_matrix');
        
        Schema::table('document_shares', function (Blueprint $table) {
            $table->dropColumn([
                'share_scope', 'target_institutions', 'target_roles',
                'access_start_time', 'access_end_time', 'access_days_of_week',
                'notify_on_access', 'notify_on_download', 'access_message'
            ]);
        });
        
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['creator_institution_id']);
            $table->dropColumn([
                'target_regions', 'target_sectors', 'target_departments',
                'cascade_to_children', 'regional_scope', 'creator_role', 'creator_institution_id'
            ]);
        });
    }
};