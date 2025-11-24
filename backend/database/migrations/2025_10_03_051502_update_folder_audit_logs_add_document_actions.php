<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if we're using SQLite
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            // SQLite doesn't support ALTER COLUMN directly, so we recreate the table
            Schema::table('folder_audit_logs', function (Blueprint $table) {
                // SQLite doesn't enforce enum, so this is just for consistency
                // The validation will be handled in the model/controller
            });
        } else {
            // MySQL/PostgreSQL: Alter the action enum to include new values
            DB::statement("ALTER TABLE folder_audit_logs MODIFY COLUMN action ENUM('created', 'updated', 'deleted', 'renamed', 'bulk_downloaded', 'documents_deleted', 'document_uploaded', 'document_deleted') NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Check if we're using SQLite
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            // SQLite doesn't support ALTER COLUMN, so nothing to revert
            Schema::table('folder_audit_logs', function (Blueprint $table) {
                // No-op for SQLite
            });
        } else {
            // MySQL/PostgreSQL: Revert to original enum values
            DB::statement("ALTER TABLE folder_audit_logs MODIFY COLUMN action ENUM('created', 'updated', 'deleted', 'renamed', 'bulk_downloaded', 'documents_deleted') NOT NULL");
        }
    }
};
