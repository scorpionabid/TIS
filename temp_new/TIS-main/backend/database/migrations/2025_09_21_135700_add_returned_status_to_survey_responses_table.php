<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // SQLite doesn't support ENUM directly, but the application handles status validation
        // For SQLite, the column is already text and can accept 'returned' value
        // This migration just documents the addition of 'returned' status support

        // For MySQL/PostgreSQL environments (if needed later), the ENUM would be:
        // \Illuminate\Support\Facades\DB::statement("ALTER TABLE survey_responses MODIFY COLUMN status ENUM('draft','submitted','approved','rejected','returned') NOT NULL DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // For SQLite, no database schema change needed
        // The application-level validation will handle status restrictions
    }
};
