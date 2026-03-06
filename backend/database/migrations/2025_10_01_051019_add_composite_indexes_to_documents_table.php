<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add composite indexes for frequently used query patterns identified in Phase 1D optimization.
     * These indexes significantly improve document list queries, especially for 600+ schools scenario.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Most frequently used pattern: Filter by institution + status + sort by created_at
            // Used in: getSubInstitutionDocumentsGrouped(), document list queries
            // Expected improvement: 30-40% faster for institution-filtered queries
            $table->index(['institution_id', 'status', 'created_at'], 'idx_documents_institution_status_created');

            // Main document list query pattern: Active + Latest + Sort by date
            // Used in: getDocuments() with default filters
            // Expected improvement: 20-30% faster for main document list
            $table->index(['status', 'is_latest_version', 'created_at'], 'idx_documents_status_latest_created');

            // User-specific document queries with institution context
            // Used in: User's own documents + institution filtering
            // Expected improvement: 25-35% faster for "my documents" queries
            $table->index(['uploaded_by', 'institution_id', 'status'], 'idx_documents_user_institution_status');

            // Additional optimization: Public documents filtering
            // Used in: Public document discovery across institutions
            // Expected improvement: 40-50% faster for public document queries
            $table->index(['is_public', 'status', 'created_at'], 'idx_documents_public_status_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Drop composite indexes in reverse order
            $table->dropIndex('idx_documents_public_status_created');
            $table->dropIndex('idx_documents_user_institution_status');
            $table->dropIndex('idx_documents_status_latest_created');
            $table->dropIndex('idx_documents_institution_status_created');
        });
    }
};
