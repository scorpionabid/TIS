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
        Schema::table('assessment_entries', function (Blueprint $table) {
            $table->string('bulk_session_id')->nullable()->after('metadata');
            $table->foreignId('excel_import_id')->nullable()->constrained('assessment_excel_imports')->onDelete('set null')->after('bulk_session_id');
            $table->enum('entry_method', ['manual', 'bulk', 'excel_import'])->default('manual')->after('excel_import_id');
            $table->boolean('requires_review')->default(false)->after('entry_method');
            $table->timestamp('reviewed_at')->nullable()->after('requires_review');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null')->after('reviewed_at');
            $table->text('review_notes')->nullable()->after('reviewed_by');
            
            // Indexes
            $table->index('bulk_session_id');
            $table->index(['entry_method', 'requires_review']);
            $table->index(['reviewed_at', 'reviewed_by']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessment_entries', function (Blueprint $table) {
            $table->dropForeign(['excel_import_id']);
            $table->dropForeign(['reviewed_by']);
            $table->dropIndex(['bulk_session_id']);
            $table->dropIndex(['entry_method', 'requires_review']);
            $table->dropIndex(['reviewed_at', 'reviewed_by']);
            
            $table->dropColumn([
                'bulk_session_id',
                'excel_import_id',
                'entry_method',
                'requires_review',
                'reviewed_at',
                'reviewed_by',
                'review_notes'
            ]);
        });
    }
};